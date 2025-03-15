// link detection logic.

import React from 'react';
import ReactDOM from 'react-dom/client';
import debounce from 'lodash.debounce';
import { Preview } from './components/LinkPreview';

const CreateshadowContainer = () => {
    const container = document.createElement('div');
    container.id = 'peeko-shadow-container';
    document.body.appendChild(container);

    //creating shadowRoot 

    const shadowRoot = conatiner.attachShadow({ mode: 'open' });
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