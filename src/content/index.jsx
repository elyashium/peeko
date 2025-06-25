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
//what is debounce?
//debounce is a function that delays the execution of a function until a certain amount of time has passed since the last time the function was called.
//it is used to prevent excessive function calls.


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

//the problem :  A webpage can have thousands of links. Attaching our hover-watching 
// logic to every single one all the time would be inefficient and could slow down the page.
//The Solution: The IntersectionObserver is a modern browser feature that is extremely efficient.
//it is used to detect when an element enters or leaves the viewport or the specified container.



const linkObserver = () => {
    const links = document.querySelectorAll('a[href]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                //entry.isIntersecting is a boolean that is true when the element is intersecting with the viewport.
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

//The Problem: Modern websites are dynamic. New content can be loaded as you scroll (like on Twitter or Facebook)
// or content can change without the page reloading. Our linkObserver only runs once at the beginning, so it wouldn't know about these new links.
//The Solution: The MutationObserver acts like a guard for the entire webpage's structure (the DOM). It is used to detect changes in the DOM.


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