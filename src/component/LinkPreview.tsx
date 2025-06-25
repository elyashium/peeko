// Priority 1: Check local cache
// Priority 2: Check extension's IndexedDB storage
// Priority 3: Fetch from remote server


import React from 'react';

// This component displays a preview of a link when hovering over it
// It positions the preview next to the cursor and shows relevant information

interface LinkPreviewProps {
  visible: boolean;
  url: string;
  x: number;
  y: number;
  title: string;
  description: string;
  image: string | null;
  favicon: string | null;
  domain: string;
  loading: boolean;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ 
  visible, 
  url, 
  x, 
  y, 
  title, 
  description, 
  image, 
  favicon, 
  domain,
  loading
}) => {
  if (!visible) return null;

  // Calculate position - ensure the preview is visible within viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const previewWidth = 320; // Width of our preview
  const previewHeight = image ? 280 : 180; // Estimate height based on content
  
  // Check if preview would go off-screen to the right
  const finalX = x + previewWidth > viewportWidth ? x - previewWidth - 20 : x + 20;
  
  // Check if preview would go off-screen to the top
  // If the preview would be above the viewport, position it below the cursor
  const finalY = y - previewHeight < 0 ? y + 20 : y - previewHeight - 20;

  // Position the preview near the cursor
  const previewStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${finalX}px`,
    top: `${finalY}px`,
    width: '320px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    zIndex: 2147483647,
    overflow: 'hidden',
    pointerEvents: 'none',
    maxHeight: '400px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    transition: 'opacity 0.15s ease-in-out',
  };

  return (
    <div style={previewStyle}>
      {/* Loading state */}
      {loading && (
        <div style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '120px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '12px',
          }} />
          <p style={{ 
            fontSize: '14px',
            color: '#666',
            margin: 0
          }}>
            Loading preview...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Preview content when not loading */}
      {!loading && (
        <>
          {/* Preview image if available */}
          {image && (
            <div style={{
              width: '100%',
              height: '160px',
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            }} />
          )}
          
          <div style={{ padding: '12px 16px' }}>
            {/* Domain with favicon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              {favicon && (
                <img 
                  src={favicon} 
                  alt="" 
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '6px',
                    borderRadius: '2px',
                  }} 
                />
              )}
              <span style={{
                fontSize: '12px',
                color: '#666',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}>
                {domain || new URL(url).hostname}
              </span>
            </div>
            
            {/* Title */}
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '15px',
              fontWeight: 600,
              lineHeight: 1.3,
              color: '#222',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {title || 'No title available'}
            </h3>
            
            {/* Description */}
            <p style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.4,
              color: '#555',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {description || 'No description available'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default LinkPreview;
