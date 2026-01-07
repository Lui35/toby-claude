import { Storage } from '../utils/storage.js';
import { generateId } from '../utils/helpers.js';

// DOM Elements
const currentTabFavicon = document.getElementById('currentTabFavicon');
const currentTabTitle = document.getElementById('currentTabTitle');
const currentTabUrl = document.getElementById('currentTabUrl');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const newCollectionBtn = document.getElementById('newCollectionBtn');
const collectionsList = document.getElementById('collectionsList');

let currentTab = null;
let collections = [];

// Initialize
async function init() {
  await loadCurrentTab();
  await loadCollections();
  renderCollections();
  setupEventListeners();
}

// Load current tab
async function loadCurrentTab() {
  currentTab = await chrome.runtime.sendMessage({ action: 'getCurrentTab' });

  if (currentTab) {
    currentTabFavicon.src = currentTab.favicon;
    currentTabTitle.textContent = currentTab.title;
    currentTabUrl.textContent = currentTab.url;
  }
}

// Load collections
async function loadCollections() {
  collections = await Storage.getCollections();
}

// Render collections list
function renderCollections() {
  if (collections.length === 0) {
    collectionsList.innerHTML = `
      <div class="empty-state">
        No collections yet.<br>Click + to create one.
      </div>
    `;
    return;
  }

  collectionsList.innerHTML = collections.map(collection => `
    <div class="collection-item" data-id="${collection.id}">
      <span class="collection-name">${escapeHtml(collection.name)}</span>
      <span class="collection-count">${collection.tabIds?.length || 0}</span>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.collection-item').forEach(item => {
    item.addEventListener('click', async () => {
      const collectionId = item.dataset.id;
      await addTabToCollection(collectionId);
    });
  });
}

// Add current tab to collection
async function addTabToCollection(collectionId) {
  if (!currentTab) return;

  await Storage.addTabToCollection(collectionId, currentTab);
  showSuccessMessage('Tab added to collection!');

  // Reload collections to update counts
  await loadCollections();
  renderCollections();
}

// Check if any collection already has the given URL
async function hasCollectionWithTab(url) {
  const { canonicalizeUrl } = await import('../utils/helpers.js');
  const canonicalUrl = canonicalizeUrl(url);
  const tabItems = await Storage.getTabItems();
  
  // Check if any collection contains a tab with this URL
  for (const collection of collections) {
    if (collection.tabIds && collection.tabIds.length > 0) {
      const hasTab = collection.tabIds.some(tabId => {
        const tab = tabItems[tabId];
        return tab && canonicalizeUrl(tab.url) === canonicalUrl;
      });
      if (hasTab) return true;
    }
  }
  
  return false;
}

// Save current session
async function saveSession() {
  const result = await chrome.runtime.sendMessage({ action: 'saveSession' });

  if (result.success) {
    showSuccessMessage('Session saved!');
  } else {
    alert('Failed to save session: ' + result.error);
  }
}

// Create new collection
async function createNewCollection() {
  const name = prompt('Collection name:');
  if (!name) return;

  const collection = {
    id: generateId(),
    name: name.trim(),
    description: '',
    tabIds: [],
    createdAt: Date.now()
  };

  await Storage.addCollection(collection);
  await loadCollections();
  renderCollections();

  // Only add tab if there's already a collection with the same tab
  if (currentTab && await hasCollectionWithTab(currentTab.url)) {
    if (confirm('Add current tab to this collection?')) {
      await addTabToCollection(collection.id);
    }
  }
}

// Show success message
function showSuccessMessage(message) {
  const div = document.createElement('div');
  div.className = 'success-message';
  div.textContent = message;
  document.body.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 2000);
}

// Setup event listeners
function setupEventListeners() {
  saveSessionBtn.addEventListener('click', saveSession);
  newCollectionBtn.addEventListener('click', createNewCollection);
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
