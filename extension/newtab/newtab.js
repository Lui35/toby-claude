import { Storage } from '../utils/storage.js';
import { searchTabs } from '../utils/search.js';
import { generateId, downloadJSON, readJSONFile, formatDate, getHostname } from '../utils/helpers.js';

// State
let collections = [];
let tabItems = {};
let sessions = [];
let openTabs = [];
let searchTimeout = null;

// Search navigation state
let searchResultsData = [];
let selectedSearchIndex = -1;

// Double shift detection
let lastShiftTime = 0;
const DOUBLE_SHIFT_THRESHOLD = 300; // ms

// Drag state
let draggedElement = null;
let draggedType = null; // 'sidebar-tab', 'collection-tab', 'collection'
let draggedData = null;
let dropTarget = null;

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
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

const editTabModal = document.getElementById('editTabModal');
const editTabTitleInput = document.getElementById('editTabTitleInput');
const editTabUrlInput = document.getElementById('editTabUrlInput');
const saveEditTabBtn = document.getElementById('saveEditTabBtn');
const cancelEditTabBtn = document.getElementById('cancelEditTabBtn');

// Edit tab state
let currentEditingTabId = null;

// Initialize
async function init() {
  loadTheme();
  await loadData();
  await loadOpenTabs();
  render();
  renderOpenTabs();
  setupEventListeners();
}

