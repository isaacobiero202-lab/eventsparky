interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Milliseconds
}

class SupabaseCache {
  private cache = new Map<string, CacheEntry<any>>();

  // Default Time-To-Live: 2 minutes
  private defaultTTL = 2 * 60 * 1000;

  generateKey(prefix: string, args: any): string {
    return `${prefix}:${JSON.stringify(args || {})}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  invalidate(keyPattern: string | RegExp): void {
    if (typeof keyPattern === 'string') {
      this.cache.delete(keyPattern);
      for (const k of this.cache.keys()) {
        if (k.startsWith(keyPattern)) {
          this.cache.delete(k);
        }
      }
    } else {
      for (const k of this.cache.keys()) {
        if (keyPattern.test(k)) {
          this.cache.delete(k);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new SupabaseCache();
