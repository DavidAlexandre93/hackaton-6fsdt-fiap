import { logger } from './logger.js';

export async function createCache() {
  const redisUrl = process.env.REDIS_URL;
  const memoryStore = new Map();

  if (redisUrl) {
    logger.warn('cache_redis_unavailable', {
      reason: 'cliente Redis não instalado no ambiente',
      redisUrl,
      fallback: 'memory'
    });
  } else {
    logger.warn('cache_memory_mode', { reason: 'REDIS_URL não configurada' });
  }

  return createMemoryCache(memoryStore, redisUrl ? 'memory-fallback' : 'memory');
}

function createMemoryCache(store, mode) {
  return {
    mode,
    async get(key) {
      return store.get(key) || null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(key) {
      store.delete(key);
    }
  };
}
