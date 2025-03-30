"use strict";
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Extension] Installed!');
});
// Example: receive messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Background] Message received:', message);
    if (message.type === 'ping') {
        sendResponse({ type: 'pong', success: true });
    }
});
