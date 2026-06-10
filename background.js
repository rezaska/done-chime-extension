/*
 * Claude Bell – background.js
 * Receives a message from the content script and fires a browser notification.
 * No user data is stored or transmitted externally.
 */

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'notify') {
    chrome.notifications.create('claude-bell-done', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Claude is done',
      message: 'Your response is ready — click to switch back.',
      silent: true,
      priority: 2
    }, () => {
      if (chrome.runtime.lastError) {
        // e.g. OS-level notifications disabled for Chrome
        console.warn('[Done Chime] notification failed:', chrome.runtime.lastError.message);
      }
    });
  }
});

// Clicking the notification focuses the claude.ai tab
chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId !== 'claude-bell-done') return;
  chrome.tabs.query({ url: 'https://claude.ai/*' }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    }
  });
  chrome.notifications.clear(notifId);
});
