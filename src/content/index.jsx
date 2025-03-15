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