const PROVIDER_CATALOG = {
  google_classroom: {
    provider: 'google_classroom',
    name: 'Google Classroom',
    category: 'AVA',
    supportedScopes: ['classes', 'coursework', 'students', 'grades'],
    authentication: 'oauth2',
    docsUrl: 'https://developers.google.com/classroom'
  },
  moodle: {
    provider: 'moodle',
    name: 'Moodle',
    category: 'AVA',
    supportedScopes: ['courses', 'assignments', 'enrollments'],
    authentication: 'token',
    docsUrl: 'https://moodledev.io/docs/apis'
  },
  microsoft_teams: {
    provider: 'microsoft_teams',
    name: 'Microsoft Teams for Education',
    category: 'AVA',
    supportedScopes: ['classes', 'assignments', 'members'],
    authentication: 'oauth2',
    docsUrl: 'https://learn.microsoft.com/graph/education-overview'
  }
};

const DEFAULT_COUNTS = {
  classes: 4,
  coursework: 12,
  students: 108,
  grades: 96,
  courses: 5,
  assignments: 18,
  enrollments: 110,
  members: 105
};

function normalizeScopes(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((scope) => String(scope).trim()).filter(Boolean);
  return String(input)
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function inferProviderKey(integration) {
  const explicitProvider = String(integration.provider || '').trim().toLowerCase();
  if (explicitProvider && PROVIDER_CATALOG[explicitProvider]) {
    return explicitProvider;
  }

  const normalizedName = String(integration.name || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (normalizedName.includes('google classroom')) return 'google_classroom';
  if (normalizedName.includes('moodle')) return 'moodle';
  if (normalizedName.includes('teams')) return 'microsoft_teams';
  return null;
}

export function listProviders() {
  return Object.values(PROVIDER_CATALOG);
}

export function validateIntegrationConfig(payload = {}) {
  const providerKey = inferProviderKey(payload);
  if (!providerKey) {
    return 'Informe um provedor válido (google_classroom, moodle ou microsoft_teams).';
  }

  const supportedScopes = PROVIDER_CATALOG[providerKey].supportedScopes;
  const requestedScopes = normalizeScopes(payload.syncScope || payload.scopes);

  if (requestedScopes.length === 0) {
    return `Defina ao menos um escopo de sincronização: ${supportedScopes.join(', ')}.`;
  }

  const invalidScopes = requestedScopes.filter((scope) => !supportedScopes.includes(scope));
  if (invalidScopes.length) {
    return `Escopos inválidos para ${PROVIDER_CATALOG[providerKey].name}: ${invalidScopes.join(', ')}.`;
  }

  return null;
}

export function enrichIntegrationRecord(payload = {}) {
  const providerKey = inferProviderKey(payload);
  const providerMeta = PROVIDER_CATALOG[providerKey] || null;
  const scopes = normalizeScopes(payload.syncScope || payload.scopes);

  return {
    ...payload,
    provider: providerMeta?.provider || payload.provider,
    name: providerMeta?.name || payload.name,
    category: payload.category || providerMeta?.category || 'AVA',
    scopes,
    syncScope: scopes.join(', '),
    status: payload.status || 'active',
    lastSyncAt: payload.lastSyncAt || null,
    lastSyncSummary: payload.lastSyncSummary || null
  };
}

export function runIntegrationSync(integration, requestedScopes) {
  const providerKey = inferProviderKey(integration);
  if (!providerKey) {
    return { error: 'Integração sem provedor compatível para sincronização.' };
  }

  const providerMeta = PROVIDER_CATALOG[providerKey];
  const integrationScopes = normalizeScopes(integration.syncScope || integration.scopes);
  const scopes = normalizeScopes(requestedScopes).length
    ? normalizeScopes(requestedScopes)
    : integrationScopes;

  const unsupportedScopes = scopes.filter((scope) => !providerMeta.supportedScopes.includes(scope));
  if (unsupportedScopes.length) {
    return {
      error: `Escopos não suportados para ${providerMeta.name}: ${unsupportedScopes.join(', ')}.`
    };
  }

  const imported = scopes.reduce((acc, scope) => {
    acc[scope] = DEFAULT_COUNTS[scope] || 1;
    return acc;
  }, {});

  return {
    provider: providerMeta.provider,
    providerName: providerMeta.name,
    scopes,
    imported,
    syncedAt: new Date().toISOString(),
    status: 'success'
  };
}
