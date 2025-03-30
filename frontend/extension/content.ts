console.log('[Content] Content script loaded');

// Example: send a message to background script
chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
  console.log('[Content] Response from background:', response);
});