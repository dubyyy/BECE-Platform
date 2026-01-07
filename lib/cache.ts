// Hybrid cache: Redis for production scalability, in-memory fallback
// Supports 6,000+ concurrent users when Redis is configured

import { redisGet, redisSet, redisDel, isRedisConnected } from './redis';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory fallback cache
class InMemoryCache {
  private store: Map<string, CacheEntry<unknown>>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  getStats(): { size: number; keys: string[] } {
    this.cleanup();
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Hybrid cache that uses Redis when available
class HybridCache {
  private fallback: InMemoryCache;

  constructor() {
    this.fallback = new InMemoryCache();
  }

  // Async set - uses Redis when available
  async setAsync<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    // Always set in fallback for immediate access
    this.fallback.set(key, data, ttlMs);

    // Also set in Redis if available
    if (isRedisConnected()) {
      try {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        await redisSet(`cache:${key}`, JSON.stringify(data), ttlSeconds);
      } catch (error) {
        console.warn('[Cache] Redis set error:', error);
      }
    }
  }

  // Async get - tries Redis first, falls back to in-memory
  async getAsync<T>(key: string): Promise<T | null> {
    // Try Redis first for distributed caching
    if (isRedisConnected()) {
      try {
        const redisData = await redisGet(`cache:${key}`);
        if (redisData) {
          const parsed = JSON.parse(redisData) as T;
          // Update local cache for faster subsequent access
          this.fallback.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.warn('[Cache] Redis get error:', error);
      }
    }

    // Fallback to in-memory
    return this.fallback.get<T>(key);
  }

  // Async delete
  async deleteAsync(key: string): Promise<void> {
    this.fallback.delete(key);
    if (isRedisConnected()) {
      try {
        await redisDel(`cache:${key}`);
      } catch (error) {
        console.warn('[Cache] Redis delete error:', error);
      }
    }
  }

  // Sync methods for backwards compatibility (in-memory only)
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.fallback.set(key, data, ttlMs);
    // Fire and forget Redis set
    if (isRedisConnected()) {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      redisSet(`cache:${key}`, JSON.stringify(data), ttlSeconds).catch(() => {});
    }
  }

  get<T>(key: string): T | null {
    return this.fallback.get<T>(key);
  }

  delete(key: string): void {
    this.fallback.delete(key);
    if (isRedisConnected()) {
      redisDel(`cache:${key}`).catch(() => {});
    }
  }

  clear(): void {
    this.fallback.clear();
  }

  has(key: string): boolean {
    return this.fallback.has(key);
  }

  getStats(): { size: number; keys: string[] } {
    return this.fallback.getStats();
  }

  destroy() {
    this.fallback.destroy();
  }
}

// Global singleton instance
const globalForCache = global as unknown as { cache: HybridCache };

export const cache = globalForCache.cache || new HybridCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.cache = cache;
}

// Cache key helpers
export const CACHE_KEYS = {
  SCHOOLS_ALL: 'schools:all',
  SCHOOLS_BY_LGA: (lgaCode: string) => `schools:lga:${lgaCode}`,
  SCHOOL_BY_CODE: (lgaCode: string, schoolCode: string) => 
    `schools:${lgaCode}:${schoolCode}`,
  STATS: 'stats:all',
  LGA_STATS: 'stats:lga',
};

// Common TTL values
export const CACHE_TTL = {
  SHORT: 60 * 1000,        // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};
