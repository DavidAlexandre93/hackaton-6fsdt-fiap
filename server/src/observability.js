import crypto from 'node:crypto';
import { logger } from './logger.js';

const HISTOGRAM_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

const metrics = {
  startedAt: Date.now(),
  requestsTotal: 0,
  requestsByRoute: {},
  requestsByStatus: {},
  responseTimeByRoute: {},
  requestDurationBuckets: Object.fromEntries(HISTOGRAM_BUCKETS_MS.map((bucket) => [bucket, 0])),
  requestDurationInf: 0,
  spansTotal: 0,
  spansByName: {},
  avgResponseMs: 0,
  errorsTotal: 0
};

function updateAverage(currentAverage, currentTotal, value) {
  if (currentTotal <= 1) return value;
  return currentAverage + (value - currentAverage) / currentTotal;
}

function sanitizeLabel(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_:/.-]/g, '_')
    .replace(/_+/g, '_');
}

function recordHistogram(durationMs) {
  let inKnownBucket = false;
  for (const bucket of HISTOGRAM_BUCKETS_MS) {
    if (durationMs <= bucket) {
      metrics.requestDurationBuckets[bucket] += 1;
      inKnownBucket = true;
      break;
    }
  }

  if (!inKnownBucket) {
    metrics.requestDurationInf += 1;
  }
}

function createTraceContext(headers = {}) {
  const incomingTraceId = headers['x-trace-id'] || headers['trace-id'];
  return {
    traceId: (incomingTraceId && String(incomingTraceId)) || crypto.randomBytes(16).toString('hex'),
    rootSpanId: crypto.randomBytes(8).toString('hex')
  };
}

function routeLabel(req) {
  return `${req.method} ${req.route?.path || req.path}`;
}

export function observabilityMiddleware(req, res, next) {
  const headers = req.headers || {};
  const requestId = headers['x-request-id'] || crypto.randomUUID();
  const trace = createTraceContext(headers);
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  req.trace = trace;

  res.setHeader('x-request-id', requestId);
  res.setHeader('x-trace-id', trace.traceId);

  logger.info('trace_start', {
    requestId,
    traceId: trace.traceId,
    spanId: trace.rootSpanId,
    method: req.method,
    path: req.originalUrl
  });

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1_000_000;
    const route = routeLabel(req);
    const status = String(res.statusCode);

    metrics.requestsTotal += 1;
    metrics.requestsByRoute[route] = (metrics.requestsByRoute[route] || 0) + 1;
    metrics.requestsByStatus[status] = (metrics.requestsByStatus[status] || 0) + 1;
    metrics.responseTimeByRoute[route] = updateAverage(
      metrics.responseTimeByRoute[route] || 0,
      metrics.requestsByRoute[route],
      durationMs
    );
    metrics.avgResponseMs = updateAverage(metrics.avgResponseMs, metrics.requestsTotal, durationMs);
    if (res.statusCode >= 500) metrics.errorsTotal += 1;
    recordHistogram(durationMs);

    logger.info('http_request', {
      requestId,
      traceId: trace.traceId,
      spanId: trace.rootSpanId,
      method: req.method,
      path: req.originalUrl,
      route,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    });
  });

  next();
}

export async function withSpan(req, name, fn, attributes = {}) {
  const traceId = req.trace?.traceId;
  const spanId = crypto.randomBytes(8).toString('hex');
  const startedAt = process.hrtime.bigint();

  logger.debug('span_start', {
    requestId: req.requestId,
    traceId,
    spanId,
    spanName: name,
    ...attributes
  });

  try {
    const result = await fn();
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    metrics.spansTotal += 1;
    metrics.spansByName[name] = (metrics.spansByName[name] || 0) + 1;

    logger.debug('span_finish', {
      requestId: req.requestId,
      traceId,
      spanId,
      spanName: name,
      durationMs: Number(durationMs.toFixed(2)),
      status: 'ok',
      ...attributes
    });

    return result;
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    metrics.spansTotal += 1;
    metrics.spansByName[name] = (metrics.spansByName[name] || 0) + 1;

    logger.error('span_finish', {
      requestId: req.requestId,
      traceId,
      spanId,
      spanName: name,
      durationMs: Number(durationMs.toFixed(2)),
      status: 'error',
      message: error.message,
      ...attributes
    });

    throw error;
  }
}

export function getMetrics() {
  return {
    ...metrics,
    uptimeSec: Math.round((Date.now() - metrics.startedAt) / 1000),
    avgResponseMs: Number(metrics.avgResponseMs.toFixed(2)),
    responseTimeByRoute: Object.fromEntries(
      Object.entries(metrics.responseTimeByRoute).map(([route, avg]) => [route, Number(avg.toFixed(2))])
    )
  };
}

export function formatPrometheusMetrics(serviceName = 'professor_plus_api') {
  const lines = [
    '# HELP http_requests_total Total number of HTTP requests',
    '# TYPE http_requests_total counter',
    `http_requests_total{service="${serviceName}"} ${metrics.requestsTotal}`,
    '# HELP http_request_errors_total Total number of HTTP 5xx responses',
    '# TYPE http_request_errors_total counter',
    `http_request_errors_total{service="${serviceName}"} ${metrics.errorsTotal}`,
    '# HELP http_request_duration_ms Request duration histogram in milliseconds',
    '# TYPE http_request_duration_ms histogram'
  ];

  let cumulative = 0;
  for (const bucket of HISTOGRAM_BUCKETS_MS) {
    cumulative += metrics.requestDurationBuckets[bucket];
    lines.push(`http_request_duration_ms_bucket{le="${bucket}"} ${cumulative}`);
  }

  lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${metrics.requestsTotal}`);
  lines.push(`http_request_duration_ms_count ${metrics.requestsTotal}`);
  lines.push(`http_request_duration_ms_sum ${(metrics.avgResponseMs * metrics.requestsTotal).toFixed(4)}`);

  for (const [route, count] of Object.entries(metrics.requestsByRoute)) {
    lines.push(`http_requests_route_total{route="${sanitizeLabel(route)}"} ${count}`);
  }

  for (const [status, count] of Object.entries(metrics.requestsByStatus)) {
    lines.push(`http_requests_status_total{status="${status}"} ${count}`);
  }

  for (const [spanName, count] of Object.entries(metrics.spansByName)) {
    lines.push(`trace_spans_total{span="${sanitizeLabel(spanName)}"} ${count}`);
  }

  lines.push(`process_uptime_seconds ${Math.round((Date.now() - metrics.startedAt) / 1000)}`);
  return lines.join('\n');
}

export function createRequestLogger(req) {
  return {
    info: (event, payload) => logger.info(event, { requestId: req.requestId, traceId: req.trace?.traceId, ...payload }),
    warn: (event, payload) => logger.warn(event, { requestId: req.requestId, traceId: req.trace?.traceId, ...payload }),
    error: (event, payload) => logger.error(event, { requestId: req.requestId, traceId: req.trace?.traceId, ...payload })
  };
}
