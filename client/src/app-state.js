import {
  buildActivityFromForm,
  buildSummary,
  validateActivityForm
} from './features/planner/model/activity-model.js';

export { validateActivityForm, buildSummary };

export function buildNextActivity(activities, form) {
  const nextId = activities.length ? Math.max(...activities.map((activity) => activity.id)) + 1 : 1;
  return buildActivityFromForm(form, nextId);
}
