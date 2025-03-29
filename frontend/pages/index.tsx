import React, { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Searching for:', query);
  };

  const handleReplaceContent = () => {
    // Query the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        // Inject the contentScript.js file into the active tab
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['contentScript.ts']
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Chrome Extension Popup</h1>
        <p>This popup is built with Next.js and styled with Tailwind CSS!</p>
        <button 
          onClick={handleReplaceContent} 
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Replace Page Content
        </button>
      </div>
    </div>
  );
}
