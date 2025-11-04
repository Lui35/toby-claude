// Global state management
export const state = {
  collections: [],
  tabItems: {},
  sessions: [],
  openTabs: [],
  searchTimeout: null,
  searchResultsData: [],
  selectedSearchIndex: -1,
  lastShiftTime: 0,
  draggedElement: null,
  draggedType: null,
  draggedData: null,
  currentEditingTabId: null
};

export const constants = {
  DOUBLE_SHIFT_THRESHOLD: 300 // ms
};
