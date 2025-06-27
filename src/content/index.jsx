// link detection logic.



/*
things to do -- 

The Problem: the current cache in background.js (the previewCache Map) will grow indefinitely as the user browses. 
This can consume a significant amount of memory over a long period, a "memory leak."

The Solution: Implement a more robust caching strategy.
Time-to-Live (TTL): Don't store cached items forever. When you add an item to the cache, also use setTimeout to automatically delete 
it after a certain period (e.g., 1 hour). I've already added this to your background.js.
Size Capping: Periodically check the size of the cache Map.
 If it exceeds a certain number of entries (e.g., 100), remove the oldest entries to keep memory usage in check.
 also added a setInterval for this

*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import debounce from 'lodash.debounce';
import LinkPreview from '../component/LinkPreview';

// Track the extension's enabled state
let isExtensionEnabled = true;
let extensionSettings = {
  showOnHover: true,
  enableForAllWebsites: true
};

// Load extension state from storage on startup
chrome.storage.local.get(['isEnabled', 'showOnHover', 'enableForAllWebsites'], (result) => {
  isExtensionEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
  if (result.showOnHover !== undefined) extensionSettings.showOnHover = result.showOnHover;
  if (result.enableForAllWebsites !== undefined) extensionSettings.enableForAllWebsites = result.enableForAllWebsites;
  console.log('PeekO Extension state loaded:', isExtensionEnabled, extensionSettings);
  
  // Only initialize if the extension is enabled
  if (isExtensionEnabled) {
    init();
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'extension-state-changed') {
    const wasEnabled = isExtensionEnabled;
    isExtensionEnabled = message.enabled;
    
    // If toggled ON, initialize
    if (!wasEnabled && isExtensionEnabled) {
      init();
    }
    
    // If toggled OFF, cleanup
    if (wasEnabled && !isExtensionEnabled) {
      cleanup();
    }
  }
  
  if (message.type === 'settings-changed') {
    extensionSettings = {...extensionSettings, ...message.settings};
  }
});

const createShadowContainer = () => {
    const container = document.createElement('div');
    container.id = 'peeko-shadow-container';
    document.body.appendChild(container);

    //creating shadowRoot 
    const shadowRoot = container.attachShadow({ mode: 'open' });
    const shadowContainer = document.createElement('div');
    shadowContainer.id = 'peeko-root';
    shadowRoot.appendChild(shadowContainer);

    return shadowContainer;
};

// Create and render React root
let shadowContainer;
let root;

function setupReactRoot() {
  shadowContainer = createShadowContainer();
  root = ReactDOM.createRoot(shadowContainer);
  
  // Initialize the preview with empty state
  renderPreview();
}

// Cache for storing previews
const previewCache = new Map();

// Preview state
let currentPreviewData = {
    visible: false,
    url: '',
    x: 0,
    y: 0,
    title: '',
    description: '',
    image: '',
    favicon: '',
    domain: '',
    loading: false
};

//rendering the preview 
const renderPreview = () => {
    if (!root) return;
    
    root.render(
        <LinkPreview
            visible={currentPreviewData.visible}
            url={currentPreviewData.url}
            x={currentPreviewData.x}
            y={currentPreviewData.y}
            title={currentPreviewData.title}
            description={currentPreviewData.description}
            image={currentPreviewData.image}
            favicon={currentPreviewData.favicon}
            domain={currentPreviewData.domain}
            loading={currentPreviewData.loading}
        />
    );
};

// Fetch preview data from background script
const fetchPreviewFromBackground = (url) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: 'get-preview', url },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                if (response.status === 'disabled') {
                    reject(new Error('Extension is disabled'));
                    return;
                }
                
                if (response.status === 'error') {
                    reject(new Error(response.error));
                    return;
                }
                
                resolve(response.data);
            }
        );
    });
};

// this runs 200ms after the user hovers over a link.
// hover handler
const handleLinkHover = debounce(async event => {
    // If extension is disabled, don't do anything
    if (!isExtensionEnabled) return;
    
    const link = event.target.closest('a');
    //find the closest anchor tag
    if (!link || !link.href) {
        return;
    }
    
    // Show loading state immediately
    currentPreviewData = {
        ...currentPreviewData,
        visible: true,
        url: link.href,
        x: event.clientX,
        y: event.clientY,
        loading: true
    };
    renderPreview();
    
    try {
        // Try to get preview from background script
        const previewData = await fetchPreviewFromBackground(link.href);
        
        // Update with actual data
        currentPreviewData = {
            ...currentPreviewData,
            ...previewData,
            loading: false
        };
        renderPreview();
    } catch (error) {
        console.error('Error fetching preview:', error);
        
        // Show error state
        currentPreviewData = {
            ...currentPreviewData,
            title: 'Could not load preview',
            description: 'The preview for this link could not be loaded.',
            loading: false
        };
        renderPreview();
    }
}, 200);

// hover over handler (mouse leave)
const handleLinkLeave = () => {
    currentPreviewData = {
        ...currentPreviewData,
        visible: false
    };
    renderPreview();
};

//link detection with intersection observer,
// intersection observation API is used to efficiently detect when an element
// enters or leaves the viewport or the specified container.

const linkObserver = () => {
    const links = document.querySelectorAll('a[href]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Fix event name capitalization
                entry.target.addEventListener('mouseover', handleLinkHover);
                entry.target.addEventListener('mouseleave', handleLinkLeave);
            } else {
                // Fix event name capitalization and removeEventListener typo
                entry.target.removeEventListener('mouseover', handleLinkHover);
                entry.target.removeEventListener('mouseleave', handleLinkLeave);
            }
        });
    });

    links.forEach(link => observer.observe(link));
    return observer;
};

//set up a mutation observer, its simillar to intersection observer but it overlooks 
//the entir DOM, hence its more expensive
//we are using it her to detect dynamic links changes.

const watchForNewLinks = () => {
    const linkObs = linkObserver();

    const mutationObserver = new MutationObserver((mutations) => {
        let shouldRescanLinks = false;

        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const newLinks = node.querySelectorAll('a[href]');
                        if (newLinks.length > 0) {
                            shouldRescanLinks = true;
                        }
                    }
                });
            }
        });

        if (shouldRescanLinks) {
            linkObs.disconnect();
            setTimeout(() => {
                // Store the result in linkObs to be able to properly disconnect it later
                const newLinkObs = linkObserver();
                // This is a fix for the issue in the original code
                Object.assign(linkObs, newLinkObs);
            }, 100);
        }
    });

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    return mutationObserver;
};

// Initialize observers
const init = () => {
    console.log('Initializing PeekO content script');
    
    // Setup React root
    setupReactRoot();
    
    // Start observers
    const linkObs = linkObserver();
    const mutationObserver = watchForNewLinks();

    // Return cleanup function
    return () => {
        linkObs.disconnect();
        mutationObserver.disconnect();
        
        // Clean up React root
        if (root) {
            try {
                root.unmount();
            } catch (e) {
                console.error('Error unmounting React root:', e);
            }
        }
        
        // Remove shadow container
        if (shadowContainer && shadowContainer.parentNode) {
            shadowContainer.parentNode.remove();
        }
    };
};

// Reference to cleanup function
let cleanupFunction = null;

// Start the observers if enabled
if (isExtensionEnabled) {
    cleanupFunction = init();
}

// Define cleanup function to be called when extension is disabled or unloaded
function cleanup() {
    if (cleanupFunction) {
        cleanupFunction();
        cleanupFunction = null;
    }
}

// Clean up when extension is unloaded
window.addEventListener('unload', cleanup);