// Theme management
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
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
              <button class="tab-cell-edit" data-tab-id="${tab.id}" title="Edit tab">✏️</button>
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
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const collectionId = btn.dataset.collectionId;
      const collection = collections.find(c => c.id === collectionId);
      if (collection && collection.tabIds) {
        for (const tabId of collection.tabIds) {
          const tab = tabItems[tabId];
          if (tab) {
            try {
              await chrome.tabs.create({ url: tab.url, active: false });
            } catch (error) {
              console.error('Error opening tab:', error);
            }
          }
        }
      }
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

  // Edit tab
  document.querySelectorAll('.tab-cell-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabId = btn.dataset.tabId;
      const tab = tabItems[tabId];
      if (tab) {
        currentEditingTabId = tabId;
        editTabTitleInput.value = tab.title || '';
        editTabUrlInput.value = tab.url || '';
        editTabModal.classList.remove('hidden');
        editTabTitleInput.focus();
      }
    });
  });

  // Open tab on click
  document.querySelectorAll('.tab-cell').forEach(cell => {
    cell.addEventListener('click', async (e) => {
      if (!e.target.closest('.tab-cell-remove') && !e.target.closest('.tab-cell-edit')) {
        const tabId = cell.dataset.tabId;
        const tab = tabItems[tabId];
        if (tab) {
          try {
            await chrome.tabs.create({ url: tab.url, active: true });
          } catch (error) {
            console.error('Error opening tab:', error);
          }
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
  });

  // Drop handler for entire collections list
  collectionsList.addEventListener('drop', async (e) => {
    if (draggedType === 'collection') {
      e.preventDefault();
      const newIndex = Array.from(collectionsList.children).indexOf(draggedElement);
      console.log('Reordering collection to index:', newIndex);
      await Storage.reorderCollection(draggedData.collectionId, newIndex);
      await loadData();
      renderCollections();
    }
  });

  collectionsList.addEventListener('dragover', (e) => {
    if (draggedType === 'collection') {
      e.preventDefault();
    }
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

    // Allow tab cells to be drop targets for reordering
    cell.addEventListener('dragover', (e) => {
      if (draggedType === 'collection-tab' && draggedElement !== cell) {
        const targetCollectionId = cell.dataset.collectionId;
        const draggedCollectionId = draggedData.collectionId;

        // Only allow reordering within the same collection
        if (targetCollectionId === draggedCollectionId) {
          e.preventDefault();
          cell.classList.add('drag-over');
        }
      }
    });

    cell.addEventListener('dragleave', (e) => {
      if (!cell.contains(e.relatedTarget)) {
        cell.classList.remove('drag-over');
      }
    });

    cell.addEventListener('drop', async (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');

      if (draggedType === 'collection-tab') {
        const targetCollectionId = cell.dataset.collectionId;
        const targetTabIndex = parseInt(cell.dataset.tabIndex);

        // Reorder within same collection
        if (draggedData.collectionId === targetCollectionId) {
          await Storage.reorderTabInCollection(
            targetCollectionId,
            draggedData.tabId,
            targetTabIndex
          );
          await loadData();
          renderCollections();
        }
      }
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
// Scroll to and highlight a specific tab in a collection
function scrollToAndHighlight(collectionId, tabId) {
  // Find the collection card
  const collectionCard = document.querySelector(`.collection-card[data-collection-id="${collectionId}"]`);

  if (collectionCard) {
    // Expand the collection if it's collapsed
    const collection = collections.find(c => c.id === collectionId);
    if (collection && collection.collapsed) {
      toggleCollapse(collectionId);
      // Wait for animation to complete
      setTimeout(() => {
        scrollAndHighlightElements(collectionCard, tabId);
      }, 300);
    } else {
      scrollAndHighlightElements(collectionCard, tabId);
    }
  }
}

// Helper function to scroll and highlight elements
function scrollAndHighlightElements(collectionCard, tabId) {
  // Scroll collection to top with smooth animation
  collectionCard.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  // Highlight the collection briefly
  collectionCard.style.transition = 'box-shadow 0.3s ease';
  collectionCard.style.boxShadow = '0 0 0 3px var(--accent), 0 8px 16px rgba(0,0,0,0.2)';

  // Find and highlight the specific tab
  if (tabId) {
    setTimeout(() => {
      const tabCell = collectionCard.querySelector(`.tab-cell[data-tab-id="${tabId}"]`);
      if (tabCell) {
        tabCell.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        tabCell.style.transform = 'scale(1.05)';
        tabCell.style.boxShadow = '0 0 0 2px var(--accent), 0 4px 12px rgba(0,0,0,0.15)';

        // Remove highlights after animation
        setTimeout(() => {
          tabCell.style.transform = '';
          tabCell.style.boxShadow = '';
        }, 1500);
      }

      // Remove collection highlight
      collectionCard.style.boxShadow = '';
    }, 400);
  } else {
    // Remove collection highlight if no specific tab
    setTimeout(() => {
      collectionCard.style.boxShadow = '';
    }, 1500);
  }
}

function handleSearch(autoSelectFirst = true) {
  const query = searchInput.value.trim();

  if (!query) {
    searchResults.classList.add('hidden');
    searchResultsData = [];
    selectedSearchIndex = -1;
    return;
  }

  const results = searchTabs(query, collections, tabItems);
  searchResultsData = results;

  if (results.length === 0) {
    searchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No results found</div>';
    searchResults.classList.remove('hidden');
    selectedSearchIndex = -1;
    return;
  }

  // Auto-select first result by default
  selectedSearchIndex = autoSelectFirst && results.length > 0 ? 0 : -1;

  renderSearchResults();
}

// Render search results with proper highlighting
function renderSearchResults() {
  searchResults.innerHTML = searchResultsData.map((result, index) => `
    <div class="search-result-item ${index === selectedSearchIndex ? 'selected' : ''}"
         data-index="${index}"
         data-url="${escapeHtml(result.url)}"
         data-collection-id="${result.collectionId}"
         data-tab-id="${result.id}">
      <img src="${result.faviconUrl || result.favicon}" alt="" />
      <div class="search-result-content">
        <div class="search-result-title">${escapeHtml(result.title)}</div>
        <div class="search-result-meta">${escapeHtml(result.collectionName)} • ${escapeHtml(getHostname(result.url))}</div>
      </div>
    </div>
  `).join('');

  searchResults.classList.remove('hidden');

  // Scroll selected item into view
  if (selectedSearchIndex >= 0) {
    const selectedElement = searchResults.querySelector('.search-result-item.selected');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // Add click handlers
  document.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      openSearchResult(parseInt(el.dataset.index));
    });
  });
}

// Open a search result by index
async function openSearchResult(index) {
  if (index < 0 || index >= searchResultsData.length) return;

  const result = searchResultsData[index];

  console.log('Opening search result:', result.url);

  try {
    // Open the tab directly
    await chrome.tabs.create({ url: result.url, active: true });
    console.log('Tab opened successfully');
  } catch (error) {
    console.error('Error opening tab:', error);
  }

  // Close search
  searchInput.value = '';
  searchResults.classList.add('hidden');
  searchResultsData = [];
  selectedSearchIndex = -1;
}

// Navigate search results with arrow keys
function navigateSearchResults(direction) {
  if (searchResultsData.length === 0) return;

  if (selectedSearchIndex === -1 && direction === 'down') {
    selectedSearchIndex = 0;
  } else if (selectedSearchIndex === -1 && direction === 'up') {
    selectedSearchIndex = searchResultsData.length - 1;
  } else if (direction === 'down') {
    selectedSearchIndex = Math.min(selectedSearchIndex + 1, searchResultsData.length - 1);
  } else if (direction === 'up') {
    selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
  }

  renderSearchResults();
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Search
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 200);
  });

  // Sidebar filter
  sidebarFilterInput.addEventListener('input', renderOpenTabs);

  // Keyboard shortcuts and navigation
  document.addEventListener('keydown', (e) => {
    // Focus search with /
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
        // Trigger search with first result selected after a brief delay
        setTimeout(() => {
          if (searchInput.value.trim()) {
            handleSearch(true); // Auto-select first result
          }
        }, 50);
      }
      lastShiftTime = now;
    }

    // Arrow key navigation in search results
    if (document.activeElement === searchInput && searchResultsData.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSearchResults('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSearchResults('up');
      } else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
        e.preventDefault();
        console.log('Enter pressed, opening result at index:', selectedSearchIndex);
        openSearchResult(selectedSearchIndex);
      }
    }

    // Escape to close search
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults.classList.add('hidden');
      searchResultsData = [];
      selectedSearchIndex = -1;
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

  // Edit tab modal
  saveEditTabBtn.addEventListener('click', async () => {
    const title = editTabTitleInput.value.trim();
    const url = editTabUrlInput.value.trim();

    if (!title || !url) {
      alert('Please provide both title and URL');
      return;
    }

    if (currentEditingTabId) {
      await Storage.updateTabItem(currentEditingTabId, { title, url });
      await loadData();
      renderCollections();

      editTabTitleInput.value = '';
      editTabUrlInput.value = '';
      currentEditingTabId = null;
      editTabModal.classList.add('hidden');
    }
  });

  cancelEditTabBtn.addEventListener('click', () => {
    editTabTitleInput.value = '';
    editTabUrlInput.value = '';
    currentEditingTabId = null;
    editTabModal.classList.add('hidden');
  });

  // Enter key for modals
  collectionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createCollectionBtn.click();
  });

  sessionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmSessionBtn.click();
  });

  editTabTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEditTabBtn.click();
  });

  editTabUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEditTabBtn.click();
  });

  // Close modals on background click
  [newCollectionModal, saveSessionModal, importModal, editTabModal].forEach(modal => {
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
