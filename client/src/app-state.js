export function validateActivityForm(form) {
  const requiredFields = ['title', 'subject', 'grade', 'classGroup', 'dueDate'];
  return requiredFields.filter((field) => !String(form[field] ?? '').trim());
}

export function buildNextActivity(activities, form) {
  const nextId = activities.length ? Math.max(...activities.map((activity) => activity.id)) + 1 : 1;

  return {
    id: nextId,
    title: form.title.trim(),
    subject: form.subject.trim(),
    grade: form.grade.trim(),
    classGroup: form.classGroup.trim(),
    dueDate: form.dueDate.trim(),
    status: form.status?.trim() || 'Planejada'
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
