import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivityFromForm, buildSummary, validateActivityForm } from '../src/features/planner/model/activity-model.js';

test('validateActivityForm returns missing required fields', () => {
  assert.deepEqual(
    validateActivityForm({ title: ' ', subject: 'Mat', grade: '', classGroup: '', dueDate: '' }),
    ['title', 'grade', 'classGroup', 'dueDate']
  );
  assert.deepEqual(
    validateActivityForm({ title: 'T', subject: 'S', grade: 'G', classGroup: '8A', dueDate: '2026-03-27' }),
    []
  );
});

test('buildActivityFromForm trims values and keeps provided id', () => {
  const next = buildActivityFromForm(
    {
      title: ' A ',
      subject: ' B ',
      grade: ' C ',
      classGroup: ' 8A ',
      dueDate: ' 2026-04-01 ',
      status: ' Em andamento '
    },
    4
  );
  assert.equal(next.id, 4);
  assert.equal(next.title, 'A');
  assert.equal(next.classGroup, '8A');
  assert.equal(next.status, 'Em andamento');
});

test('buildActivityFromForm applies default status when empty', () => {
  const next = buildActivityFromForm({
    title: 'Atividade',
    subject: 'Matemática',
    grade: '7º',
    classGroup: '7A',
    dueDate: '2026-04-01',
    status: ''
  }, 1);

  assert.equal(next.id, 1);
  assert.equal(next.status, 'Planejada');
});

test('buildSummary returns counts and role', () => {
  const summary = buildSummary(
    [
      { id: 1, status: 'Concluída' },
      { id: 2, status: 'Planejada' }
    ],
    { role: 'teacher' }
  );
  assert.deepEqual(summary, {
    totalActivities: 2,
    completedActivities: 1,
    pendingActivities: 1,
    role: 'teacher'
  });
});
