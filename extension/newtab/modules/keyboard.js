// Keyboard event handlers
import { state, constants } from './state.js';
import { dom } from './dom.js';
import { handleSearch, navigateSearchResults, openSearchResult } from './search.js';

export function setupKeyboardHandlers() {
  document.addEventListener('keydown', (e) => {
    // Focus search with /
    if (e.key === '/' && document.activeElement !== dom.searchInput && document.activeElement !== dom.sidebarFilterInput) {
      e.preventDefault();
      dom.searchInput.focus();
    }

    // Double shift detection
    if (e.key === 'Shift') {
      const now = Date.now();
      if (now - state.lastShiftTime < constants.DOUBLE_SHIFT_THRESHOLD) {
        dom.searchInput.focus();
        dom.searchInput.select();
        setTimeout(() => {
          if (dom.searchInput.value.trim()) {
            handleSearch(true);
          }
        }, 50);
      }
      state.lastShiftTime = now;
    }

    // Arrow key navigation in search results
    if (document.activeElement === dom.searchInput && state.searchResultsData.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSearchResults('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSearchResults('up');
      } else if (e.key === 'Enter' && state.selectedSearchIndex >= 0) {
        e.preventDefault();
        openSearchResult(state.selectedSearchIndex);
      }
    }

    // Escape to close search
    if (e.key === 'Escape') {
      dom.searchInput.value = '';
      dom.searchResults.classList.add('hidden');
      state.searchResultsData = [];
      state.selectedSearchIndex = -1;
      dom.searchInput.blur();
    }
  });

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!dom.searchInput.contains(e.target) && !dom.searchResults.contains(e.target)) {
      dom.searchResults.classList.add('hidden');
    }
  });
}
