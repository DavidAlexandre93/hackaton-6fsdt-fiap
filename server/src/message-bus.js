import { createAsyncQueue } from './queue.js';
import { logger } from './logger.js';

export async function createMessageBus() {
  const queue = createAsyncQueue({
    name: 'professor-plus-events',
    onJobProcessed: (job) => {
      logger.info('message_processed', {
        type: job.type,
        jobId: job.id
      });
    }
  });

  return {
    mode: 'in-process-queue',
    publish(type, payload, handler) {
      queue.add(type, payload, handler);
    },
    stats() {
      return queue.stats();
    }
  };
}
