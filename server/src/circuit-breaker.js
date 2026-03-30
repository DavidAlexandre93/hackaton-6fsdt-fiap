import { logger } from './logger.js';

export function createCircuitBreaker({
  name,
  failureThreshold = 5,
  resetTimeoutMs = 10_000,
  timeoutMs = 5_000
}) {
  let failures = 0;
  let state = 'closed';
  let nextTryAt = 0;

  async function execute(action, fallback) {
    if (state === 'open' && Date.now() < nextTryAt) {
      logger.warn('circuit_breaker_open', { name, nextTryAt });
      if (fallback) return fallback();
      throw new Error(`Circuit breaker aberto para ${name}.`);
    }

    if (state === 'open' && Date.now() >= nextTryAt) {
      state = 'half_open';
      logger.info('circuit_breaker_half_open', { name });
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout no circuito ${name}.`)), timeoutMs);
    });

    try {
      const result = await Promise.race([Promise.resolve().then(action), timeoutPromise]);
      failures = 0;
      if (state !== 'closed') {
        state = 'closed';
        logger.info('circuit_breaker_closed', { name });
      }
      return result;
    } catch (error) {
      failures += 1;
      if (failures >= failureThreshold) {
        state = 'open';
        nextTryAt = Date.now() + resetTimeoutMs;
        logger.error('circuit_breaker_tripped', {
          name,
          failures,
          message: error.message,
          nextTryAt
        });
      }

      if (fallback) {
        logger.warn('circuit_breaker_fallback', { name, message: error.message });
        return fallback(error);
      }

      throw error;
    }
  }

  return {
    execute,
    stats() {
      return { name, state, failures, nextTryAt };
    }
  };
}
