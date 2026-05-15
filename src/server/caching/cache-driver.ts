/**
 * Cache abstraction — swap Redis / Vercel KV without touching domain services.
 */
export type CacheDriver = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
};

export const noopCache: CacheDriver = {
  async get() {
    return null;
  },
  async set() {},
};
