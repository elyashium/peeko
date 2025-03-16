// Priority 1: Check local cache
// Priority 2: Check extension's IndexedDB storage
// Priority 3: Fetch from remote server


import react, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill'

//promise-based API for browser extensions, ensuring compatibility between Chrome, Firefox, and other browsers
//beacause chrome uses a callback based API
// and firefox uses a promise based API
// so we use webextension-polyfill to ensure compatibility

interface LinkPreviewProps {
    visible: boolean;
    url: string;
    x: number;
    y: number;
}

interface PreviewData {
    title: string;
    description: string;
    image: string;
    loading: boolean;
    error: string | null;
}
