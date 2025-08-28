/**
 * PolicyPlayBook v2.0 - Cache Service
 * @fileoverview High-performance caching system for Google Apps Script
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

/**
 * Cache service for high-performance data caching
 */
class CacheService {
  constructor() {
    this.scriptProperties = PropertiesService.getScriptProperties();
    this.userProperties = PropertiesService.getUserProperties();
    this.memoryCache = new Map();
    this.defaultTtl = CONFIG.CACHE_TTL || 3600000; // 1 hour
    this.maxMemoryCacheSize = 100; // Maximum items in memory cache
    this.keyPrefix = 'ppb_cache_'; // Cache key prefix
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {*} Cached value or null
   */
  get(key, options = {}) {
    try {
      const cacheKey = this.getCacheKey(key);
      
      // Try memory cache first (fastest)
      if (options.useMemoryCache !== false) {
        const memoryValue = this.getFromMemory(cacheKey);
        if (memoryValue !== null) {
          logDebug('Cache hit (memory)', { key });
          return memoryValue;
        }
      }
      
      // Try script properties cache
      if (options.scope !== 'user') {
        const scriptValue = this.getFromProperties(cacheKey, 'script', options.ttl);
        if (scriptValue !== null) {
          logDebug('Cache hit (script)', { key });
          
          // Store in memory cache for next time
          if (options.useMemoryCache !== false) {
            this.setToMemory(cacheKey, scriptValue, options.ttl);
          }
          
          return scriptValue;
        }
      }
      
      // Try user properties cache
      if (options.scope !== 'script') {
        const userValue = this.getFromProperties(cacheKey, 'user', options.ttl);
        if (userValue !== null) {
          logDebug('Cache hit (user)', { key });
          
          // Store in memory cache for next time
          if (options.useMemoryCache !== false) {
            this.setToMemory(cacheKey, userValue, options.ttl);
          }
          
          return userValue;
        }
      }
      
      logDebug('Cache miss', { key });
      return null;
    } catch (error) {
      logError('Cache get failed', { key, error });
      return null;
    }
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Cache options
   */
  set(key, value, ttl = null, options = {}) {
    try {
      const cacheKey = this.getCacheKey(key);
      const effectiveTtl = ttl || options.ttl || this.defaultTtl;
      
      // Store in memory cache (fastest access)
      if (options.useMemoryCache !== false) {
        this.setToMemory(cacheKey, value, effectiveTtl);
      }
      
      // Store in properties cache for persistence
      const scope = options.scope || 'script';
      this.setToProperties(cacheKey, value, effectiveTtl, scope);
      
      logDebug('Cache set', { key, ttl: effectiveTtl, scope });
    } catch (error) {
      logError('Cache set failed', { key, error });
    }
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   */
  delete(key, options = {}) {
    try {
      const cacheKey = this.getCacheKey(key);
      
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from properties cache
      if (options.scope !== 'user') {
        this.scriptProperties.deleteProperty(cacheKey);
      }
      
      if (options.scope !== 'script') {
        this.userProperties.deleteProperty(cacheKey);
      }
      
      logDebug('Cache delete', { key });
    } catch (error) {
      logError('Cache delete failed', { key, error });
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {boolean} True if key exists
   */
  has(key, options = {}) {
    return this.get(key, { ...options, returnExpired: false }) !== null;
  }

  /**
   * Clear all cache entries
   * @param {Object} options - Clear options
   */
  clear(options = {}) {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear properties cache
      if (options.scope !== 'user') {
        this.clearPropertiesCache('script');
      }
      
      if (options.scope !== 'script') {
        this.clearPropertiesCache('user');
      }
      
      logInfo('Cache cleared', { scope: options.scope || 'all' });
    } catch (error) {
      logError('Cache clear failed', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        memoryCache: {
          size: this.memoryCache.size,
          maxSize: this.maxMemoryCacheSize,
          keys: Array.from(this.memoryCache.keys()).map(key => key.replace(this.keyPrefix, ''))
        },
        propertiesCache: {
          script: this.getPropertiesCacheInfo('script'),
          user: this.getPropertiesCacheInfo('user')
        }
      };
      
      return stats;
    } catch (error) {
      logError('Failed to get cache stats', error);
      return { error: error.message };
    }
  }

  /**
   * Cleanup expired cache entries
   * @param {Object} options - Cleanup options
   */
  cleanup(options = {}) {
    try {
      const cleaned = {
        memory: 0,
        script: 0,
        user: 0
      };
      
      // Cleanup memory cache
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt && entry.expiresAt <= now) {
          this.memoryCache.delete(key);
          cleaned.memory++;
        }
      }
      
      // Cleanup properties cache
      if (options.scope !== 'user') {
        cleaned.script = this.cleanupPropertiesCache('script');
      }
      
      if (options.scope !== 'script') {
        cleaned.user = this.cleanupPropertiesCache('user');
      }
      
      logInfo('Cache cleanup completed', cleaned);
      return cleaned;
    } catch (error) {
      logError('Cache cleanup failed', error);
      return { error: error.message };
    }
  }

  /**
   * Get cache key with prefix
   * @param {string} key - Original key
   * @returns {string} Prefixed cache key
   */
  getCacheKey(key) {
    return this.keyPrefix + key;
  }

  /**
   * Get value from memory cache
   * @param {string} cacheKey - Cache key
   * @returns {*} Cached value or null
   */
  getFromMemory(cacheKey) {
    const entry = this.memoryCache.get(cacheKey);
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(cacheKey);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set value to memory cache
   * @param {string} cacheKey - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live
   */
  setToMemory(cacheKey, value, ttl) {
    // Enforce cache size limit
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    
    const entry = {
      value: value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null
    };
    
    this.memoryCache.set(cacheKey, entry);
  }

  /**
   * Get value from properties cache
   * @param {string} cacheKey - Cache key
   * @param {string} scope - Cache scope (script/user)
   * @param {number} ttl - Expected TTL
   * @returns {*} Cached value or null
   */
  getFromProperties(cacheKey, scope, ttl) {
    try {
      const properties = scope === 'script' ? this.scriptProperties : this.userProperties;
      const cached = properties.getProperty(cacheKey);
      
      if (!cached) return null;
      
      const entry = JSON.parse(cached);
      
      // Check expiration
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        properties.deleteProperty(cacheKey);
        return null;
      }
      
      return entry.value;
    } catch (error) {
      logWarning('Properties cache get failed', { cacheKey, scope, error });
      return null;
    }
  }

  /**
   * Set value to properties cache
   * @param {string} cacheKey - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live
   * @param {string} scope - Cache scope
   */
  setToProperties(cacheKey, value, ttl, scope) {
    try {
      const properties = scope === 'script' ? this.scriptProperties : this.userProperties;
      
      const entry = {
        value: value,
        createdAt: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : null
      };
      
      const serialized = JSON.stringify(entry);
      
      // Check if serialized data is too large (Properties limit is ~9KB per property)
      if (serialized.length > 8000) {
        logWarning('Cache entry too large for properties storage', { 
          cacheKey, 
          size: serialized.length 
        });
        return;
      }
      
      properties.setProperty(cacheKey, serialized);
    } catch (error) {
      logWarning('Properties cache set failed', { cacheKey, scope, error });
    }
  }

  /**
   * Clear properties cache
   * @param {string} scope - Cache scope
   */
  clearPropertiesCache(scope) {
    try {
      const properties = scope === 'script' ? this.scriptProperties : this.userProperties;
      const allProperties = properties.getProperties();
      
      for (const key of Object.keys(allProperties)) {
        if (key.startsWith(this.keyPrefix)) {
          properties.deleteProperty(key);
        }
      }
    } catch (error) {
      logError('Properties cache clear failed', { scope, error });
    }
  }

  /**
   * Get properties cache information
   * @param {string} scope - Cache scope
   * @returns {Object} Cache information
   */
  getPropertiesCacheInfo(scope) {
    try {
      const properties = scope === 'script' ? this.scriptProperties : this.userProperties;
      const allProperties = properties.getProperties();
      
      const cacheKeys = Object.keys(allProperties).filter(key => key.startsWith(this.keyPrefix));
      let totalSize = 0;
      let expiredCount = 0;
      const now = Date.now();
      
      for (const key of cacheKeys) {
        const value = allProperties[key];
        totalSize += value.length;
        
        try {
          const entry = JSON.parse(value);
          if (entry.expiresAt && entry.expiresAt <= now) {
            expiredCount++;
          }
        } catch {
          // Invalid JSON, count as expired
          expiredCount++;
        }
      }
      
      return {
        keyCount: cacheKeys.length,
        totalSize: totalSize,
        expiredCount: expiredCount,
        keys: cacheKeys.map(key => key.replace(this.keyPrefix, '')).slice(0, 10) // First 10 keys
      };
    } catch (error) {
      logError('Failed to get properties cache info', { scope, error });
      return { error: error.message };
    }
  }

  /**
   * Cleanup expired entries in properties cache
   * @param {string} scope - Cache scope
   * @returns {number} Number of cleaned entries
   */
  cleanupPropertiesCache(scope) {
    try {
      const properties = scope === 'script' ? this.scriptProperties : this.userProperties;
      const allProperties = properties.getProperties();
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, value] of Object.entries(allProperties)) {
        if (!key.startsWith(this.keyPrefix)) continue;
        
        try {
          const entry = JSON.parse(value);
          if (entry.expiresAt && entry.expiresAt <= now) {
            properties.deleteProperty(key);
            cleaned++;
          }
        } catch {
          // Invalid JSON, remove it
          properties.deleteProperty(key);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (error) {
      logError('Properties cache cleanup failed', { scope, error });
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} factory - Function to generate value if not cached
   * @param {number} ttl - Time to live
   * @param {Object} options - Cache options
   * @returns {*} Cached or generated value
   */
  async getOrSet(key, factory, ttl = null, options = {}) {
    try {
      // Try to get from cache first
      let value = this.get(key, options);
      
      if (value === null) {
        // Not in cache, generate value
        value = await factory();
        
        // Store in cache
        if (value !== null && value !== undefined) {
          this.set(key, value, ttl, options);
        }
      }
      
      return value;
    } catch (error) {
      logError('Cache getOrSet failed', { key, error });
      
      // Fallback to factory function
      try {
        return await factory();
      } catch (factoryError) {
        logError('Factory function failed', { key, error: factoryError });
        throw factoryError;
      }
    }
  }

  /**
   * Cache with tags for bulk invalidation
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Array} tags - Tags for bulk invalidation
   * @param {number} ttl - Time to live
   * @param {Object} options - Cache options
   */
  setWithTags(key, value, tags = [], ttl = null, options = {}) {
    // Store the main cache entry
    this.set(key, value, ttl, options);
    
    // Store tag mappings
    for (const tag of tags) {
      const tagKey = `tag_${tag}`;
      let taggedKeys = this.get(tagKey, { useMemoryCache: false }) || [];
      
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        this.set(tagKey, taggedKeys, ttl * 2, { useMemoryCache: false }); // Tags live longer
      }
    }
  }

  /**
   * Invalidate cache entries by tag
   * @param {string} tag - Tag to invalidate
   */
  invalidateByTag(tag) {
    try {
      const tagKey = `tag_${tag}`;
      const taggedKeys = this.get(tagKey, { useMemoryCache: false }) || [];
      
      for (const key of taggedKeys) {
        this.delete(key);
      }
      
      // Remove the tag mapping
      this.delete(tagKey);
      
      logInfo('Cache invalidated by tag', { tag, keyCount: taggedKeys.length });
    } catch (error) {
      logError('Cache tag invalidation failed', { tag, error });
    }
  }
}

/**
 * Get cache service instance
 * @returns {CacheService} Cache service instance
 */
function getCacheService() {
  return new CacheService();
}

/**
 * Clear all cache (convenience function)
 */
function clearAllCache() {
  const cacheService = new CacheService();
  cacheService.clear();
  logInfo('All cache cleared by user', { user: Session.getActiveUser().getEmail() });
}

/**
 * Cleanup expired cache entries (convenience function)
 */
function cleanupExpiredCache() {
  const cacheService = new CacheService();
  return cacheService.cleanup();
}

/**
 * Get cache statistics (convenience function)
 */
function getCacheStatistics() {
  const cacheService = new CacheService();
  return cacheService.getStats();
}