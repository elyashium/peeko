/*

Example Flow:
1) User clicks the toggle in the popup.
2) The popup sends a message to the background script: "user-turned-off-extension".
3) The background script receives this message and saves { isEnabled: false } to chrome.storage.
4) The background script then broadcasts a message to all open tabs: "state-changed-to-disabled".
5) The content scripts in those tabs receive the message and stop adding hover listeners to links.

need to do ->

the fetching should be ideally done in the background script, but we are doing it in the content script
need to fix, as there might be CORS issues. background script has more permissions.

centralised caching in background script(as it runs most of the time in background)



*/

// Peeko Background Script
// This script handles:
// 1. Extension state management (on/off, settings)
// 2. Fetching link preview data
// 3. Centralized caching of previews
// 4. Communicating with content scripts

// Fix: using correct API (chrome instead of chromeExtension)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isEnabled: true,
    showOnHover: true,
    enableForAllWebsites: true
  });
  console.log("Peeko extension installed and enabled");
});

// Cache for storing link previews to avoid re-fetching
const previewCache = new Map();

// Function to extract preview data from HTML
function extractPreviewData(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract title
  const title = doc.querySelector('title')?.textContent || 'No title available';
  
  // Extract description: try meta description, then first paragraph, or default message
  let description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                   doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
  
  if (!description) {
    // Find the first substantial paragraph
    const paragraphs = Array.from(doc.querySelectorAll('p')).filter(p => p.textContent.trim().length > 30);
    description = paragraphs.length > 0 ? paragraphs[0].textContent.trim() : 'No description available';
  }
  
  // Extract image: try og:image, then first substantial image
  let image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  
  if (!image) {
    const images = Array.from(doc.querySelectorAll('img')).filter(img => {
      const width = parseInt(img.getAttribute('width') || '0', 10);
      const height = parseInt(img.getAttribute('height') || '0', 10);
      return (width > 100 && height > 100) || (img.src && !img.src.includes('icon') && !img.src.includes('logo'));
    });
    
    if (images.length > 0) {
      // Make relative URLs absolute
      const imgSrc = images[0].getAttribute('src');
      if (imgSrc && imgSrc.startsWith('/')) {
        try {
          const urlObj = new URL(url);
          image = `${urlObj.origin}${imgSrc}`;
        } catch (e) {
          image = null;
        }
      } else {
        image = imgSrc;
      }
    }
  }

  // Get favicon
  let favicon = doc.querySelector('link[rel="icon"]')?.getAttribute('href') || 
               doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href');
  
  if (favicon && favicon.startsWith('/')) {
    try {
      const urlObj = new URL(url);
      favicon = `${urlObj.origin}${favicon}`;
    } catch (e) {
      favicon = null;
    }
  }
  
  // Extract domain name for display
  let domain;
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    domain = url;
  }
  
  return {
    title: title.substring(0, 100), // Limit length
    description: description ? description.substring(0, 150) + (description.length > 150 ? '...' : '') : 'No description available',
    image,
    favicon,
    domain,
    url
  };
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message.type);
  
  // Handle extension state toggle from popup
  if (message.type === "toggle-extension") {
    const newState = message.enabled;
    
    // Save new state
    chrome.storage.local.set({ isEnabled: newState });
    
    // Broadcast to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: "extension-state-changed", 
          enabled: newState 
        }).catch(err => console.log("Could not send message to tab", tab.id, err));
      });
    });
    
    sendResponse({ status: "ok" });
    return;
  }
  
  // Handle settings changes
  if (message.type === "update-settings") {
    chrome.storage.local.set(message.settings);
    
    // Broadcast to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: "settings-changed", 
          settings: message.settings 
        }).catch(err => console.log("Could not send message to tab", tab.id, err));
      });
    });
    
    sendResponse({ status: "ok" });
    return;
  }
  
  // Handle preview requests from content script
  if (message.type === "get-preview") {
    const url = message.url;
    
    // Check if extension is enabled first
    chrome.storage.local.get("isEnabled", (data) => {
      if (!data.isEnabled) {
        sendResponse({ status: "disabled" });
        return;
      }
      
      // If preview is in cache, return it immediately
      if (previewCache.has(url)) {
        sendResponse({ status: "ok", data: previewCache.get(url) });
        return;
      }
      
      // Otherwise, fetch the preview
      fetch(url, { method: 'GET', credentials: 'omit' })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.text();
        })
        .then(html => {
          // Extract preview data from HTML
          const previewData = extractPreviewData(html, url);
          
          // Store in cache (with expiration after 1 hour)
          previewCache.set(url, previewData);
          setTimeout(() => {
            previewCache.delete(url);
          }, 3600000); // 1 hour
          
          // Send the data back to content script
          sendResponse({ status: "ok", data: previewData });
        })
        .catch(error => {
          console.error("Error fetching preview:", error);
          sendResponse({ 
            status: "error", 
            error: error.message,
            // Provide at least partial data based on the URL
            data: {
              title: "Could not load preview",
              description: "The preview for this link could not be loaded.",
              domain: (new URL(url)).hostname,
              url: url
            }
          });
        });
      
      // Return true to indicate that sendResponse will be called asynchronously
      return true;
    });
    
    // Return true for async response
    return true;
  }
  
  // Return false for any unhandled message types
  return false;
});

// Periodically clean up old cache entries to prevent memory bloat
setInterval(() => {
  // Keep cache size manageable
  if (previewCache.size > 100) {
    // Delete oldest entries (convert to array first to get keys)
    const oldestKeys = Array.from(previewCache.keys()).slice(0, 20);
    oldestKeys.forEach(key => previewCache.delete(key));
    console.log("Cache cleanup: removed 20 oldest entries");
  }
}, 300000); // Every 5 minutes