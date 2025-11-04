import { Storage } from '../utils/storage.js';
import { searchTabs } from '../utils/search.js';
import { generateId, downloadJSON, readJSONFile, formatDate, getHostname } from '../utils/helpers.js';

// State
let collections = [];
let tabItems = {};
let sessions = [];
let openTabs = [];
let searchTimeout = null;

// Double shift detection
let lastShiftTime = 0;
const DOUBLE_SHIFT_THRESHOLD = 300; // ms

// Drag state
let draggedElement = null;
let draggedType = null; // 'sidebar-tab', 'collection-tab', 'collection'
let draggedData = null;
let dropTarget = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const collectionsList = document.getElementById('collectionsList');
const newCollectionBtn = document.getElementById('newCollectionBtn');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

// Sidebar elements
const openTabsList = document.getElementById('openTabsList');
const openTabsCount = document.getElementById('openTabsCount');
const sidebarFilterInput = document.getElementById('sidebarFilterInput');

// Modals
const newCollectionModal = document.getElementById('newCollectionModal');
const collectionNameInput = document.getElementById('collectionNameInput');
const collectionDescInput = document.getElementById('collectionDescInput');
const createCollectionBtn = document.getElementById('createCollectionBtn');
const cancelCollectionBtn = document.getElementById('cancelCollectionBtn');

const saveSessionModal = document.getElementById('saveSessionModal');
const sessionNameInput = document.getElementById('sessionNameInput');
const confirmSessionBtn = document.getElementById('confirmSessionBtn');
const cancelSessionBtn = document.getElementById('cancelSessionBtn');

const importModal = document.getElementById('importModal');
const importMergeBtn = document.getElementById('importMergeBtn');
const importReplaceBtn = document.getElementById('importReplaceBtn');
const cancelImportBtn = document.getElementById('cancelImportBtn');

// Initialize
async function init() {
  await loadData();
  await loadOpenTabs();
  render();
  renderOpenTabs();
  setupEventListeners();
}

// Load data from storage
async function loadData() {
  collections = await Storage.getCollections();
  tabItems = await Storage.getTabItems();
  sessions = await Storage.getSessions();
}

