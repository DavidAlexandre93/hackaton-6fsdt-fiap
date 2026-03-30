import cors from 'cors';
import express from 'express';
import { authMiddleware, generateToken } from './auth.js';
import { createAsyncRoutineManager } from './async-routines.js';
import { createCache } from './cache.js';
import { globalErrorHandler, UnauthorizedError, ValidationError } from './errors.js';
import { logger } from './logger.js';
import { enrichIntegrationRecord, listProviders, runIntegrationSync, validateIntegrationConfig } from './integration-service.js';
import { createMessageBus } from './message-bus.js';
import { getMetrics, observabilityMiddleware, createRequestLogger, formatPrometheusMetrics, withSpan } from './observability.js';
import { createRepository } from './repository.js';

const RESOURCE_ROUTES = [
  ['/activities', 'activities'],
  ['/plans', 'plans'],
  ['/materials', 'materials'],
  ['/quizzes', 'quizzes'],
  ['/missions', 'missions'],
  ['/integrations', 'integrations'],
  ['/certifications', 'certifications'],
  ['/pilot-cycles', 'pilotCycles'],
  ['/calendar-events', 'calendarEvents']
];

const ROLE_PERMISSIONS = {
  teacher: {
    dashboard: true,
    bySubjectLibrary: true,
    exportActivity: true,
    resources: {
      activities: ['read', 'create', 'update', 'delete'],
      plans: ['read', 'create', 'update', 'delete'],
      materials: ['read', 'create', 'update', 'delete'],
      quizzes: ['read', 'create', 'update', 'delete'],
      missions: ['read', 'create', 'update', 'delete'],
      calendarEvents: ['read', 'create', 'update', 'delete']
    }
  },
  coordinator: {
    dashboard: true,
    bySubjectLibrary: true,
    exportActivity: true,
    resources: {
      activities: ['read'],
      plans: ['read'],
      materials: ['read', 'create', 'update', 'delete'],
      quizzes: ['read'],
      missions: ['read'],
      calendarEvents: ['read', 'create', 'update', 'delete'],
      integrations: ['read', 'create', 'update', 'delete'],
      certifications: ['read', 'create', 'update', 'delete'],
      pilotCycles: ['read', 'create', 'update', 'delete']
    }
  },
  student: {
    dashboard: true,
    bySubjectLibrary: false,
    exportActivity: false,
    resources: {
      materials: ['read'],
      quizzes: ['read'],
      missions: ['read']
    }
  }
};

const HTTP_METHOD_TO_ACTION = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  DELETE: 'delete'
};
const FORBIDDEN_RESOURCE_MESSAGE = 'Você não tem permissão para acessar este recurso.';

const requiredByCollection = {
  activities: ['title', 'subject', 'grade'],
  plans: ['subject', 'topic', 'grade', 'date', 'objective'],
  quizzes: ['title', 'subject', 'difficulty', 'questions']
};

const withHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export async function createApp(deps = {}) {
  const app = express();
  const messageBus = deps.messageBus || (await createMessageBus());
  const asyncRoutines = deps.asyncRoutines || createAsyncRoutineManager();
  const cache = deps.cache || (await createCache());
  const persistence = deps.persistence || (await createRepository());
  const repository = persistence.repository;

  app.use(cors());
  app.use(express.json());
  app.use(observabilityMiddleware);

  app.get('/health/live', (_, res) => {
    res.json({
      status: 'ok',
      service: 'Professor+ API',
      uptimeSec: process.uptime()
    });
  });

  app.get('/health/ready', withHandler(async (req, res) => {
    const checks = await runReadinessChecks(req, { repository, cache, messageBus });
    const healthy = checks.every((check) => check.status === 'ok');
    const payload = {
      status: healthy ? 'ok' : 'degraded',
      service: 'Professor+ API',
      checks,
      persistence: persistence.mode,
      cache: cache.mode,
      circuitBreaker: persistence.circuitBreaker?.stats?.(),
      queue: messageBus.stats(),
      asyncRoutines: asyncRoutines.stats()
    };

    if (!healthy) {
      return res.status(503).json(payload);
    }

    return res.json(payload);
  }));

  app.get('/health', withHandler(async (req, res) => {
    const checks = await runReadinessChecks(req, { repository, cache, messageBus });
    const healthy = checks.every((check) => check.status === 'ok');
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'Professor+ API',
      uptimeSec: process.uptime(),
      checks,
      persistence: persistence.mode,
      cache: cache.mode,
      circuitBreaker: persistence.circuitBreaker?.stats?.(),
      queue: messageBus.stats()
    });
  }));

  app.get('/metrics', (req, res) => {
    const accept = String(req.headers.accept || '');
    if (accept.includes('application/json')) {
      return res.json({
        ...getMetrics(),
        queue: messageBus.stats(),
        persistence: persistence.mode,
        cacheMode: cache.mode,
        circuitBreaker: persistence.circuitBreaker?.stats?.()
      });
    }

    res.setHeader('content-type', 'text/plain; version=0.0.4');
    return res.send(formatPrometheusMetrics(process.env.SERVICE_NAME || 'professor_plus_api'));
  });

  app.post('/auth/login', withHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await withSpan(req, 'repository.findUserByCredentials', () => repository.findUserByCredentials(email, password));
    if (!user) throw new UnauthorizedError('Credenciais inválidas.');

    const token = generateToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  }));

  app.use(authMiddleware);

  app.get('/me', withHandler(async (req, res) => {
    const user = await withSpan(req, 'repository.findUserById', () => repository.findUserById(req.user.id));
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    return res.json(sanitizeUser(user));
  }));

  app.get('/dashboard', withHandler(async (req, res) => {
    const dashboardCacheKey = `dashboard:${req.user.id}`;
    const cached = await withSpan(req, 'cache.get.dashboard', () => cache.get(dashboardCacheKey));
    if (cached) {
      return res.json({ user: req.user, ...cached, source: 'cache' });
    }

    const dashboard = await withSpan(req, 'repository.getDashboard', () => repository.getDashboard());
    await withSpan(req, 'cache.set.dashboard', () => cache.set(dashboardCacheKey, dashboard, 30));
    return res.json({
      user: req.user,
      ...dashboard,
      source: 'repository'
    });
  }));

  app.post('/async/reports', withHandler(async (req, res) => {
    const payload = {
      format: req.body?.format || 'pdf',
      scope: req.body?.scope || 'dashboard',
      requestedBy: req.user.id
    };

    const job = asyncRoutines.enqueueReport(payload, async (input) => {
      await delay(80);
      const dashboard = await repository.getDashboard();
      return {
        generatedAt: new Date().toISOString(),
        format: input.format,
        scope: input.scope,
        summary: dashboard.summary
      };
    });

    return res.status(202).json(job);
  }));

  app.post('/async/notifications', withHandler(async (req, res) => {
    if (!req.body?.message) {
      throw new ValidationError('Informe a mensagem para notificação.');
    }

    const payload = {
      channel: req.body?.channel || 'in-app',
      audience: req.body?.audience || 'all',
      message: req.body.message,
      requestedBy: req.user.id
    };

    const job = asyncRoutines.enqueueNotification(payload, async (input) => {
      await delay(40);
      return {
        deliveredAt: new Date().toISOString(),
        channel: input.channel,
        audience: input.audience,
        recipients: input.audience === 'all' ? 'all-users' : 'segment'
      };
    });

    return res.status(202).json(job);
  }));

  app.post('/async/imports', withHandler(async (req, res) => {
    const payload = {
      resource: req.body?.resource || 'activities',
      records: Array.isArray(req.body?.records) ? req.body.records : [],
      requestedBy: req.user.id
    };

    if (!payload.records.length) {
      throw new ValidationError('Envie ao menos 1 registro para importação.');
    }

    const job = asyncRoutines.enqueueImport(payload, async (input) => {
      await delay(60);
      return {
        resource: input.resource,
        importedRecords: input.records.length,
        finishedAt: new Date().toISOString()
      };
    });

    return res.status(202).json(job);
  }));

  app.get('/async/jobs', withHandler(async (req, res) => {
    const jobs = asyncRoutines.listJobs({
      type: req.query.type,
      status: req.query.status
    });
    return res.json(jobs);
  }));

  app.get('/async/jobs/:id', withHandler(async (req, res) => {
    const job = asyncRoutines.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job não encontrado.' });
    }
    return res.json(job);
  }));

  app.get('/reports/students-performance', withHandler(async (req, res) => {
    const classGroup = req.query.classGroup ? String(req.query.classGroup) : null;
    const minAttempts = req.query.minAttempts === undefined ? 1 : Number(req.query.minAttempts);

    if (!Number.isInteger(minAttempts) || minAttempts < 1) {
      throw new ValidationError('O parâmetro minAttempts deve ser um número inteiro maior ou igual a 1.');
    }

    const report = await repository.getStudentPerformanceReport({ classGroup, minAttempts });
    return res.json(report);
  }));

  for (const [path, resource] of RESOURCE_ROUTES) {
    buildCrudRoutes(app, repository, cache, messageBus, path, resource);
  }

  app.get('/activities/library/by-subject', withHandler(async (req, res) => {
    ensurePermission(req.user.role, 'activities', 'read', 'bySubjectLibrary');
    const activities = await withSpan(req, 'repository.list.activities', () => repository.list('activities'));
    const grouped = activities.reduce((acc, activity) => {
      const subject = activity.subject || 'Sem disciplina';
      acc[subject] = acc[subject] || [];
      acc[subject].push(activity);
      return acc;
    }, {});

    res.json(grouped);
  }));

  app.get('/integrations/providers', withHandler(async (_, res) => {
    res.json(listProviders());
  }));

  app.post('/integrations/:id/sync', withHandler(async (req, res) => {
    const id = Number(req.params.id);
    const integrations = await repository.list('integrations');
    const integration = integrations.find((item) => item.id === id);

    if (!integration) {
      return res.status(404).json({ message: 'Integração não encontrada.' });
    }

    const syncResult = runIntegrationSync(integration, req.body?.scopes);
    if (syncResult.error) {
      throw new ValidationError(syncResult.error, { integrationId: id });
    }

    const updatedIntegration = await repository.update('integrations', id, {
      lastSyncAt: syncResult.syncedAt,
      lastSyncSummary: syncResult.imported,
      status: 'active'
    });

    await clearDashboardCache(req, cache);

    return res.json({
      integration: updatedIntegration,
      sync: syncResult
    });
  }));

  app.get('/activities/:id/export', withHandler(async (req, res) => {
    ensurePermission(req.user.role, 'activities', 'read', 'exportActivity');
    const id = Number(req.params.id);
    const format = String(req.query.format || 'pdf').toLowerCase();
    const activities = await withSpan(req, 'repository.list.activities', () => repository.list('activities'));
    const activity = activities.find((item) => item.id === id);

    if (!activity) {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }

    const extension = format === 'pdf' ? 'pdf' : 'docx';
    return res.json({
      activityId: activity.id,
      format,
      fileName: `atividade-${activity.id}.${extension}`,
      downloadUrl: `/downloads/atividade-${activity.id}.${extension}`,
      exportedAt: new Date().toISOString()
    });
  }));

  app.use((err, req, _res, next) => {
    createRequestLogger(req).error('request_failure', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    next(err);
  });

  app.use(globalErrorHandler);

  return app;
}

