// Collection rendering and management
import { state } from './state.js';
import { dom } from './dom.js';
import { Storage } from '../../utils/storage.js';
import { escapeHtml, getHostname } from '../../utils/helpers.js';
import { setupCollectionDragAndDrop } from './dragDrop.js';
import { setupCollectionEventListeners } from './collectionEvents.js';

export function renderCollections() {
  if (state.collections.length === 0) {
    dom.collectionsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">No collections yet</div>
        <div class="empty-state-subtext">Create a collection to organize your tabs</div>
      </div>
    `;
    return;
  }

  dom.collectionsList.innerHTML = state.collections.map((collection, collectionIndex) => {
    const tabs = (collection.tabIds || [])
      .map(tabId => state.tabItems[tabId])
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
