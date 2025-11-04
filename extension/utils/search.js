// Search functionality with improved fuzzy/noisy matching

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * @param {string} a
 * @param {string} b
 * @returns {number} Minimum number of edits needed
 */
function levenshteinDistance(a, b) {
  const alen = a.length;
  const blen = b.length;

  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const matrix = Array(blen + 1).fill(null).map(() => Array(alen + 1).fill(0));

  for (let i = 0; i <= alen; i++) matrix[0][i] = i;
  for (let j = 0; j <= blen; j++) matrix[j][0] = j;

  for (let j = 1; j <= blen; j++) {
    for (let i = 1; i <= alen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost  // substitution
      );
    }
  }

  return matrix[blen][alen];
}

/**
 * Improved fuzzy search with typo tolerance
 * @param {string} needle
 * @param {string} haystack
 * @returns {number} Score (higher is better, -1 if no match)
 */
function fuzzyMatch(needle, haystack) {
  if (!needle || !haystack) return -1;

  const hlen = haystack.length;
  const nlen = needle.length;

  if (nlen > hlen) return -1;

  const lowerNeedle = needle.toLowerCase();
  const lowerHaystack = haystack.toLowerCase();

  // Exact match gets highest score
  if (lowerHaystack.includes(lowerNeedle)) {
    const index = lowerHaystack.indexOf(lowerNeedle);
    // Earlier matches score higher
    return 1000 - index + (hlen - nlen);
  }

  // Sequential character matching with position tracking
  let score = 0;
  let nIdx = 0;
  let prevIdx = -1;
  let consecutiveMatches = 0;

  for (let hIdx = 0; hIdx < hlen; hIdx++) {
    if (lowerHaystack[hIdx] === lowerNeedle[nIdx]) {
      // Consecutive character bonus (word continuity)
      if (prevIdx === hIdx - 1) {
        consecutiveMatches++;
        score += 5 + consecutiveMatches; // Increasing bonus for longer sequences
      } else {
        consecutiveMatches = 0;
        score += 2;
      }

      // Bonus for matching at word boundaries
      if (hIdx === 0 || lowerHaystack[hIdx - 1] === ' ' || lowerHaystack[hIdx - 1] === '-') {
        score += 10;
      }

      prevIdx = hIdx;
      nIdx++;

      if (nIdx === nlen) {
        // Bonus for early completion
        score += Math.max(0, (hlen - hIdx) / 2);

        // Check for typo tolerance using edit distance on matched substring
        const matchedPortion = lowerHaystack.substring(prevIdx - nlen + 1, prevIdx + 1);
        const editDist = levenshteinDistance(lowerNeedle, matchedPortion);

        // Allow up to 2 typos for longer queries
        if (editDist <= Math.max(1, Math.floor(nlen / 4))) {
          score += 50 - (editDist * 10);
        }

        return score;
      }
    }
  }

  // Didn't match all characters - check for close match with typos
  if (nIdx >= nlen * 0.7) { // Matched at least 70% of characters
    // Calculate edit distance for partial match tolerance
    const bestSubstring = findBestSubstring(lowerHaystack, lowerNeedle);
    if (bestSubstring.score > 0) {
      return bestSubstring.score * 0.5; // Penalty for partial match
    }
  }

  return nIdx === nlen ? score : -1;
}

/**
 * Find best matching substring using sliding window
 * @param {string} haystack
 * @param {string} needle
 * @returns {object} Best match info
 */
function findBestSubstring(haystack, needle) {
  const nlen = needle.length;
  let bestScore = -1;
  let bestDistance = Infinity;

  // Allow window to be slightly larger to catch typos
  const windowSize = Math.ceil(nlen * 1.3);

  for (let i = 0; i <= haystack.length - nlen; i++) {
    const window = haystack.substring(i, Math.min(i + windowSize, haystack.length));
    const distance = levenshteinDistance(needle, window.substring(0, nlen));

    // Allow up to 2 character differences
    if (distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestScore = 100 - (distance * 25); // Score decreases with edit distance
    }
  }

  return { score: bestScore, distance: bestDistance };
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
