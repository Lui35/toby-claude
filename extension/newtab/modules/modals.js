// Modal event handlers
import { state } from './state.js';
import { dom } from './dom.js';
import { Storage } from '../../utils/storage.js';
import { generateId, downloadJSON, readJSONFile } from '../../utils/helpers.js';
import { loadData } from './dataLoader.js';
import { renderCollections } from './collections.js';

let pendingImportData = null;

export function setupModalHandlers() {
  // New Collection Modal
  dom.newCollectionBtn.addEventListener('click', () => {
    dom.newCollectionModal.classList.remove('hidden');
    dom.collectionNameInput.focus();
  });

  dom.createCollectionBtn.addEventListener('click', async () => {
    const name = dom.collectionNameInput.value.trim();
    if (!name) return;

    const collection = {
      id: generateId(),
      name,
      description: dom.collectionDescInput.value.trim(),
      tabIds: [],
      collapsed: false,
      createdAt: Date.now()
    };

    await Storage.addCollection(collection);
    await loadData();
    renderCollections();

    dom.collectionNameInput.value = '';
    dom.collectionDescInput.value = '';
    dom.newCollectionModal.classList.add('hidden');
  });

  dom.cancelCollectionBtn.addEventListener('click', () => {
    dom.collectionNameInput.value = '';
    dom.collectionDescInput.value = '';
    dom.newCollectionModal.classList.add('hidden');
  });

  // Save Session Modal
  dom.saveSessionBtn.addEventListener('click', () => {
    dom.saveSessionModal.classList.remove('hidden');
    dom.sessionNameInput.focus();
  });

  dom.confirmSessionBtn.addEventListener('click', async () => {
    const name = dom.sessionNameInput.value.trim();
    await chrome.runtime.sendMessage({ action: 'saveSession', name });
    alert('Session saved successfully!');

    dom.sessionNameInput.value = '';
    dom.saveSessionModal.classList.add('hidden');
  });

  dom.cancelSessionBtn.addEventListener('click', () => {
    dom.sessionNameInput.value = '';
    dom.saveSessionModal.classList.add('hidden');
  });

  // Import/Export
  dom.exportBtn.addEventListener('click', async () => {
    const data = await Storage.exportData();
    const filename = `tab-collections-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(data, filename);
  });

  dom.importBtn.addEventListener('click', () => {
    dom.importFileInput.click();
  });

  dom.importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        pendingImportData = text;
      } else {
        pendingImportData = await readJSONFile(file);
      }

      dom.importModal.classList.remove('hidden');
    } catch (error) {
      alert('Failed to read file: ' + error.message);
    }

    dom.importFileInput.value = '';
  });

  dom.importMergeBtn.addEventListener('click', async () => {
    try {
      await Storage.importData(pendingImportData, 'merge');
      await loadData();
      renderCollections();
      dom.importModal.classList.add('hidden');
      alert('Import successful! Data merged with existing collections.');
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  });

  dom.importReplaceBtn.addEventListener('click', async () => {
    if (!confirm('This will REPLACE all your existing data. Are you sure?')) {
      return;
    }

    try {
      await Storage.importData(pendingImportData, 'replace');
      await loadData();
      renderCollections();
      dom.importModal.classList.add('hidden');
      alert('Import successful! All data replaced.');
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  });

  dom.cancelImportBtn.addEventListener('click', () => {
    pendingImportData = null;
    dom.importModal.classList.add('hidden');
  });

  // Edit Tab Modal
  console.log('Setting up edit tab modal handlers');
  console.log('saveEditTabBtn:', dom.saveEditTabBtn);
  console.log('cancelEditTabBtn:', dom.cancelEditTabBtn);

  if (!dom.saveEditTabBtn || !dom.cancelEditTabBtn) {
    console.error('Edit tab modal buttons not found!');
    return;
  }

  dom.saveEditTabBtn.addEventListener('click', async () => {
    console.log('Save button clicked!');
    const title = dom.editTabTitleInput.value.trim();
    const url = dom.editTabUrlInput.value.trim();

    console.log('Title:', title, 'URL:', url, 'TabId:', state.currentEditingTabId);

    if (!title || !url) {
      alert('Please provide both title and URL');
      return;
    }

    if (state.currentEditingTabId) {
      console.log('Updating tab...');
      await Storage.updateTabItem(state.currentEditingTabId, { title, url });
      await loadData();
      renderCollections();

      dom.editTabTitleInput.value = '';
      dom.editTabUrlInput.value = '';
      state.currentEditingTabId = null;
      dom.editTabModal.classList.add('hidden');
      console.log('Tab updated successfully');
    }
  });

  dom.cancelEditTabBtn.addEventListener('click', () => {
    console.log('Cancel button clicked!');
    dom.editTabTitleInput.value = '';
    dom.editTabUrlInput.value = '';
    state.currentEditingTabId = null;
    dom.editTabModal.classList.add('hidden');
  });

  // Enter key for modals
  dom.collectionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') dom.createCollectionBtn.click();
  });

  dom.sessionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') dom.confirmSessionBtn.click();
  });

  dom.editTabTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') dom.saveEditTabBtn.click();
  });

  dom.editTabUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') dom.saveEditTabBtn.click();
  });

  // Close modals on background click
  [dom.newCollectionModal, dom.saveSessionModal, dom.importModal, dom.editTabModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
}
