// Data loading utilities
import { state } from './state.js';
import { Storage } from '../../utils/storage.js';

export async function loadData() {
  state.collections = await Storage.getCollections();
  state.tabItems = await Storage.getTabItems();
  state.sessions = await Storage.getSessions();
}
