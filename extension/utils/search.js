// Search functionality with fuzzy matching

/**
 * Simple fuzzy search implementation
 * @param {string} needle
 * @param {string} haystack
 * @returns {number} Score (higher is better, -1 if no match)
 */
function fuzzyMatch(needle, haystack) {
  const hlen = haystack.length;
  const nlen = needle.length;

  if (nlen > hlen) return -1;
  if (nlen === hlen) return needle === haystack ? 1 : -1;

  const lowerNeedle = needle.toLowerCase();
  const lowerHaystack = haystack.toLowerCase();

  let score = 0;
  let nIdx = 0;
  let prevIdx = -1;

  for (let hIdx = 0; hIdx < hlen; hIdx++) {
    if (lowerHaystack[hIdx] === lowerNeedle[nIdx]) {
      // Consecutive character bonus
      if (prevIdx === hIdx - 1) {
        score += 2;
      } else {
        score += 1;
      }
      prevIdx = hIdx;
      nIdx++;
      if (nIdx === nlen) {
        // Bonus for early matches
        score += (hlen - hIdx);
        return score;
      }
    }
  }

  return nIdx === nlen ? score : -1;
}

/**
 * Search through collections and tabs
 * @param {string} query
 * @param {Array} collections
 * @param {Object} tabItems - Map of tabId -> TabItem
 * @returns {Array} Matching tabs with collection info
 */
export function searchTabs(query, collections, tabItems) {
  if (!query.trim()) return [];

  const results = [];

  collections.forEach(collection => {
    if (!collection.tabIds) return;

    collection.tabIds.forEach(tabId => {
      const tab = tabItems[tabId];
      if (!tab) return;

      const titleScore = fuzzyMatch(query, tab.title || '');
      const urlScore = fuzzyMatch(query, tab.url || '');
      const notesScore = fuzzyMatch(query, tab.notes || '');

      const maxScore = Math.max(titleScore, urlScore, notesScore);

      if (maxScore > 0) {
        results.push({
          ...tab,
          collectionId: collection.id,
          collectionName: collection.name,
          searchScore: maxScore
        });
      }
    });
  });

  // Sort by score descending
  results.sort((a, b) => b.searchScore - a.searchScore);

  return results;
}

/**
 * Search collections by name
 * @param {string} query
 * @param {Array} collections
 * @returns {Array} Matching collections
 */
export function searchCollections(query, collections) {
  if (!query.trim()) return collections;

  const results = collections
    .map(collection => ({
      ...collection,
      searchScore: fuzzyMatch(query, collection.name || '')
    }))
    .filter(c => c.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);

  return results;
}

/**
 * Filter tabs by collection
 * @param {string} collectionId
 * @param {Array} collections
 * @returns {Array}
 */
export function getTabsByCollection(collectionId, collections) {
  const collection = collections.find(c => c.id === collectionId);
  return collection ? collection.items : [];
}