// Load currently open tabs
async function loadOpenTabs() {
  const tabs = await chrome.tabs.query({});
  openTabs = tabs.filter(tab => !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'));
  openTabsCount.textContent = openTabs.length;
}

// Render everything
function render() {
  renderCollections();
}

// Render collections (full-width vertical cards)
function renderCollections() {
  if (collections.length === 0) {
    collectionsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">No collections yet</div>
        <div class="empty-state-subtext">Create a collection to organize your tabs</div>
      </div>
    `;
    return;
  }

  collectionsList.innerHTML = collections.map((collection, collectionIndex) => {
    const tabs = (collection.tabIds || [])
      .map(tabId => tabItems[tabId])
      .filter(tab => tab);

    const isCollapsed = collection.collapsed || false;

    return `
      <div class="collection-card"
           data-collection-id="${collection.id}"
           data-collection-index="${collectionIndex}"
           draggable="false">
        <div class="collection-header" data-collection-id="${collection.id}">
          <div class="collection-title-area">
            <div class="collection-title"
                 contenteditable="false"
                 data-collection-id="${collection.id}">${escapeHtml(collection.name)}</div>
            <div class="collection-meta">${tabs.length} tabs</div>
          </div>
          <div class="collection-actions">
            <button class="icon-btn collapse-btn" data-collection-id="${collection.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
              ${isCollapsed ? '▼' : '▲'}
            </button>
            <button class="icon-btn open-all-btn" data-collection-id="${collection.id}" title="Open all tabs">▶️</button>
            <button class="icon-btn delete-collection-btn" data-collection-id="${collection.id}" title="Delete collection">🗑️</button>
          </div>
        </div>

        <div class="collection-body ${isCollapsed ? 'collapsed' : ''}" data-collection-id="${collection.id}">
          ${tabs.map((tab, tabIndex) => `
            <div class="tab-cell"
                 draggable="true"
                 data-collection-id="${collection.id}"
                 data-tab-id="${tab.id}"
                 data-tab-index="${tabIndex}">
              <button class="tab-cell-remove" data-collection-id="${collection.id}" data-tab-id="${tab.id}">×</button>
              <div class="tab-cell-header">
                <img src="${tab.faviconUrl || tab.favicon}" class="tab-cell-favicon" alt="" />
                <div class="tab-cell-title">${escapeHtml(tab.title)}</div>
              </div>
              <div class="tab-cell-host">${escapeHtml(getHostname(tab.url))}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  setupCollectionDragAndDrop();
  setupCollectionEventListeners();
}

// Setup collection event listeners
function setupCollectionEventListeners() {
  // Collapse/Expand
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const collectionId = btn.dataset.collectionId;
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        collection.collapsed = !collection.collapsed;
        await Storage.updateCollection(collectionId, { collapsed: collection.collapsed });
        renderCollections();
      }
    });
  });

  // Editable title (click to edit)
  document.querySelectorAll('.collection-title').forEach(titleEl => {
    titleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (titleEl.contentEditable === 'false') {
        titleEl.contentEditable = 'true';
        titleEl.classList.add('editing');
        titleEl.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    titleEl.addEventListener('blur', async () => {
      titleEl.contentEditable = 'false';
      titleEl.classList.remove('editing');
      const newName = titleEl.textContent.trim();
      if (newName) {
        const collectionId = titleEl.dataset.collectionId;
        await Storage.updateCollection(collectionId, { name: newName });
        await loadData();
      }
    });

    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        titleEl.textContent = collections.find(c => c.id === titleEl.dataset.collectionId)?.name || '';
        titleEl.blur();
      }
    });
  });

  // Open all
  document.querySelectorAll('.open-all-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'openCollection', collectionId: btn.dataset.collectionId });
    });
  });

  // Delete collection
  document.querySelectorAll('.delete-collection-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this collection?')) {
        await Storage.deleteCollection(btn.dataset.collectionId);
        await loadData();
        renderCollections();
      }
    });
  });

  // Remove tab from collection
  document.querySelectorAll('.tab-cell-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { collectionId, tabId } = btn.dataset;
      await Storage.removeTabFromCollection(collectionId, tabId);
      await loadData();
      renderCollections();
    });
  });

  // Open tab on click
  document.querySelectorAll('.tab-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-cell-remove')) {
        const tabId = cell.dataset.tabId;
        const tab = tabItems[tabId];
        if (tab) {
          chrome.runtime.sendMessage({ action: 'openTab', url: tab.url });
        }
      }
    });
  });
}

// Setup drag and drop
function setupCollectionDragAndDrop() {
  // Collection header drag (for reordering collections)
  document.querySelectorAll('.collection-header').forEach(header => {
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.collection-actions') || e.target.closest('.collection-title')) {
        return; // Don't start drag if clicking actions or title
      }
      const card = header.closest('.collection-card');
      card.draggable = true;
    });

    header.parentElement.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.collection-card');
      if (card && card.draggable) {
        draggedElement = card;
        draggedType = 'collection';
        draggedData = { collectionId: card.dataset.collectionId, index: parseInt(card.dataset.collectionIndex) };
        card.classList.add('dragging');
      }
    });

    header.parentElement.addEventListener('dragend', (e) => {
      const card = e.target.closest('.collection-card');
      if (card) {
        card.classList.remove('dragging');
        card.draggable = false;
        draggedElement = null;
        draggedType = null;
        draggedData = null;
      }
    });
  });

  // Collection card as drop target (for reordering)
  document.querySelectorAll('.collection-card').forEach(card => {
    card.addEventListener('dragover', (e) => {
      if (draggedType === 'collection' && draggedElement !== card) {
        e.preventDefault();
        const afterElement = getDragAfterElement(collectionsList, e.clientY);
        if (afterElement == null) {
          collectionsList.appendChild(draggedElement);
        } else {
          collectionsList.insertBefore(draggedElement, afterElement);
        }
      }
    });

    card.addEventListener('drop', async (e) => {
      if (draggedType === 'collection') {
        e.preventDefault();
        const newIndex = Array.from(collectionsList.children).indexOf(draggedElement);
        await Storage.reorderCollection(draggedData.collectionId, newIndex);
        await loadData();
        renderCollections();
      }
    });
  });

  // Tab cell drag
  document.querySelectorAll('.tab-cell').forEach(cell => {
    cell.addEventListener('dragstart', (e) => {
      draggedElement = cell;
      draggedType = 'collection-tab';
      draggedData = {
        collectionId: cell.dataset.collectionId,
        tabId: cell.dataset.tabId,
        tabIndex: parseInt(cell.dataset.tabIndex)
      };
      cell.classList.add('dragging');
    });

    cell.addEventListener('dragend', () => {
      cell.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      draggedElement = null;
      draggedType = null;
      draggedData = null;
    });
  });

  // Collection body as drop target (for tabs)
  document.querySelectorAll('.collection-body').forEach(body => {
    body.addEventListener('dragover', (e) => {
      if (draggedType === 'sidebar-tab' || draggedType === 'collection-tab') {
        e.preventDefault();
        const card = body.closest('.collection-card');
        card.classList.add('drag-over');
      }
    });

    body.addEventListener('dragleave', (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        const card = body.closest('.collection-card');
        card.classList.remove('drag-over');
      }
    });

    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      const targetCollectionId = body.dataset.collectionId;
      const card = body.closest('.collection-card');
      card.classList.remove('drag-over');

      if (draggedType === 'sidebar-tab') {
        // Add from sidebar
        const tab = draggedData.tab;
        await Storage.addTabToCollection(targetCollectionId, tab);
        await loadData();
        renderCollections();
      } else if (draggedType === 'collection-tab') {
        // Move between collections or reorder within collection
        if (draggedData.collectionId === targetCollectionId) {
          // Reorder within same collection - TODO: calculate new index
        } else {
          // Move to different collection
          await Storage.moveTabBetweenCollections(
            draggedData.collectionId,
            targetCollectionId,
            draggedData.tabId
          );
          await loadData();
          renderCollections();
        }
      }
    });
  });
}

// Get drag after element helper
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.collection-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Render open tabs sidebar
function renderOpenTabs() {
  const filterText = sidebarFilterInput.value.toLowerCase();
  const filtered = openTabs.filter(tab =>
    tab.title.toLowerCase().includes(filterText) ||
    tab.url.toLowerCase().includes(filterText)
  );

  if (filtered.length === 0) {
    openTabsList.innerHTML = '<div class="empty-state"><div class="empty-state-text">No open tabs</div></div>';
    return;
  }

  openTabsList.innerHTML = filtered.map(tab => `
    <div class="sidebar-tab-item"
         draggable="true"
         data-tab-id="${tab.id}">
      <img src="${tab.favIconUrl}" class="sidebar-tab-favicon" alt="" />
      <div class="sidebar-tab-info">
        <div class="sidebar-tab-title">${escapeHtml(tab.title)}</div>
        <div class="sidebar-tab-host">${escapeHtml(getHostname(tab.url))}</div>
      </div>
    </div>
  `).join('');

  setupSidebarDragAndDrop();
}

// Setup sidebar drag and drop
function setupSidebarDragAndDrop() {
  document.querySelectorAll('.sidebar-tab-item').forEach(item => {
    item.addEventListener('dragstart', async (e) => {
      const tabId = parseInt(item.dataset.tabId);
      const chromeTab = openTabs.find(t => t.id === tabId);

      if (chromeTab) {
        const { normalizeTab } = await import('../utils/helpers.js');
        const tab = normalizeTab(chromeTab);

        draggedElement = item;
        draggedType = 'sidebar-tab';
        draggedData = { tab, chromeTabId: tabId };
        item.classList.add('dragging');
      }
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedElement = null;
      draggedType = null;
      draggedData = null;
    });
  });
}


// Search functionality
function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }

  const results = searchTabs(query, collections, tabItems);

  if (results.length === 0) {
    searchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No results found</div>';
    searchResults.classList.remove('hidden');
    return;
  }

  searchResults.innerHTML = results.map(result => `
    <div class="search-result-item" data-url="${escapeHtml(result.url)}">
      <img src="${result.faviconUrl || result.favicon}" alt="" />
      <div class="search-result-content">
        <div class="search-result-title">${escapeHtml(result.title)}</div>
        <div class="search-result-meta">${escapeHtml(result.collectionName)} • ${escapeHtml(getHostname(result.url))}</div>
      </div>
    </div>
  `).join('');

  searchResults.classList.remove('hidden');

  document.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openTab', url: el.dataset.url });
      searchInput.value = '';
      searchResults.classList.add('hidden');
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 200);
  });

  // Sidebar filter
  sidebarFilterInput.addEventListener('input', renderOpenTabs);

  // Focus search with /
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== sidebarFilterInput) {
      e.preventDefault();
      searchInput.focus();
    }

    // Double shift detection
    if (e.key === 'Shift') {
      const now = Date.now();
      if (now - lastShiftTime < DOUBLE_SHIFT_THRESHOLD) {
        searchInput.focus();
        searchInput.select();
      }
      lastShiftTime = now;
    }

    // Escape to close search
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults.classList.add('hidden');
      searchInput.blur();
    }
  });

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });

  // New collection
  newCollectionBtn.addEventListener('click', () => {
    newCollectionModal.classList.remove('hidden');
    collectionNameInput.focus();
  });

  createCollectionBtn.addEventListener('click', async () => {
    const name = collectionNameInput.value.trim();
    if (!name) return;

    const collection = {
      id: generateId(),
      name,
      description: collectionDescInput.value.trim(),
      tabIds: [],
      collapsed: false,
      createdAt: Date.now()
    };

    await Storage.addCollection(collection);
    await loadData();
    renderCollections();

    collectionNameInput.value = '';
    collectionDescInput.value = '';
    newCollectionModal.classList.add('hidden');
  });

  cancelCollectionBtn.addEventListener('click', () => {
    collectionNameInput.value = '';
    collectionDescInput.value = '';
    newCollectionModal.classList.add('hidden');
  });

  // Save session
  saveSessionBtn.addEventListener('click', () => {
    saveSessionModal.classList.remove('hidden');
    sessionNameInput.focus();
  });

  confirmSessionBtn.addEventListener('click', async () => {
    const name = sessionNameInput.value.trim();
    await chrome.runtime.sendMessage({ action: 'saveSession', name });
    alert('Session saved successfully!');

    sessionNameInput.value = '';
    saveSessionModal.classList.add('hidden');
  });

  cancelSessionBtn.addEventListener('click', () => {
    sessionNameInput.value = '';
    saveSessionModal.classList.add('hidden');
  });

  // Import/Export
  exportBtn.addEventListener('click', async () => {
    const data = await Storage.exportData();
    const filename = `tab-collections-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(data, filename);
  });

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  let pendingImportData = null;

  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        pendingImportData = text;
      } else {
        pendingImportData = await readJSONFile(file);
      }

      // Show import options modal
      importModal.classList.remove('hidden');
    } catch (error) {
      alert('Failed to read file: ' + error.message);
    }

    importFileInput.value = '';
  });

  importMergeBtn.addEventListener('click', async () => {
    try {
      await Storage.importData(pendingImportData, 'merge');
      await loadData();
      render();
      importModal.classList.add('hidden');
      alert('Import successful! Data merged with existing collections.');
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  });

  importReplaceBtn.addEventListener('click', async () => {
    if (!confirm('This will REPLACE all your existing data. Are you sure?')) {
      return;
    }

    try {
      await Storage.importData(pendingImportData, 'replace');
      await loadData();
      render();
      importModal.classList.add('hidden');
      alert('Import successful! All data replaced.');
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  });

  cancelImportBtn.addEventListener('click', () => {
    pendingImportData = null;
    importModal.classList.add('hidden');
  });

  // Enter key for modals
  collectionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createCollectionBtn.click();
  });

  sessionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmSessionBtn.click();
  });

  // Close modals on background click
  [newCollectionModal, saveSessionModal, importModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Reload open tabs periodically
  setInterval(async () => {
    await loadOpenTabs();
    renderOpenTabs();
  }, 3000);
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
