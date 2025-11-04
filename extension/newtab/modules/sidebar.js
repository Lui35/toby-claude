// Sidebar functionality
import { state } from './state.js';
import { dom } from './dom.js';
import { escapeHtml, getHostname, normalizeTab } from '../../utils/helpers.js';

export async function loadOpenTabs() {
  const tabs = await chrome.tabs.query({});
  state.openTabs = tabs.filter(tab => !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'));
  dom.openTabsCount.textContent = state.openTabs.length;
}

export function renderOpenTabs() {
  const filterText = dom.sidebarFilterInput.value.toLowerCase();
  const filtered = state.openTabs.filter(tab =>
    tab.title.toLowerCase().includes(filterText) ||
    tab.url.toLowerCase().includes(filterText)
  );

  if (filtered.length === 0) {
    dom.openTabsList.innerHTML = '<div class="empty-state"><div class="empty-state-text">No open tabs</div></div>';
    return;
  }

  dom.openTabsList.innerHTML = filtered.map(tab => `
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

export function setupSidebarDragAndDrop() {
  document.querySelectorAll('.sidebar-tab-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      const tabId = parseInt(item.dataset.tabId);
      const chromeTab = state.openTabs.find(t => t.id === tabId);

      if (chromeTab) {
        const tab = normalizeTab(chromeTab);

        state.draggedElement = item;
        state.draggedType = 'sidebar-tab';
        state.draggedData = { tab, chromeTabId: tabId };
        item.classList.add('dragging');
      }
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      state.draggedElement = null;
      state.draggedType = null;
      state.draggedData = null;
    });
  });
}
