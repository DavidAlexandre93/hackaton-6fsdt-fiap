import test from 'node:test';
import assert from 'node:assert/strict';

import { nextId } from '../src/data.js';
import { createMessageBus } from '../src/message-bus.js';
import {
  listProviders,
  validateIntegrationConfig,
  enrichIntegrationRecord,
  runIntegrationSync
} from '../src/integration-service.js';
import { withSpan, formatPrometheusMetrics, createRequestLogger } from '../src/observability.js';
import { createAsyncQueue } from '../src/queue.js';

test('nextId returns expected values for empty and populated collections', () => {
  assert.equal(nextId([]), 1);
  assert.equal(
    nextId([
      { id: 1 },
      { id: 2 },
      { id: 9 }
    ]),
    10
  );
});

test('integration provider catalog and validation/enrichment flows', () => {
  const providers = listProviders();
  assert.equal(providers.length >= 3, true);
  assert.equal(providers.some((provider) => provider.provider === 'google_classroom'), true);

  assert.match(validateIntegrationConfig({}), /provedor válido/);
  assert.match(
    validateIntegrationConfig({ name: 'Google Classroom', syncScope: '' }),
    /Defina ao menos um escopo/
  );
  assert.match(
    validateIntegrationConfig({ name: 'Google Classroom', syncScope: 'classes,invalid' }),
    /Escopos inválidos/
  );
  assert.equal(
    validateIntegrationConfig({ provider: 'moodle', scopes: ['courses', 'assignments'] }),
    null
  );

  const enriched = enrichIntegrationRecord({
    name: 'Google Classroom',
    syncScope: 'classes, coursework'
  });
  assert.equal(enriched.provider, 'google_classroom');
  assert.deepEqual(enriched.scopes, ['classes', 'coursework']);
  assert.equal(enriched.status, 'active');
});

test('integration sync returns errors and success payloads', () => {
  const invalidProvider = runIntegrationSync({ name: 'Provedor inválido' }, ['classes']);
  assert.match(invalidProvider.error, /sem provedor compatível/);

  const unsupportedScope = runIntegrationSync(
    { name: 'Google Classroom', syncScope: 'classes' },
    ['classes', 'bad_scope']
  );
  assert.match(unsupportedScope.error, /não suportados/);

  const success = runIntegrationSync(
    { provider: 'google_classroom', syncScope: 'classes, coursework' },
    ['classes']
  );
  assert.equal(success.status, 'success');
  assert.equal(success.imported.classes > 0, true);
  assert.equal(Array.isArray(success.scopes), true);
});

test('message bus publishes jobs and exposes queue stats', async () => {
  const bus = await createMessageBus();
  let handled = false;
  bus.publish('custom_event', { ok: true }, () => {
    handled = true;
    return { consumed: true };
  });

  await new Promise((resolve) => setTimeout(resolve, 120));
  const stats = bus.stats();
  assert.equal(stats.enqueued, 1);
  assert.equal(stats.processed, 1);
  assert.equal(handled, true);
});

test('async queue can list and retrieve failed jobs', async () => {
  const queue = createAsyncQueue({ name: 'unit-queue' });
  const job = queue.add('failing', { a: 1 }, () => {
    throw new Error('erro esperado');
  });

  await new Promise((resolve) => setTimeout(resolve, 120));
  const stored = queue.getJob(job.id);
  assert.equal(stored?.status, 'failed');
  assert.match(stored?.error || '', /erro esperado/);

  const failedOnly = queue.listJobs({ status: 'failed' });
  assert.equal(failedOnly.length, 1);
  assert.equal(failedOnly[0].id, job.id);
});

test('withSpan returns results and rethrows errors while counting spans', async () => {
  const req = {
    requestId: 'req-1',
    trace: { traceId: 'trace-1' }
  };

  const result = await withSpan(req, 'unit_span_ok', async () => 'ok', { feature: 'unit' });
  assert.equal(result, 'ok');

  await assert.rejects(() =>
    withSpan(
      req,
      'unit_span_error',
      async () => {
        throw new Error('falha-controlada');
      },
      { feature: 'unit' }
    )
  );

  const metrics = formatPrometheusMetrics('unit_service');
  assert.match(metrics, /trace_spans_total\{span="unit_span_ok"\}/);
  assert.match(metrics, /trace_spans_total\{span="unit_span_error"\}/);
});

test('createRequestLogger decorates payload with request metadata', () => {
  const req = { requestId: 'request-123', trace: { traceId: 'trace-123' } };
  const logger = createRequestLogger(req);
  assert.equal(typeof logger.info, 'function');
  assert.equal(typeof logger.warn, 'function');
  assert.equal(typeof logger.error, 'function');
});
