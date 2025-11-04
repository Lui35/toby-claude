// Drag and drop handlers
import { state } from './state.js';
import { dom } from './dom.js';
import { Storage } from '../../utils/storage.js';
import { loadData } from './dataLoader.js';
import { renderCollections } from './collections.js';

export function setupCollectionDragAndDrop() {
  // Collection header drag (for reordering collections)
  document.querySelectorAll('.collection-header').forEach(header => {
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.collection-actions') || e.target.closest('.collection-title')) {
        return;
      }
      const card = header.closest('.collection-card');
      card.draggable = true;
    });

    header.parentElement.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.collection-card');
      if (card && card.draggable) {
        state.draggedElement = card;
        state.draggedType = 'collection';
        state.draggedData = {
          collectionId: card.dataset.collectionId,
          index: parseInt(card.dataset.collectionIndex)
        };
        card.classList.add('dragging');
      }
    });

    header.parentElement.addEventListener('dragend', (e) => {
      const card = e.target.closest('.collection-card');
      if (card) {
        card.classList.remove('dragging');
        card.draggable = false;
        state.draggedElement = null;
        state.draggedType = null;
        state.draggedData = null;
      }
    });
  });

  // Collection card as drop target (for reordering)
  document.querySelectorAll('.collection-card').forEach(card => {
    card.addEventListener('dragover', (e) => {
      if (state.draggedType === 'collection' && state.draggedElement !== card) {
        e.preventDefault();
        const afterElement = getDragAfterElement(dom.collectionsList, e.clientY);
        if (afterElement == null) {
          dom.collectionsList.appendChild(state.draggedElement);
        } else {
          dom.collectionsList.insertBefore(state.draggedElement, afterElement);
        }
      }
    });
  });

  // Drop handler for entire collections list
  dom.collectionsList.addEventListener('drop', async (e) => {
    if (state.draggedType === 'collection') {
      e.preventDefault();
      const newIndex = Array.from(dom.collectionsList.children).indexOf(state.draggedElement);
      await Storage.reorderCollection(state.draggedData.collectionId, newIndex);
      await loadData();
      renderCollections();
    }
  });

  dom.collectionsList.addEventListener('dragover', (e) => {
    if (state.draggedType === 'collection') {
      e.preventDefault();
    }
  });

  // Tab cell drag
  document.querySelectorAll('.tab-cell').forEach(cell => {
    cell.addEventListener('dragstart', (e) => {
      state.draggedElement = cell;
      state.draggedType = 'collection-tab';
      state.draggedData = {
        collectionId: cell.dataset.collectionId,
        tabId: cell.dataset.tabId,
        tabIndex: parseInt(cell.dataset.tabIndex)
      };
      cell.classList.add('dragging');
    });

    cell.addEventListener('dragend', () => {
      cell.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      state.draggedElement = null;
      state.draggedType = null;
      state.draggedData = null;
    });

    // Allow tab cells to be drop targets for reordering
    cell.addEventListener('dragover', (e) => {
      if (state.draggedType === 'collection-tab' && state.draggedElement !== cell) {
        const targetCollectionId = cell.dataset.collectionId;
        const draggedCollectionId = state.draggedData.collectionId;

        if (targetCollectionId === draggedCollectionId) {
          e.preventDefault();
          cell.classList.add('drag-over');
        }
      }
    });

    cell.addEventListener('dragleave', (e) => {
      if (!cell.contains(e.relatedTarget)) {
        cell.classList.remove('drag-over');
      }
    });

    cell.addEventListener('drop', async (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');

      if (state.draggedType === 'collection-tab') {
        const targetCollectionId = cell.dataset.collectionId;
        const targetTabIndex = parseInt(cell.dataset.tabIndex);

        if (state.draggedData.collectionId === targetCollectionId) {
          await Storage.reorderTabInCollection(
            targetCollectionId,
            state.draggedData.tabId,
            targetTabIndex
          );
          await loadData();
          renderCollections();
        }
      }
    });
  });

  // Collection body as drop target (for tabs)
  document.querySelectorAll('.collection-body').forEach(body => {
    body.addEventListener('dragover', (e) => {
      if (state.draggedType === 'sidebar-tab' || state.draggedType === 'collection-tab') {
        e.preventDefault();
        const card = body.closest('.collection-card');
        card.classList.add('drag-over');
      }
    });

    body.addEventListener('dragleave', (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        const card = body.closest('.collection-card');
        card.classList.remove('drag-over');
      }
    });

    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      const targetCollectionId = body.dataset.collectionId;
      const card = body.closest('.collection-card');
      card.classList.remove('drag-over');

      if (state.draggedType === 'sidebar-tab') {
        const tab = state.draggedData.tab;
        await Storage.addTabToCollection(targetCollectionId, tab);
        await loadData();
        renderCollections();
      } else if (state.draggedType === 'collection-tab') {
        if (state.draggedData.collectionId !== targetCollectionId) {
          await Storage.moveTabBetweenCollections(
            state.draggedData.collectionId,
            targetCollectionId,
            state.draggedData.tabId
          );
          await loadData();
          renderCollections();
        }
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.collection-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
