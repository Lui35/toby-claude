// Background service worker for handling sessions and commands

import { Storage } from '../utils/storage.js';
import { generateId, normalizeTab } from '../utils/helpers.js';

// Listen for command shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-session') {
    saveCurrentSession();
  }
});

// Listen for messages from popup/newtab
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSession') {
    saveCurrentSession(request.name).then(sendResponse);
    return true;
  } else if (request.action === 'restoreSession') {
    restoreSession(request.sessionId).then(sendResponse);
    return true;
  } else if (request.action === 'getCurrentTab') {
    getCurrentTab().then(sendResponse);
    return true;
  } else if (request.action === 'openTab') {
    openTab(request.url).then(sendResponse);
    return true;
  } else if (request.action === 'openCollection') {
    openCollection(request.collectionId).then(sendResponse);
    return true;
  }
});

/**
 * Save current browser session
 * @param {string} name - Optional session name
 */
async function saveCurrentSession(name = null) {
  try {
    const windows = await chrome.windows.getAll({ populate: true });

    const tabSnapshot = windows.flatMap(window =>
      window.tabs
        .sort((a, b) => a.index - b.index)
        .map(tab => ({
          url: tab.url,
          title: tab.title,
          pinned: tab.pinned,
          index: tab.index,
          windowId: window.id,
          favicon: tab.favIconUrl
        }))
    );

    const session = {
      id: generateId(),
      name: name || `Session ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      windowCount: windows.length,
      tabCount: tabSnapshot.length,
      tabSnapshot
    };

    await Storage.addSession(session);

    console.log('Session saved:', session);
    return { success: true, session };
  } catch (error) {
    console.error('Error saving session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore a saved session
 * @param {string} sessionId
 */
async function restoreSession(sessionId) {
  try {
    const sessions = await Storage.getSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Create new window for the session
    const newWindow = await chrome.windows.create({ focused: true });

    // Close the default new tab
    const tabs = await chrome.tabs.query({ windowId: newWindow.id });
    if (tabs.length > 0) {
      await chrome.tabs.remove(tabs[0].id);
    }

    // Restore tabs
    for (const tabData of session.tabSnapshot) {
      await chrome.tabs.create({
        windowId: newWindow.id,
        url: tabData.url,
        pinned: tabData.pinned,
        active: false
      });
    }

    console.log('Session restored:', session);
    return { success: true };
  } catch (error) {
    console.error('Error restoring session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current active tab
 */
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? normalizeTab(tab) : null;
}

/**
 * Open a tab URL
 * @param {string} url
 */
async function openTab(url) {
  await chrome.tabs.create({ url });
  return { success: true };
}

/**
 * Open all tabs in a collection
 * @param {string} collectionId
 */
async function openCollection(collectionId) {
  try {
    const collections = await Storage.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    // Open tabs in current window
    for (const tab of collection.items) {
      await chrome.tabs.create({ url: tab.url, active: false });
    }

    return { success: true };
  } catch (error) {
    console.error('Error opening collection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Open quick search (creates new tab with search focused)
 */
async function openQuickSearch() {
  // Create new tab with our newtab page and trigger search
  await chrome.tabs.create({ url: 'chrome://newtab/' });
  // The newtab page will handle focusing search on load
}

console.log('Background service worker initialized');
