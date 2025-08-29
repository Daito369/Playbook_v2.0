/**
 * @fileoverview Simple cache manager using PropertiesService.
 * Provides basic get/put/invalidate operations with TTL support.
 */

const Cache = {
  /**
   * Retrieves a value from cache.
   * @param {string} key - Cache key.
   * @returns {Object|null} Cached value or null if missing/expired.
   */
  get(key) {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(key);
    if (!raw) {
      return null;
    }
    try {
      const entry = JSON.parse(raw);
      if (entry.expires && Date.now() > entry.expires) {
        props.deleteProperty(key);
        return null;
      }
      return entry.data;
    } catch (err) {
      props.deleteProperty(key);
      return null;
    }
  },

  /**
   * Stores a value in cache.
   * @param {string} key - Cache key.
   * @param {Object} value - Value to store.
   * @param {number} ttlSeconds - Time to live in seconds.
   * @returns {void}
   */
  put(key, value, ttlSeconds) {
    const props = PropertiesService.getScriptProperties();
    const entry = {
      data: value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    };
    props.setProperty(key, JSON.stringify(entry));
  },

  /**
   * Invalidates a cache entry.
   * @param {string} key - Cache key.
   * @returns {void}
   */
  invalidate(key) {
    PropertiesService.getScriptProperties().deleteProperty(key);
  },

  /**
   * Clears all cache entries.
   * @returns {void}
   */
  clear() {
    PropertiesService.getScriptProperties().deleteAllProperties();
  },
};

if (typeof module !== 'undefined') {
  module.exports = Cache;
}
