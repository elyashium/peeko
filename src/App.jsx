import React, { useState, useEffect } from 'react'
//the popup that will be shown when you click on the extension icon on 
//chrome extension toolbar

//defining what the popul will look like,
//basic heading, followed by a explanation of what the extension does.
// a turn off/ on button to toggle the extension.

export default function App() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [settings, setSettings] = useState({
    showOnHover: true,
    enableForAllWebsites: true
  });
  const [status, setStatus] = useState(''); // For user feedback
  
  // Load initial state from storage
  useEffect(() => {
    chrome.storage.local.get(['isEnabled', 'showOnHover', 'enableForAllWebsites'], (result) => {
      if (result.isEnabled !== undefined) setIsEnabled(result.isEnabled);
      
      const updatedSettings = { ...settings };
      if (result.showOnHover !== undefined) updatedSettings.showOnHover = result.showOnHover;
      if (result.enableForAllWebsites !== undefined) updatedSettings.enableForAllWebsites = result.enableForAllWebsites;
      setSettings(updatedSettings);
    });
  }, []);
  
  const toggleExtension = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Send message to background script to update state
    chrome.runtime.sendMessage(
      { type: 'toggle-extension', enabled: newState },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error toggling extension:', chrome.runtime.lastError);
          setStatus('Error toggling extension');
          return;
        }
        
        setStatus(`Extension ${newState ? 'enabled' : 'disabled'}`);
        // Clear status after 2 seconds
        setTimeout(() => setStatus(''), 2000);
      }
    );
  };
  
  const updateSetting = (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    
    // Send message to background script to update settings
    chrome.runtime.sendMessage(
      { type: 'update-settings', settings: { [key]: value } },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error updating settings:', chrome.runtime.lastError);
          setStatus('Error updating settings');
          return;
        }
        
        setStatus('Settings updated');
        // Clear status after 2 seconds
        setTimeout(() => setStatus(''), 2000);
      }
    );
  };

  return (
    <div className="w-80 bg-white text-gray-800 p-5 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">P</span>
          </div>
          <h1 className="text-xl font-bold text-blue-600">PeekO</h1>
        </div>
        
        {/* Toggle switch */}
        <button 
          onClick={toggleExtension}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
        >
          <span className="sr-only">Toggle extension</span>
          <span 
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      
      {/* Status message */}
      {status && (
        <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded mb-3 text-center">
          {status}
        </div>
      )}
      
      {/* Divider */}
      <div className="h-px bg-gray-200 my-3"></div>
      
      {/* Content */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          PeekO lets you preview links before clicking on them, saving you time and protecting your browsing experience.
        </p>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p className="text-sm font-medium">
            Extension is {isEnabled ? 'active' : 'disabled'}
          </p>
        </div>
        
        {/* Quick settings */}
        <div className="bg-gray-50 p-3 rounded-md">
          <h3 className="text-sm font-medium mb-2">Quick Settings</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-600">Show preview on hover</span>
              <input 
                type="checkbox" 
                checked={settings.showOnHover}
                onChange={(e) => updateSetting('showOnHover', e.target.checked)} 
                className="rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-600">Enable for all websites</span>
              <input 
                type="checkbox" 
                checked={settings.enableForAllWebsites}
                onChange={(e) => updateSetting('enableForAllWebsites', e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
              />
            </label>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">Made with ❤️ by PeekO</p>
      </div>
    </div>
  )
}
