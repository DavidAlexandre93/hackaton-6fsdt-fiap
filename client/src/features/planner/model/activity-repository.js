import { FALLBACK_LIGHT_CONTENT, LIGHT_CONTENT_KEY, STORAGE_KEY } from './constants.js';

export function loadActivities() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveActivities(activities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

export function loadCachedLightContent() {
  const cached = localStorage.getItem(LIGHT_CONTENT_KEY);
  if (!cached) {
    return FALLBACK_LIGHT_CONTENT;
  }

  try {
    const parsed = JSON.parse(cached);
    if (parsed?.title && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch {
    localStorage.removeItem(LIGHT_CONTENT_KEY);
  }

  return FALLBACK_LIGHT_CONTENT;
}

export async function fetchLightContent() {
  const response = await fetch('/offline/light-content.json');
  if (!response.ok) {
    throw new Error('Não foi possível carregar conteúdo leve offline.');
  }

  const payload = await response.json();
  if (payload?.title && Array.isArray(payload.items)) {
    localStorage.setItem(LIGHT_CONTENT_KEY, JSON.stringify(payload));
    return payload;
  }

  throw new Error('Conteúdo leve inválido.');
}

export function exportActivitiesAsJson(activities) {
  const content = JSON.stringify(activities, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'planejamento-escolar.json';
  link.click();
  URL.revokeObjectURL(url);
}