function buildCrudRoutes(app, repository, cache, messageBus, path, resource) {
  app.get(path, withHandler(async (req, res) => {
    ensurePermission(req.user.role, resource, HTTP_METHOD_TO_ACTION.GET);
    const items = await withSpan(req, `repository.list.${resource}`, () => repository.list(resource));
    res.json(items);
  }));

  app.post(path, withHandler(async (req, res) => {
    ensurePermission(req.user.role, resource, HTTP_METHOD_TO_ACTION.POST);
    const validationError = validatePayload(resource, req.body);
    if (validationError) {
      throw new ValidationError(validationError, { resource });
    }

    const normalizedPayload = resource === 'integrations'
      ? enrichIntegrationRecord(req.body)
      : req.body;

    const item = await withSpan(req, `repository.create.${resource}`, () =>
      repository.create(resource, normalizedPayload, req.user.id)
    );
    await clearDashboardCache(req, cache);

    messageBus.publish(`${resource}.created`, item, async (payload) => {
      logger.info('resource_created', {
        resource,
        entityId: payload.id
      });
    });

    return res.status(201).json(item);
  }));

  app.put(`${path}/:id`, withHandler(async (req, res) => {
    ensurePermission(req.user.role, resource, HTTP_METHOD_TO_ACTION.PUT);
    const id = Number(req.params.id);
    const currentItems = await withSpan(req, `repository.list.${resource}`, () => repository.list(resource));
    const currentRecord = currentItems.find((item) => item.id === id);

    if (!currentRecord) {
      return res.status(404).json({ message: 'Registro não encontrado.' });
    }

    const mergedPayload = { ...currentRecord, ...req.body };
    const validationError = validatePayload(resource, mergedPayload, { isUpdate: true });
    if (validationError) {
      throw new ValidationError(validationError, { resource, id });
    }

    const payload = resource === 'integrations'
      ? enrichIntegrationRecord({ ...currentRecord, ...req.body })
      : req.body;

    const updated = await withSpan(req, `repository.update.${resource}`, () => repository.update(resource, id, payload));
    await clearDashboardCache(req, cache);
    return res.json(updated);
  }));

  app.delete(`${path}/:id`, withHandler(async (req, res) => {
    ensurePermission(req.user.role, resource, HTTP_METHOD_TO_ACTION.DELETE);
    const id = Number(req.params.id);
    const removed = await withSpan(req, `repository.remove.${resource}`, () => repository.remove(resource, id));

    if (!removed) {
      return res.status(404).json({ message: 'Registro não encontrado.' });
    }

    await clearDashboardCache(req, cache);
    return res.json(removed);
  }));
}

