import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createServer } from 'node:http';

import { generateToken, authMiddleware, authorize } from '../src/auth.js';
import { AppError, ValidationError, UnauthorizedError, globalErrorHandler } from '../src/errors.js';
import { createCircuitBreaker } from '../src/circuit-breaker.js';
import { createAsyncRoutineManager } from '../src/async-routines.js';
import { createAsyncQueue } from '../src/queue.js';
import { createCache } from '../src/cache.js';
import { createRepository, resolvePersistenceMode } from '../src/repository.js';
import { observabilityMiddleware, getMetrics, createRequestLogger } from '../src/observability.js';
import { createApp, validatePayload, sanitizeUser, ensurePermission } from '../src/index.js';

const SECRET = 'professor-plus-secret';

test('auth helpers generate and validate token', async () => {
  const token = generateToken({ id: 7, name: 'User', email: 'u@u.com', role: 'teacher' });
  const decoded = jwt.verify(token, SECRET);
  assert.equal(decoded.id, 7);

  const req = { headers: { authorization: `Bearer ${token}` } };
  let nextCalled = false;
  const res = { status: (code) => ({ json: (payload) => ({ code, payload }) }) };
  authMiddleware(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
});

test('auth middleware returns errors for missing/invalid headers', () => {
  const mkRes = () => {
    const out = {};
    out.status = (code) => ({ json: (payload) => ((out.code = code), (out.payload = payload), out) });
    return out;
  };

  const res1 = mkRes();
  authMiddleware({ headers: {} }, res1, () => {});
  assert.equal(res1.code, 401);

  const res2 = mkRes();
  authMiddleware({ headers: { authorization: 'Bearer' } }, res2, () => {});
  assert.equal(res2.code, 401);

  const res3 = mkRes();
  authMiddleware({ headers: { authorization: 'Bearer invalid' } }, res3, () => {});
  assert.equal(res3.code, 401);
});

test('authorize middleware validates allowed roles', () => {
  const req = { user: { role: 'teacher' } };
  let nextCalled = false;
  authorize('teacher', 'coordinator')(req, {}, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  const forbidden = { user: { role: 'student' } };
  let error;
  authorize('teacher')(forbidden, {}, (err) => {
    error = err;
  });
  assert.equal(error?.statusCode, 401);
});

test('errors classes and global handler', () => {
  const appError = new AppError('x', { statusCode: 418, code: 'A', details: { ok: true } });
  assert.equal(appError.statusCode, 418);
  assert.equal(new ValidationError('v').statusCode, 400);
  assert.equal(new UnauthorizedError().statusCode, 401);

  const req = { requestId: 'r1' };
  const res = { statusCode: 0, payload: null, status(code) { this.statusCode = code; return this; }, json(v) { this.payload = v; return this; } };
  globalErrorHandler(new Error('boom'), req, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.requestId, 'r1');
});

test('circuit breaker transitions and fallback', async () => {
  const breaker = createCircuitBreaker({ name: 't', failureThreshold: 1, resetTimeoutMs: 1000, timeoutMs: 5 });
  const value = await breaker.execute(() => 'ok');
  assert.equal(value, 'ok');

  const fallback = await breaker.execute(
    () => {
      throw new Error('fail');
    },
    () => 'fallback'
  );
  assert.equal(fallback, 'fallback');

  const openedFallback = await breaker.execute(() => 'never', () => 'open-fallback');
  assert.equal(openedFallback, 'open-fallback');
});

test('queue processes jobs and updates stats', async () => {
  const processed = [];
  const queue = createAsyncQueue({ name: 'q', onJobProcessed: (job) => processed.push(job.id) });
  queue.add('t', { a: 1 }, () => {});
  await new Promise((r) => setTimeout(r, 120));
  const stats = queue.stats();
  assert.equal(stats.enqueued, 1);
  assert.equal(stats.processed >= 1, true);
  assert.equal(processed.length, 1);
});

test('async routine manager tracks job lifecycle', async () => {
  const manager = createAsyncRoutineManager();
  const job = manager.enqueueReport({ format: 'pdf' }, async () => ({ ok: true }));
  assert.equal(job.type, 'report');
  await new Promise((r) => setTimeout(r, 120));
  const done = manager.getJob(job.id);
  assert.equal(done.status, 'completed');
  assert.equal(done.result.ok, true);
});

test('cache in memory mode works', async () => {
  const cache = await createCache();
  await cache.set('a', 1);
  assert.equal(await cache.get('a'), 1);
  await cache.del('a');
  assert.equal(await cache.get('a'), null);
});

test('repository memory mode and CRUD', async () => {
  process.env.PERSISTENCE_MODE = 'memory';
  assert.equal(resolvePersistenceMode(), 'memory');
  const { repository, mode } = await createRepository();
  assert.equal(mode, 'memory');
  assert.equal((await repository.list('activities')).length > 0, true);
  const created = await repository.create('activities', { title: 'T', subject: 'S', grade: 'G', type: 'Ex' }, 1);
  assert.equal(created.createdBy, 1);
  const updated = await repository.update('activities', created.id, { title: 'TT' });
  assert.equal(updated.title, 'TT');
  const removed = await repository.remove('activities', created.id);
  assert.equal(removed.id, created.id);
  const report = await repository.getStudentPerformanceReport({ classGroup: '7º ano A', minAttempts: 1 });
  assert.equal(report.summary.totalStudents > 0, true);
  await assert.rejects(() => repository.list('invalid'));
});

test('observability helpers', async () => {
  const req = { method: 'GET', path: '/x', originalUrl: '/x', route: { path: '/x' } };
  const listeners = {};
  const res = {
    statusCode: 200,
    setHeader: () => {},
    on: (event, cb) => {
      listeners[event] = cb;
    }
  };
  await new Promise((resolve) => observabilityMiddleware(req, res, resolve));
  listeners.finish();
  const metrics = getMetrics();
  assert.equal(metrics.requestsTotal > 0, true);
  assert.equal(Boolean(req.requestId), true);
  assert.equal(Boolean(req.trace?.traceId), true);
  const requestLogger = createRequestLogger({ requestId: 'abc' });
  requestLogger.info('x', { a: 1 });
});

test('validate and sanitize helpers', () => {
  assert.match(validatePayload('activities', {}), /Preencha/);
  assert.match(validatePayload('quizzes', { title: 'a', subject: 'b', difficulty: 'c', questions: 0 }), /pelo menos 1/);
  assert.match(validatePayload('activities', { title: 'a', subject: 'b', grade: 'c' }), /tipo/);
  assert.equal(validatePayload('activities', { title: 'a', subject: 'b', grade: 'c', type: 'x' }), null);
  assert.equal(validatePayload('activities', { title: 'a', subject: 'b', grade: 'c' }, { isUpdate: true }), null);
  assert.equal(validatePayload('integrations', { name: 'Google Classroom', syncScope: 'classes, coursework' }), null);
  assert.match(validatePayload('integrations', { name: 'Desconhecido', syncScope: 'classes' }), /provedor válido/);
  assert.match(validatePayload('integrations', { name: 'Google Classroom', syncScope: 'invalid_scope' }), /Escopos inválidos/);
  assert.equal(sanitizeUser({ id: 1, password: 'x' }).password, undefined);
  assert.equal(ensurePermission('teacher', 'activities', 'create'), true);
  assert.throws(() => ensurePermission('student', 'activities', 'create'));
  assert.throws(() => ensurePermission('student', 'activities', 'read', 'bySubjectLibrary'));
});

test('createApp routes integration without supertest', async () => {
  const memory = {
    users: [
      { id: 1, email: 'a@a.com', password: '1', name: 'A', role: 'teacher' },
      { id: 2, email: 'c@c.com', password: '1', name: 'C', role: 'coordinator' },
      { id: 3, email: 's@s.com', password: '1', name: 'S', role: 'student' }
    ],
    activities: [{ id: 1, title: 'A1', subject: 'Mat', grade: '7', type: 'Ex' }],
    plans: [],
    materials: [],
    quizzes: [],
    missions: [],
    integrations: [{ id: 1, name: 'Google Classroom', provider: 'google_classroom', syncScope: 'classes, coursework', scopes: ['classes', 'coursework'], status: 'active' }],
    certifications: [],
    pilotCycles: [],
    calendarEvents: []
  };
  const repository = {
    findUserByCredentials: async (email, password) => memory.users.find((u) => u.email === email && u.password === password) || null,
    findUserById: async (id) => memory.users.find((u) => u.id === id) || null,
    getDashboard: async () => ({ summary: { activities: memory.activities.length } }),
    getStudentPerformanceReport: async ({ classGroup = null, minAttempts = 1 } = {}) => ({
      filters: { classGroup, minAttempts },
      summary: { totalStudents: 1, averageAccuracy: 75, studentsAbove80: 0, studentsBelow60: 0 },
      students: [
        {
          studentName: 'Carlos Lima',
          classGroup: classGroup || '7A',
          attempts: minAttempts,
          quizzesAnswered: 1,
          averageAccuracy: 75,
          bestAccuracy: 100,
          progress: 25
        }
      ]
    }),
    list: async (resource) => memory[resource],
    create: async (resource, payload, userId) => {
      const item = { id: memory[resource].length + 1, ...payload, createdBy: userId };
      memory[resource].push(item);
      return item;
    },
    update: async (resource, id, payload) => {
      const idx = memory[resource].findIndex((i) => i.id === id);
      if (idx < 0) return null;
      memory[resource][idx] = { ...memory[resource][idx], ...payload };
      return memory[resource][idx];
    },
    remove: async (resource, id) => {
      const idx = memory[resource].findIndex((i) => i.id === id);
      if (idx < 0) return null;
      return memory[resource].splice(idx, 1)[0];
    }
  };
  const cacheStore = new Map();
  const app = await createApp({
    persistence: { mode: 'memory', repository },
    cache: { mode: 'memory', get: async (k) => cacheStore.get(k) || null, set: async (k, v) => cacheStore.set(k, v), del: async (k) => cacheStore.delete(k) },
    messageBus: { stats: () => ({ pending: 0 }), publish: () => {} }
  });

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert.equal(health.status, 'ok');

  const live = await fetch(`${base}/health/live`).then((r) => r.json());
  assert.equal(live.status, 'ok');

  const readyRes = await fetch(`${base}/health/ready`);
  assert.equal(readyRes.status, 200);
  const ready = await readyRes.json();
  assert.equal(Array.isArray(ready.checks), true);

  const metricsText = await fetch(`${base}/metrics`).then((r) => r.text());
  assert.equal(metricsText.includes('http_requests_total'), true);

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'a@a.com', password: '1' })
  });
  const login = await loginRes.json();
  assert.equal(Boolean(login.token), true);
  const auth = { authorization: `Bearer ${login.token}` };

  const loginCoordinatorRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'c@c.com', password: '1' })
  });
  const coordinator = await loginCoordinatorRes.json();
  const coordinatorAuth = { authorization: `Bearer ${coordinator.token}` };

  const loginStudentRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 's@s.com', password: '1' })
  });
  const student = await loginStudentRes.json();
  const studentAuth = { authorization: `Bearer ${student.token}` };

  const me = await fetch(`${base}/me`, { headers: auth });
  assert.equal(me.status, 200);

  const dashboardFirst = await fetch(`${base}/dashboard`, { headers: auth }).then((r) => r.json());
  const dashboardSecond = await fetch(`${base}/dashboard`, { headers: auth }).then((r) => r.json());
  assert.equal(dashboardFirst.source, 'repository');
  assert.equal(dashboardSecond.source, 'cache');

  const report = await fetch(`${base}/reports/students-performance?classGroup=7A&minAttempts=2`, { headers: auth })
    .then((r) => r.json());
  assert.equal(report.filters.classGroup, '7A');
  assert.equal(report.filters.minAttempts, 2);

  const reportValidation = await fetch(`${base}/reports/students-performance?minAttempts=0`, { headers: auth });
  assert.equal(reportValidation.status, 400);

  const badCreate = await fetch(`${base}/activities`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({})
  });
  assert.equal(badCreate.status, 400);

  const create = await fetch(`${base}/activities`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Nova', subject: 'Mat', grade: '7', type: 'Ex' })
  });
  assert.equal(create.status, 201);
  const created = await create.json();

  const reportQueue = await fetch(`${base}/async/reports`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ format: 'pdf', scope: 'dashboard' })
  });
  assert.equal(reportQueue.status, 202);
  const reportJob = await reportQueue.json();
  assert.equal(reportJob.type, 'report');

  const invalidNotification = await fetch(`${base}/async/notifications`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(invalidNotification.status, 400);

  const importQueue = await fetch(`${base}/async/imports`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ resource: 'activities', records: [{ title: 'Lote 1' }] })
  });
  assert.equal(importQueue.status, 202);

  await new Promise((r) => setTimeout(r, 200));
  const queuedJobs = await fetch(`${base}/async/jobs?status=completed`, { headers: auth }).then((r) => r.json());
  assert.equal(queuedJobs.length >= 2, true);

  const reportJobStatus = await fetch(`${base}/async/jobs/${reportJob.id}`, { headers: auth }).then((r) => r.json());
  assert.equal(reportJobStatus.status, 'completed');

  const upd404 = await fetch(`${base}/activities/999`, { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(upd404.status, 404);

  const upd = await fetch(`${base}/activities/${created.id}`, {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Editada' })
  });
  assert.equal(upd.status, 200);

  const exp404 = await fetch(`${base}/activities/999/export`, { headers: auth });
  assert.equal(exp404.status, 404);
  const exp = await fetch(`${base}/activities/${created.id}/export?format=docx`, { headers: auth }).then((r) => r.json());
  assert.equal(exp.fileName.includes('.docx'), true);

  const grouped = await fetch(`${base}/activities/library/by-subject`, { headers: auth }).then((r) => r.json());
  assert.equal(Array.isArray(grouped.Mat), true);

  const providers = await fetch(`${base}/integrations/providers`, { headers: auth }).then((r) => r.json());
  assert.equal(Array.isArray(providers), true);
  assert.equal(providers.some((provider) => provider.provider === 'google_classroom'), true);

  const syncRes = await fetch(`${base}/integrations/1/sync`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ scopes: ['classes'] })
  });
  assert.equal(syncRes.status, 200);
  const syncPayload = await syncRes.json();
  assert.equal(syncPayload.sync.status, 'success');
  assert.equal(syncPayload.sync.imported.classes > 0, true);

  const badSync = await fetch(`${base}/integrations/1/sync`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ scopes: ['bad_scope'] })
  });
  assert.equal(badSync.status, 400);

  const del404 = await fetch(`${base}/activities/999`, { method: 'DELETE', headers: auth });
  assert.equal(del404.status, 404);
  const del = await fetch(`${base}/activities/${created.id}`, { method: 'DELETE', headers: auth });
  assert.equal(del.status, 200);

  const unauthorized = await fetch(`${base}/activities`);
  assert.equal(unauthorized.status, 401);

  const coordinatorForbidden = await fetch(`${base}/activities`, {
    method: 'POST', headers: { ...coordinatorAuth, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Coord', subject: 'Mat', grade: '7', type: 'Ex' })
  });
  assert.equal(coordinatorForbidden.status, 401);

  const coordinatorAllowed = await fetch(`${base}/integrations`, {
    method: 'POST',
    headers: { ...coordinatorAuth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Google Classroom', syncScope: 'classes, coursework' })
  });
  assert.equal(coordinatorAllowed.status, 201);

  const studentReadAllowed = await fetch(`${base}/materials`, { headers: studentAuth });
  assert.equal(studentReadAllowed.status, 200);

  const studentWriteForbidden = await fetch(`${base}/materials`, {
    method: 'POST', headers: { ...studentAuth, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Anotação' })
  });
  assert.equal(studentWriteForbidden.status, 401);

  const studentBySubjectForbidden = await fetch(`${base}/activities/library/by-subject`, { headers: studentAuth });
  assert.equal(studentBySubjectForbidden.status, 401);

  await new Promise((resolve) => server.close(resolve));
});
