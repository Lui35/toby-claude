// Storage utility for managing collections and tabs in chrome.storage.local
// New structure: Collections store tabIds[], TabItems stored separately

import { canonicalizeUrl } from './helpers.js';

export const StorageKeys = {
  COLLECTIONS: 'collections',
  TAB_ITEMS: 'tabItems',
  SESSIONS: 'sessions',
  SETTINGS: 'settings'
};

export const Storage = {
  /**
   * Get collections from storage
   * @returns {Promise<Array>}
   */
  async getCollections() {
    const result = await chrome.storage.local.get(StorageKeys.COLLECTIONS);
    return result[StorageKeys.COLLECTIONS] || [];
  },

  /**
   * Save collections to storage
   * @param {Array} collections
   */
  async setCollections(collections) {
    await chrome.storage.local.set({ [StorageKeys.COLLECTIONS]: collections });
  },

  /**
   * Get all tab items
   * @returns {Promise<Object>} Map of tabId -> TabItem
   */
  async getTabItems() {
    const result = await chrome.storage.local.get(StorageKeys.TAB_ITEMS);
    return result[StorageKeys.TAB_ITEMS] || {};
  },

  /**
   * Save tab items
   * @param {Object} tabItems
   */
  async setTabItems(tabItems) {
    await chrome.storage.local.set({ [StorageKeys.TAB_ITEMS]: tabItems });
  },

  /**
   * Get a single tab item
   * @param {string} tabId
   * @returns {Promise<Object|null>}
   */
  async getTabItem(tabId) {
    const tabItems = await this.getTabItems();
    return tabItems[tabId] || null;
  },

  /**
   * Add or update a tab item
   * @param {Object} tab
   * @returns {Promise<string>} tabId
   */
  async setTabItem(tab) {
    const tabItems = await this.getTabItems();
    tabItems[tab.id] = tab;
    await this.setTabItems(tabItems);
    return tab.id;
  },

  /**
   * Delete a tab item
   * @param {string} tabId
   */
  async deleteTabItem(tabId) {
    const tabItems = await this.getTabItems();
    delete tabItems[tabId];
    await this.setTabItems(tabItems);
  },

  /**
   * Add a new collection
   * @param {Object} collection
   */
  async addCollection(collection) {
    const collections = await this.getCollections();
    collections.push(collection);
    await this.setCollections(collections);
  },

  /**
   * Update a collection
   * @param {string} collectionId
   * @param {Object} updates
   */
  async updateCollection(collectionId, updates) {
    const collections = await this.getCollections();
    const index = collections.findIndex(c => c.id === collectionId);
    if (index !== -1) {
      collections[index] = { ...collections[index], ...updates };
      await this.setCollections(collections);
    }
  },

  /**
   * Delete a collection
   * @param {string} collectionId
   */
  async deleteCollection(collectionId) {
    const collections = await this.getCollections();
    const filtered = collections.filter(c => c.id !== collectionId);
    await this.setCollections(filtered);
  },

  /**
   * Reorder collections
   * @param {string} collectionId
   * @param {number} newIndex
   */
  async reorderCollection(collectionId, newIndex) {
    const collections = await this.getCollections();
    const oldIndex = collections.findIndex(c => c.id === collectionId);
    if (oldIndex !== -1) {
      const [collection] = collections.splice(oldIndex, 1);
      collections.splice(newIndex, 0, collection);
      await this.setCollections(collections);
    }
  },

  /**
   * Add tab to collection with deduplication
   * @param {string} collectionId
   * @param {Object} tab
   */
  async addTabToCollection(collectionId, tab) {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (collection) {
      const tabItems = await this.getTabItems();
      const canonicalUrl = canonicalizeUrl(tab.url);

      // Check for duplicates using canonical URL
      const existingTabId = collection.tabIds?.find(tabId => {
        const existingTab = tabItems[tabId];
        return existingTab && canonicalizeUrl(existingTab.url) === canonicalUrl;
      });

      if (!existingTabId) {
        // Add tab item
        await this.setTabItem(tab);

        // Add tab ID to collection
        if (!collection.tabIds) collection.tabIds = [];
        collection.tabIds.push(tab.id);

        await this.setCollections(collections);
      }
    }
  },

  /**
   * Remove tab from collection
   * @param {string} collectionId
   * @param {string} tabId
   */
  async removeTabFromCollection(collectionId, tabId) {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (collection && collection.tabIds) {
      collection.tabIds = collection.tabIds.filter(id => id !== tabId);
      await this.setCollections(collections);

      // Check if tab is used in other collections
      const isUsedElsewhere = collections.some(c =>
        c.id !== collectionId && c.tabIds?.includes(tabId)
      );

      // If not used elsewhere, delete the tab item
      if (!isUsedElsewhere) {
        await this.deleteTabItem(tabId);
      }
    }
  },

  /**
   * Move tab to different collection
   * @param {string} fromCollectionId
   * @param {string} toCollectionId
   * @param {string} tabId
   * @param {number} toIndex
   */
  async moveTabBetweenCollections(fromCollectionId, toCollectionId, tabId, toIndex = -1) {
    const collections = await this.getCollections();
    const fromCollection = collections.find(c => c.id === fromCollectionId);
    const toCollection = collections.find(c => c.id === toCollectionId);

    if (fromCollection && toCollection && fromCollection.tabIds) {
      // Remove from source
      fromCollection.tabIds = fromCollection.tabIds.filter(id => id !== tabId);

      // Add to destination
      if (!toCollection.tabIds) toCollection.tabIds = [];
      if (toIndex >= 0 && toIndex < toCollection.tabIds.length) {
        toCollection.tabIds.splice(toIndex, 0, tabId);
      } else {
        toCollection.tabIds.push(tabId);
      }

      await this.setCollections(collections);
    }
  },

  /**
   * Reorder tab within collection
   * @param {string} collectionId
   * @param {string} tabId
   * @param {number} newIndex
   */
  async reorderTabInCollection(collectionId, tabId, newIndex) {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (collection && collection.tabIds) {
      const oldIndex = collection.tabIds.indexOf(tabId);
      if (oldIndex !== -1) {
        collection.tabIds.splice(oldIndex, 1);
        collection.tabIds.splice(newIndex, 0, tabId);
        await this.setCollections(collections);
      }
    }
  },

  /**
   * Get tabs for a collection
   * @param {string} collectionId
   * @returns {Promise<Array>}
   */
  async getCollectionTabs(collectionId) {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection || !collection.tabIds) return [];

    const tabItems = await this.getTabItems();
    return collection.tabIds
      .map(tabId => tabItems[tabId])
      .filter(tab => tab); // Filter out any missing tabs
  },

  /**
   * Get all sessions
   * @returns {Promise<Array>}
   */
  async getSessions() {
    const result = await chrome.storage.local.get(StorageKeys.SESSIONS);
    return result[StorageKeys.SESSIONS] || [];
  },

  /**
   * Save sessions
   * @param {Array} sessions
   */
  async setSessions(sessions) {
    await chrome.storage.local.set({ [StorageKeys.SESSIONS]: sessions });
  },

  /**
   * Add a new session
   * @param {Object} session
   */
  async addSession(session) {
    const sessions = await this.getSessions();
    sessions.push(session);
    await this.setSessions(sessions);
  },

  /**
   * Delete a session
   * @param {string} sessionId
   */
  async deleteSession(sessionId) {
    const sessions = await this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await this.setSessions(filtered);
  },

  /**
   * Clear all data
   */
  async clearAll() {
    await chrome.storage.local.clear();
  },

  /**
   * Export all data in new format
   * @returns {Promise<Object>}
   */
  async exportData() {
    const collections = await this.getCollections();
    const tabItems = await this.getTabItems();
    const sessions = await this.getSessions();
    const settings = await chrome.storage.local.get(StorageKeys.SETTINGS);

    return {
      version: '2.0',
      exportedAt: Date.now(),
      collections,
      tabItems,
      sessions,
      settings: settings[StorageKeys.SETTINGS] || {}
    };
  },

  /**
   * Import data - handles multiple formats
   * @param {Array|Object|string} data
   * @param {string} mode - 'merge' or 'replace'
   */
  async importData(data, mode = 'merge') {
    // Handle string input (URLs)
    if (typeof data === 'string') {
      await this.importUrls(data);
      return;
    }

    // Handle array of URLs
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
      await this.importUrls(data.join('\n'));
      return;
    }

    // Handle Toby format (array of collections with items)
    if (Array.isArray(data) && data.length > 0 && data[0].items) {
      await this.importTobyFormat(data, mode);
      return;
    }

    // Handle new export format
    if (data.version && data.collections && data.tabItems) {
      await this.importNewFormat(data, mode);
      return;
    }

    // Handle old format (collections with embedded items)
    if (data.collections && Array.isArray(data.collections)) {
      await this.importOldFormat(data, mode);
      return;
    }

    throw new Error('Unrecognized import format');
  },

  /**
   * Import URLs (newline or array)
   * @param {string} urlString
   */
  async importUrls(urlString) {
    const urls = urlString.split('\n').map(u => u.trim()).filter(u => u);
    const { generateId, getFaviconUrl } = await import('./helpers.js');

    const collection = {
      id: generateId(),
      name: `Imported ${new Date().toLocaleDateString()}`,
      description: '',
      tabIds: [],
      collapsed: false
    };

    const tabItems = await this.getTabItems();

    for (const url of urls) {
      try {
        new URL(url); // Validate URL
        const tabId = generateId();
        const tab = {
          id: tabId,
          url,
          title: url,
          faviconUrl: getFaviconUrl(url),
          createdAt: Date.now()
        };

        tabItems[tabId] = tab;
        collection.tabIds.push(tabId);
      } catch (e) {
        console.warn('Invalid URL skipped:', url);
      }
    }

    await this.setTabItems(tabItems);
    await this.addCollection(collection);
  },

  /**
   * Import Toby format
   * @param {Array} tobyCollections
   * @param {string} mode
   */
  async importTobyFormat(tobyCollections, mode) {
    const { generateId } = await import('./helpers.js');

    let collections = mode === 'replace' ? [] : await this.getCollections();
    let tabItems = mode === 'replace' ? {} : await this.getTabItems();

    for (const tobyCol of tobyCollections) {
      const collection = {
        id: tobyCol.id || generateId(),
        name: tobyCol.name,
        description: tobyCol.description || '',
        tabIds: [],
        collapsed: false
      };

      if (tobyCol.items) {
        for (const item of tobyCol.items) {
          const tabId = item.id || generateId();
          const tab = {
            id: tabId,
            url: item.url,
            title: item.title || item.description || item.url,
            faviconUrl: item.favicon || item.faviconUrl,
            createdAt: item.createdAt || Date.now(),
            notes: item.notes,
            tags: item.tags || []
          };

          tabItems[tabId] = tab;
          collection.tabIds.push(tabId);
        }
      }

      collections.push(collection);
    }

    await this.setCollections(collections);
    await this.setTabItems(tabItems);
  },

  /**
   * Import new export format
   * @param {Object} data
   * @param {string} mode
   */
  async importNewFormat(data, mode) {
    if (mode === 'replace') {
      await this.setCollections(data.collections || []);
      await this.setTabItems(data.tabItems || {});
      if (data.sessions) await this.setSessions(data.sessions);
      if (data.settings) await chrome.storage.local.set({ [StorageKeys.SETTINGS]: data.settings });
    } else {
      // Merge mode
      const existingCollections = await this.getCollections();
      const existingTabItems = await this.getTabItems();

      await this.setCollections([...existingCollections, ...(data.collections || [])]);
      await this.setTabItems({ ...existingTabItems, ...(data.tabItems || {}) });

      if (data.sessions) {
        const existingSessions = await this.getSessions();
        await this.setSessions([...existingSessions, ...data.sessions]);
      }
    }
  },

  /**
   * Import old format (collections with embedded items)
   * @param {Object} data
   * @param {string} mode
   */
  async importOldFormat(data, mode) {
    // Convert old format to new format
    await this.importTobyFormat(data.collections, mode);

    if (data.sessions) {
      if (mode === 'replace') {
        await this.setSessions(data.sessions);
      } else {
        const existingSessions = await this.getSessions();
        await this.setSessions([...existingSessions, ...data.sessions]);
      }
    }
  }
};
