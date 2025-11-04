// DOM element references - using getters to ensure elements are accessed after DOM is loaded
export const dom = {
  // Main elements
  get themeToggle() { return document.getElementById('themeToggle'); },
  get searchInput() { return document.getElementById('searchInput'); },
  get searchResults() { return document.getElementById('searchResults'); },
  get collectionsList() { return document.getElementById('collectionsList'); },

  // Buttons
  get newCollectionBtn() { return document.getElementById('newCollectionBtn'); },
  get saveSessionBtn() { return document.getElementById('saveSessionBtn'); },
  get exportBtn() { return document.getElementById('exportBtn'); },
  get importBtn() { return document.getElementById('importBtn'); },
  get importFileInput() { return document.getElementById('importFileInput'); },

  // Sidebar
  get openTabsList() { return document.getElementById('openTabsList'); },
  get openTabsCount() { return document.getElementById('openTabsCount'); },
  get sidebarFilterInput() { return document.getElementById('sidebarFilterInput'); },

  // New Collection Modal
  get newCollectionModal() { return document.getElementById('newCollectionModal'); },
  get collectionNameInput() { return document.getElementById('collectionNameInput'); },
  get collectionDescInput() { return document.getElementById('collectionDescInput'); },
  get createCollectionBtn() { return document.getElementById('createCollectionBtn'); },
  get cancelCollectionBtn() { return document.getElementById('cancelCollectionBtn'); },

  // Save Session Modal
  get saveSessionModal() { return document.getElementById('saveSessionModal'); },
  get sessionNameInput() { return document.getElementById('sessionNameInput'); },
  get confirmSessionBtn() { return document.getElementById('confirmSessionBtn'); },
  get cancelSessionBtn() { return document.getElementById('cancelSessionBtn'); },

  // Import Modal
  get importModal() { return document.getElementById('importModal'); },
  get importMergeBtn() { return document.getElementById('importMergeBtn'); },
  get importReplaceBtn() { return document.getElementById('importReplaceBtn'); },
  get cancelImportBtn() { return document.getElementById('cancelImportBtn'); },

  // Edit Tab Modal
  get editTabModal() { return document.getElementById('editTabModal'); },
  get editTabTitleInput() { return document.getElementById('editTabTitleInput'); },
  get editTabUrlInput() { return document.getElementById('editTabUrlInput'); },
  get saveEditTabBtn() { return document.getElementById('saveEditTabBtn'); },
  get cancelEditTabBtn() { return document.getElementById('cancelEditTabBtn'); }
};
