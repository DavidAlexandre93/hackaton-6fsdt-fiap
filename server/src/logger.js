const SERVICE_NAME = process.env.SERVICE_NAME || 'professor-plus-api';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levels = ['debug', 'info', 'warn', 'error'];

function canLog(level) {
  return levels.indexOf(level) >= levels.indexOf(LOG_LEVEL);
}

function log(level, event, payload = {}) {
  if (!canLog(level)) return;

  const entry = {
    '@timestamp': new Date().toISOString(),
    service: SERVICE_NAME,
    level,
    event,
    ...payload
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (event, payload) => log('debug', event, payload),
  info: (event, payload) => log('info', event, payload),
  warn: (event, payload) => log('warn', event, payload),
  error: (event, payload) => log('error', event, payload)
};
