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

export const LinkPreview: React.FC<LinkPreviewProps> = ({ visible, url, x, y }) => {

    const [previewData, setPreviewData] = useState<PreviewData>({
        title: '',
        description: '',
        image: '',
        loading: false,
        error: null
    });

    useEffect(() => {
        // Don't fetch if not visible or no URL
        if (!visible || !url) return;

        const fetchPreviewData = async () => {
            try {
                setPreviewData(prev => ({ ...prev, loading: true, error: null }));

                // Send message to background script to fetch preview
                const response = await browser.runtime.sendMessage({
                    action: 'fetchPreview',
                    url
                });

                if (response.error) {
                    setPreviewData(prev => ({
                        ...prev,
                        loading: false,
                        error: response.error
                    }));
                }

                else {
                    setPreviewData({
                        title: response.title || '',
                        description: response.description || '',
                        image: response.image || '',
                        loading: false,
                        error: null
                    });
                }
            }

            catch (error) {
                setPreviewData(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load preview'
                }));
            }
        };

        fetchPreviewData();
    }, [visible, url]);

    if (!visible) return null;

    // Position the preview above the cursor
    const previewStyle = {
        position: 'fixed',     //position the preview above the cursor even if the page is scrolled
        left: `${x}px`,       //This places the left edge of the preview at the x-coordinate passed as a prop to the component. This x-coordinate typically represents the horizontal position of the cursor.
        top: `${y - 10}px`,   //This places the top edge of the preview at the y-coordinate passed as a prop to the component. This y-coordinate typically represents the vertical position of the cursor.
        transform: 'translateY(-100%)',    //This moves the preview 100% of its height upwards, effectively placing it above the cursor.
        width: '300px',    //This sets the width of the preview to 300 pixels.
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 2147483647,
        overflow: 'hidden', //This hides any content that overflows the preview's boundaries.
        pointerEvents: 'none', // This prevents the preview from interfering with mouse interactions.
    } as React.CSSProperties;


}
