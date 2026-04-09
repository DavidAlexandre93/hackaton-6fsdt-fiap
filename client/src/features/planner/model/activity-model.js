import { SUBJECT_OPTIONS } from './constants.js';

export const createEmptyForm = () => ({
  title: '',
  subject: SUBJECT_OPTIONS[0],
  grade: '',
  classGroup: '',
  bnccSkill: '',
  dueDate: '',
  durationMinutes: '50',
  difficulty: 'Média',
  status: 'Planejada',
  resourceLink: '',
  description: ''
});

export const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function getVisibleActivities(activities, filter) {
  return activities.filter((item) => {
    const matchesSearch = normalizeText(
      `${item.title} ${item.grade} ${item.classGroup} ${item.bnccSkill} ${item.description}`
    ).includes(normalizeText(filter.search));
    const matchesSubject = filter.subject === 'Todas' || item.subject === filter.subject;
    const matchesStatus = filter.status === 'Todos' || item.status === filter.status;
    return matchesSearch && matchesSubject && matchesStatus;
  });
}

export function getMetrics(activities) {
  const now = new Date().toISOString().slice(0, 10);
  const planned = activities.filter((item) => item.status === 'Planejada').length;
  const inProgress = activities.filter((item) => item.status === 'Em andamento').length;
  const done = activities.filter((item) => item.status === 'Concluída').length;
  const overdue = activities.filter((item) => item.status !== 'Concluída' && item.dueDate < now).length;
  const workload = activities.reduce((acc, item) => acc + Number(item.durationMinutes || 0), 0);

  return [
    { label: 'Total de atividades', value: activities.length },
    { label: 'Planejadas', value: planned },
    { label: 'Em andamento', value: inProgress },
    { label: 'Concluídas', value: done },
    { label: 'Atrasadas', value: overdue },
    { label: 'Carga total (min)', value: workload }
  ];
}

export function getUpcomingActivities(activities) {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  return activities
    .filter((item) => {
      const due = new Date(`${item.dueDate}T12:00:00`);
      return due >= now && due <= nextWeek && item.status !== 'Concluída';
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
}

export function hasOverdueActivities(activities) {
  const today = new Date().toISOString().slice(0, 10);
  return activities.some((item) => item.status !== 'Concluída' && item.dueDate < today);
}

export function validateActivityForm(form) {
  const requiredFields = ['title', 'subject', 'grade', 'classGroup', 'dueDate'];
  return requiredFields.filter((field) => !String(form[field] ?? '').trim());
}

export function buildActivityFromForm(form, id) {
  return {
    id,
    title: String(form.title ?? '').trim(),
    subject: String(form.subject ?? '').trim(),
    grade: String(form.grade ?? '').trim(),
    classGroup: String(form.classGroup ?? '').trim(),
    bnccSkill: String(form.bnccSkill ?? '').trim(),
    dueDate: String(form.dueDate ?? '').trim(),
    durationMinutes: String(form.durationMinutes ?? '').trim(),
    difficulty: String(form.difficulty ?? '').trim(),
    status: String(form.status ?? '').trim() || 'Planejada',
    resourceLink: String(form.resourceLink ?? '').trim(),
    description: String(form.description ?? '').trim()
  };
}

export function buildSummary(activities, selectedUser) {
  const completed = activities.filter((item) => item.status === 'Concluída').length;

  return {
    totalActivities: activities.length,
    completedActivities: completed,
    pendingActivities: activities.length - completed,
    role: selectedUser.role
  };
}
