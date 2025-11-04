// Collection event handlers
import { state } from './state.js';
import { dom } from './dom.js';
import { Storage } from '../../utils/storage.js';
import { renderCollections } from './collections.js';
import { loadData } from './dataLoader.js';

export function setupCollectionEventListeners() {
  // Collapse/Expand
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const collectionId = btn.dataset.collectionId;
      const collection = state.collections.find(c => c.id === collectionId);
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
        titleEl.textContent = state.collections.find(c => c.id === titleEl.dataset.collectionId)?.name || '';
        titleEl.blur();
      }
    });
  });

  // Open all tabs
  document.querySelectorAll('.open-all-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const collectionId = btn.dataset.collectionId;
      const collection = state.collections.find(c => c.id === collectionId);
      if (collection && collection.tabIds) {
        for (const tabId of collection.tabIds) {
          const tab = state.tabItems[tabId];
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
      const tab = state.tabItems[tabId];
      if (tab) {
        state.currentEditingTabId = tabId;
        dom.editTabTitleInput.value = tab.title || '';
        dom.editTabUrlInput.value = tab.url || '';
        dom.editTabModal.classList.remove('hidden');
        dom.editTabTitleInput.focus();
      }
    });
  });

  // Open tab on click
  document.querySelectorAll('.tab-cell').forEach(cell => {
    cell.addEventListener('click', async (e) => {
      if (!e.target.closest('.tab-cell-remove') && !e.target.closest('.tab-cell-edit')) {
        const tabId = cell.dataset.tabId;
        const tab = state.tabItems[tabId];
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
