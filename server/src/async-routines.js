import { createAsyncQueue } from './queue.js';
import { logger } from './logger.js';

const VALID_ROUTINES = new Set(['report', 'notification', 'import']);

export function createAsyncRoutineManager() {
  const queue = createAsyncQueue({
    name: 'professor-plus-routines',
    onJobProcessed: (job) => {
      logger.info('async_routine_completed', {
        jobId: job.id,
        type: job.type
      });
    }
  });

  function enqueue(type, payload, handler) {
    if (!VALID_ROUTINES.has(type)) {
      throw new Error(`Rotina assíncrona inválida: ${type}`);
    }

    const job = queue.add(type, payload, handler);
    return serializeJob(job);
  }

  return {
    enqueueReport(payload, handler) {
      return enqueue('report', payload, handler);
    },
    enqueueNotification(payload, handler) {
      return enqueue('notification', payload, handler);
    },
    enqueueImport(payload, handler) {
      return enqueue('import', payload, handler);
    },
    getJob(jobId) {
      const job = queue.getJob(jobId);
      return job ? serializeJob(job) : null;
    },
    listJobs(filters) {
      return queue.listJobs(filters).map(serializeJob);
    },
    stats() {
      return queue.stats();
    }
  };
}

function serializeJob(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    result: job.result,
    error: job.error,
    payload: job.payload
  };
}
