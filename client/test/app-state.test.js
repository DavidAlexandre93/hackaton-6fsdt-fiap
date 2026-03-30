import test from 'node:test';
import assert from 'node:assert/strict';
import { validateActivityForm, buildNextActivity, buildSummary } from '../src/app-state.js';

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

test('buildNextActivity trims values and increments id', () => {
  const next = buildNextActivity(
    [{ id: 3 }],
    {
      title: ' A ',
      subject: ' B ',
      grade: ' C ',
      classGroup: ' 8A ',
      dueDate: ' 2026-04-01 ',
      status: ' Em andamento '
    }
  );
  assert.equal(next.id, 4);
  assert.equal(next.title, 'A');
  assert.equal(next.classGroup, '8A');
  assert.equal(next.status, 'Em andamento');
});

test('buildNextActivity starts IDs at one and applies default status', () => {
  const next = buildNextActivity([], {
    title: 'Atividade',
    subject: 'Matemática',
    grade: '7º',
    classGroup: '7A',
    dueDate: '2026-04-01',
    status: ''
  });

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
