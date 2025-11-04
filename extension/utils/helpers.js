// Helper utilities

/**
 * Generate unique ID
 * @returns {string}
 */
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Get favicon URL for a domain
 * @param {string} url
 * @returns {string}
 */
export function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=unknown&sz=32';
  }
}

/**
 * Canonicalize URL for deduplication
 * Strips tracking params, lowercases host, removes trailing slash
 * @param {string} url
 * @returns {string}
 */
export function canonicalizeUrl(url) {
  try {
    const urlObj = new URL(url);

    // Lowercase hostname
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', '_ga', 'mc_cid', 'mc_eid'
    ];

    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    // Remove trailing slash from pathname (unless it's just "/")
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Get hostname from URL
 * @param {string} url
 * @returns {string}
 */
export function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Normalize tab data
 * @param {Object} chromeTab
 * @returns {Object}
 */
export function normalizeTab(chromeTab) {
  return {
    id: generateId(),
    url: chromeTab.url,
    title: chromeTab.title || chromeTab.url,
    favicon: chromeTab.favIconUrl || getFaviconUrl(chromeTab.url),
    description: chromeTab.title || '',
    createdAt: Date.now()
  };
}

/**
 * Format date
 * @param {number} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Download JSON file
 * @param {Object} data
 * @param {string} filename
 */
export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read JSON file
 * @param {File} file
 * @returns {Promise<Object>}
 */
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
