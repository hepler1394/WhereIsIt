/**
 * WhereIsIt — In-Memory Cache with TTL
 * Lightweight LRU-like cache for frequently accessed data
 * (chains, categories, popular searches) to reduce DB round-trips.
 */

class CacheEntry {
  constructor(value, ttlMs) {
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
    this.hits = 0;
  }

  get expired() {
    return Date.now() > this.expiresAt;
  }
}

export class MemoryCache {
  constructor({ maxSize = 500, defaultTtlMs = 5 * 60 * 1000, cleanupIntervalMs = 60 * 1000 } = {}) {
    this.store = new Map();
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };

    // Periodic cleanup of expired entries
    this._cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref(); // Don't keep process alive
  }

  /**
   * Get a cached value by key.
   * Returns null if expired or not found.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (entry.expired) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }
    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a cached value with optional custom TTL.
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    // Evict if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this._evictOne();
    }
    this.store.set(key, new CacheEntry(value, ttlMs));
    this.stats.sets++;
  }

  /**
   * Delete a specific cache entry.
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Invalidate all entries matching a prefix.
   * E.g., invalidatePrefix('store:') clears all store-related caches.
   */
  invalidatePrefix(prefix) {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all entries.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get-or-set pattern: returns cached value, or calls factory to generate & cache it.
   */
  async getOrSet(key, factory, ttlMs = this.defaultTtlMs) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const value = await factory();
    if (value !== null && value !== undefined) {
      this.set(key, value, ttlMs);
    }
    return value;
  }

  /**
   * Remove expired entries.
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Evict the least-hit entry.
   */
  _evictOne() {
    let minKey = null;
    let minHits = Infinity;
    for (const [key, entry] of this.store.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }
    if (minKey) {
      this.store.delete(minKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    return {
      ...this.stats,
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  destroy() {
    clearInterval(this._cleanupTimer);
    this.store.clear();
  }
}

// ══════════════════════════════════════════
// Singleton caches for different data types
// ══════════════════════════════════════════

/** Chain data — rarely changes, cache for 15 minutes */
export const chainCache = new MemoryCache({ maxSize: 100, defaultTtlMs: 15 * 60 * 1000 });

/** Store data — changes occasionally, cache for 5 minutes */
export const storeCache = new MemoryCache({ maxSize: 500, defaultTtlMs: 5 * 60 * 1000 });

/** Search results — changes frequently, cache for 2 minutes */
export const searchCache = new MemoryCache({ maxSize: 1000, defaultTtlMs: 2 * 60 * 1000 });

/** Category data — rarely changes, cache for 30 minutes */
export const categoryCache = new MemoryCache({ maxSize: 200, defaultTtlMs: 30 * 60 * 1000 });

/** Deals — refreshed daily, cache for 1 hour */
export const dealsCache = new MemoryCache({ maxSize: 500, defaultTtlMs: 60 * 60 * 1000 });

/** Agent inference — expensive, cache for 10 minutes */
export const agentCache = new MemoryCache({ maxSize: 200, defaultTtlMs: 10 * 60 * 1000 });
