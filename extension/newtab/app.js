// Main application entry point
import { state } from './modules/state.js';
import { dom } from './modules/dom.js';
import { loadTheme, toggleTheme } from './modules/theme.js';
import { loadData } from './modules/dataLoader.js';
import { renderCollections } from './modules/collections.js';
import { loadOpenTabs, renderOpenTabs } from './modules/sidebar.js';
import { handleSearch } from './modules/search.js';
import { setupModalHandlers } from './modules/modals.js';
import { setupKeyboardHandlers } from './modules/keyboard.js';

// Initialize application
async function init() {
  console.log('Initializing Tab Collections app...');

  // Load theme
  loadTheme();

  // Load data
  await loadData();
  await loadOpenTabs();

  // Render UI
  renderCollections();
  renderOpenTabs();

  // Setup event handlers
  setupEventListeners();

  console.log('Tab Collections app initialized successfully');
}

function setupEventListeners() {
  // Theme toggle
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Search input
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(handleSearch, 200);
  });

  // Sidebar filter
  dom.sidebarFilterInput.addEventListener('input', renderOpenTabs);

  // Keyboard shortcuts
  setupKeyboardHandlers();

  // Modal handlers
  setupModalHandlers();

  // Reload open tabs periodically
  setInterval(async () => {
    await loadOpenTabs();
    renderOpenTabs();
  }, 3000);
}

// Start the application
init();
