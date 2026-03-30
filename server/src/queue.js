function createJobRecord({ name, sequence, type, payload, handler }) {
  return {
    id: `${name}-${sequence}`,
    type,
    payload,
    handler,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    status: 'pending',
    result: null,
    error: null
  };
}

export function createAsyncQueue({ name = 'default', onJobProcessed } = {}) {
  const pending = [];
  const jobs = new Map();
  let processing = false;
  let enqueued = 0;
  let processed = 0;
  let failed = 0;

  async function run() {
    if (processing || !pending.length) return;
    processing = true;

    const job = pending.shift();
    job.status = 'processing';
    job.startedAt = new Date().toISOString();

    try {
      const output = await Promise.resolve(job.handler(job.payload, job));
      job.status = 'completed';
      job.result = output ?? null;
      processed += 1;
      if (onJobProcessed) onJobProcessed(job);
    } catch (error) {
      job.status = 'failed';
      job.error = error?.message || 'Erro desconhecido';
      failed += 1;
    } finally {
      job.finishedAt = new Date().toISOString();
      processing = false;
      setImmediate(run);
    }
  }

  return {
    add(type, payload, handler = () => undefined) {
      enqueued += 1;
      const job = createJobRecord({
        name,
        sequence: enqueued,
        type,
        payload,
        handler
      });
      jobs.set(job.id, job);
      pending.push(job);
      setImmediate(run);
      return job;
    },
    getJob(jobId) {
      return jobs.get(jobId) || null;
    },
    listJobs({ type, status } = {}) {
      return Array.from(jobs.values()).filter((job) => {
        if (type && job.type !== type) return false;
        if (status && job.status !== status) return false;
        return true;
      });
    },
    stats() {
      return {
        name,
        enqueued,
        processed,
        failed,
        pending: pending.length,
        processing
      };
    }
  };
}
