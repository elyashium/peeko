// link detection logic.

import React from 'react';
import ReactDOM from 'react-dom/client';
import debounce from 'lodash.debounce';
import { LinkPreview } from './components/LinkPreview';

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
const shadowContainer = createShadowContainer();
const root = ReactDOM.createRoot(shadowContainer);

// Cache for storing previews
const previewCache = new Map();

// Preview state
let currentPreviewData = {
    visible: false,
    url: '',
    x: 0,
    y: 0
};

//rendering the preview 

const renderPreview = () => {
    root.render(
        <Preview
            visible={currentPreviewData.visible}
            url={currentPreviewData.url}
            x={currentPreviewData.x}
            y={currentPreviewData.y}
        />
    );
};

//intialisating the first preview state.
renderPreview();


// to display a preview of a link when a user hovers over it,
// with debouncing to avoid excessive function calls

// const handleLinkHover = debounce((event) => {...}, 200);

//debounce(func, delay): Ensures that func executes only 
//after delay milliseconds (200ms here) since the last invocation


// this runs 200ms after the user hovers over a link.

// hover handler

const handleLinkHover = debounce(event => {
    const link = event.target.closest('a');
    //find the closesst anchor tag
    if (!link || !link.href) {
        return;
    }

    currentPreviewData = {
        visible: true, // Show preview
        url: link.href, // Store link URL
        x: event.clientX, // Mouse X position
        y: event.clientY  // Mouse Y position
    };
    renderPreview(); // Update preview UI

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
// intersection ovbservation API is used to efficiently detect when an element
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


// Calls setupLinkObservers() to start observing existing links.
// Creates a MutationObserver that listens for changes (childList) in the document body.
// When a new element is added (mutation.addedNodes):
// If it's an element node, it checks for <a href="..."> links inside it.
// If new links are found, it sets shouldRescanLinks = true.
// If new links are detected, it:
// Stops (disconnect) the current link observer.
// Waits 100ms (setTimeout) and then sets up link observers again (setupLinkObservers()).
// Why disconnect and reconnect?
// This ensures that the link observer is refreshed and starts watching newly added links

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
                linkObserver();
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
    const linkObs = linkObserver();
    const mutationObserver = watchForNewLinks();

    // Clean up function
    return () => {
        linkObs.disconnect();
        mutationObserver.disconnect();
    };
};

// Start the observers
const cleanup = init();

// Clean up when extension is unloaded
window.addEventListener('unload', cleanup);