export function ensurePermission(role, resource, action, scope = 'resources') {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    throw new UnauthorizedError('Perfil sem permissões configuradas.');
  }

  if (scope !== 'resources') {
    if (!permissions[scope]) {
      throw new UnauthorizedError(FORBIDDEN_RESOURCE_MESSAGE);
    }
    return true;
  }

  const allowedActions = permissions.resources?.[resource] || [];
  if (!allowedActions.includes(action)) {
    throw new UnauthorizedError(FORBIDDEN_RESOURCE_MESSAGE);
  }

  return true;
}


async function runReadinessChecks(req, { repository, cache, messageBus }) {
  const checks = [];

  const check = async (name, fn) => {
    const started = process.hrtime.bigint();
    try {
      await fn();
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      checks.push({ name, status: 'ok', durationMs: Number(durationMs.toFixed(2)) });
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      checks.push({
        name,
        status: 'error',
        durationMs: Number(durationMs.toFixed(2)),
        message: error.message
      });
    }
  };

  await check('repository', () => withSpan(req, 'health.repository', async () => {
    await repository.list('activities');
  }));

  await check('cache', () => withSpan(req, 'health.cache', async () => {
    const key = `health:${Date.now()}`;
    await cache.set(key, { ok: true });
    await cache.get(key);
    await cache.del(key);
  }));

  await check('queue', () => withSpan(req, 'health.queue', async () => {
    messageBus.stats();
  }));

  return checks;
}


export function validatePayload(resource, payload, { isUpdate = false } = {}) {
  const requiredFields = requiredByCollection[resource] || [];
  const missingFields = requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length) {
    return `Preencha os campos obrigatórios: ${missingFields.join(', ')}.`;
  }

  if (resource === 'quizzes' && Number(payload.questions) < 1) {
    return 'Um quiz precisa ter pelo menos 1 questão.';
  }

  if (!isUpdate && resource === 'activities' && !payload.type) {
    return 'Informe o tipo da atividade.';
  }

  if (resource === 'integrations') {
    return validateIntegrationConfig(payload);
  }

  return null;
}

export function sanitizeUser(user) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearDashboardCache(req, cache) {
  return withSpan(req, 'cache.del.dashboard', () => cache.del(`dashboard:${req.user.id}`));
}

export async function startServer(port = process.env.PORT || 3001) {
  const app = await createApp();
  return app.listen(port, () => {
    logger.info('server_started', { port });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
