// Search functionality
import { state } from './state.js';
import { dom } from './dom.js';
import { searchTabs } from '../../utils/search.js';
import { escapeHtml, getHostname } from '../../utils/helpers.js';

export function handleSearch(autoSelectFirst = true) {
  const query = dom.searchInput.value.trim();

  if (!query) {
    dom.searchResults.classList.add('hidden');
    state.searchResultsData = [];
    state.selectedSearchIndex = -1;
    return;
  }

  const results = searchTabs(query, state.collections, state.tabItems);
  state.searchResultsData = results;

  if (results.length === 0) {
    dom.searchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No results found</div>';
    dom.searchResults.classList.remove('hidden');
    state.selectedSearchIndex = -1;
    return;
  }

  state.selectedSearchIndex = autoSelectFirst && results.length > 0 ? 0 : -1;
  renderSearchResults();
}

export function renderSearchResults() {
  dom.searchResults.innerHTML = state.searchResultsData.map((result, index) => `
    <div class="search-result-item ${index === state.selectedSearchIndex ? 'selected' : ''}"
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

  dom.searchResults.classList.remove('hidden');

  if (state.selectedSearchIndex >= 0) {
    const selectedElement = dom.searchResults.querySelector('.search-result-item.selected');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  document.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      openSearchResult(parseInt(el.dataset.index));
    });
  });
}

export async function openSearchResult(index) {
  if (index < 0 || index >= state.searchResultsData.length) return;

  const result = state.searchResultsData[index];

  try {
    await chrome.tabs.create({ url: result.url, active: true });
  } catch (error) {
    console.error('Error opening tab:', error);
  }

  dom.searchInput.value = '';
  dom.searchResults.classList.add('hidden');
  state.searchResultsData = [];
  state.selectedSearchIndex = -1;
}

export function navigateSearchResults(direction) {
  if (state.searchResultsData.length === 0) return;

  if (state.selectedSearchIndex === -1 && direction === 'down') {
    state.selectedSearchIndex = 0;
  } else if (state.selectedSearchIndex === -1 && direction === 'up') {
    state.selectedSearchIndex = state.searchResultsData.length - 1;
  } else if (direction === 'down') {
    state.selectedSearchIndex = Math.min(state.selectedSearchIndex + 1, state.searchResultsData.length - 1);
  } else if (direction === 'up') {
    state.selectedSearchIndex = Math.max(state.selectedSearchIndex - 1, 0);
  }

  renderSearchResults();
}
