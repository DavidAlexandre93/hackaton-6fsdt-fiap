import { db, nextId } from './data.js';
import { createCircuitBreaker } from './circuit-breaker.js';
import { logger } from './logger.js';

export const RESOURCE_TYPES = [
  'activities',
  'plans',
  'materials',
  'quizzes',
  'missions',
  'integrations',
  'certifications',
  'pilotCycles',
  'calendarEvents'
];

export function resolvePersistenceMode() {
  if (process.env.PERSISTENCE_MODE === 'postgres') return 'postgres';
  if (process.env.DATABASE_URL) return 'postgres';
  return 'memory';
}

export async function createRepository() {
  const mode = resolvePersistenceMode();
  const memoryRepository = createMemoryRepository();

  if (mode === 'postgres') {
    try {
      const module = await import('./repository.postgres.js');
      const pgRepository = await module.createPostgresRepository();
      const circuitBreaker = createCircuitBreaker({ name: 'repository-postgres' });

      return {
        mode,
        circuitBreaker,
        repository: withResilience(pgRepository, memoryRepository, circuitBreaker)
      };
    } catch (error) {
      logger.warn('persistence_fallback_memory', {
        mode,
        reason: error.message
      });
    }
  }

  return { mode: 'memory', repository: memoryRepository };
}

function withResilience(primary, fallback, breaker) {
  return {
    async findUserByCredentials(...args) {
      return breaker.execute(() => primary.findUserByCredentials(...args), () => fallback.findUserByCredentials(...args));
    },
    async findUserById(...args) {
      return breaker.execute(() => primary.findUserById(...args), () => fallback.findUserById(...args));
    },
    async getDashboard(...args) {
      return breaker.execute(() => primary.getDashboard(...args), () => fallback.getDashboard(...args));
    },
    async getStudentPerformanceReport(...args) {
      return breaker.execute(
        () => primary.getStudentPerformanceReport(...args),
        () => fallback.getStudentPerformanceReport(...args)
      );
    },
    async list(...args) {
      return breaker.execute(() => primary.list(...args), () => fallback.list(...args));
    },
    async create(...args) {
      return breaker.execute(() => primary.create(...args), () => fallback.create(...args));
    },
    async update(...args) {
      return breaker.execute(() => primary.update(...args), () => fallback.update(...args));
    },
    async remove(...args) {
      return breaker.execute(() => primary.remove(...args), () => fallback.remove(...args));
    }
  };
}

function createMemoryRepository() {
  return {
    async findUserByCredentials(email, password) {
      return db.users.find((u) => u.email === email && u.password === password) || null;
    },
    async findUserById(id) {
      return db.users.find((u) => u.id === id) || null;
    },
    async getDashboard() {
      const upcomingPlans = [...db.plans]
        .filter((plan) => Boolean(plan.date))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

      const completedMissions = db.missions.filter((mission) => mission.status === 'done');
      const engagementPoints = completedMissions.reduce(
        (total, mission) => total + Number(mission.points || 0),
        0
      );

      return {
        summary: {
          activities: db.activities.length,
          materials: db.materials.length,
          quizzes: db.quizzes.length,
          plans: db.plans.length,
          missions: db.missions.length,
          completedMissions: completedMissions.length,
          engagementPoints
        },
        upcomingPlans
      };
    },
    async getStudentPerformanceReport({ classGroup = null, minAttempts = 1 } = {}) {
      const attempts = db.quizAttempts
        .filter((attempt) => (classGroup ? attempt.classGroup === classGroup : true))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const byStudent = attempts.reduce((acc, attempt) => {
        const name = attempt.studentName || 'Aluno sem nome';
        if (!acc[name]) {
          acc[name] = {
            studentName: name,
            classGroup: attempt.classGroup || 'Sem turma',
            attempts: 0,
            quizzesAnswered: new Set(),
            sumAccuracy: 0,
            bestAccuracy: 0,
            firstAccuracy: null,
            lastAccuracy: null,
            firstAttemptAt: null,
            lastAttemptAt: null
          };
        }

        const accuracy = Number(attempt.totalQuestions)
          ? Number(attempt.score) / Number(attempt.totalQuestions)
          : 0;
        const student = acc[name];
        student.attempts += 1;
        student.quizzesAnswered.add(attempt.quizId);
        student.sumAccuracy += accuracy;
        student.bestAccuracy = Math.max(student.bestAccuracy, accuracy);
        student.firstAccuracy = student.firstAccuracy ?? accuracy;
        student.lastAccuracy = accuracy;
        student.firstAttemptAt = student.firstAttemptAt ?? attempt.createdAt;
        student.lastAttemptAt = attempt.createdAt;
        return acc;
      }, {});

      const students = Object.values(byStudent)
        .filter((student) => student.attempts >= minAttempts)
        .map((student) => ({
          studentName: student.studentName,
          classGroup: student.classGroup,
          attempts: student.attempts,
          quizzesAnswered: student.quizzesAnswered.size,
          averageAccuracy: toPercent(student.sumAccuracy / student.attempts),
          bestAccuracy: toPercent(student.bestAccuracy),
          progress: toPercent((student.lastAccuracy ?? 0) - (student.firstAccuracy ?? 0)),
          firstAttemptAt: student.firstAttemptAt,
          lastAttemptAt: student.lastAttemptAt
        }))
        .sort((a, b) => b.averageAccuracy - a.averageAccuracy);

      const averageAccuracy = students.length
        ? students.reduce((total, student) => total + student.averageAccuracy, 0) / students.length
        : 0;

      return {
        filters: {
          classGroup,
          minAttempts
        },
        summary: {
          totalStudents: students.length,
          averageAccuracy: toPercent(averageAccuracy / 100),
          studentsAbove80: students.filter((student) => student.averageAccuracy >= 80).length,
          studentsBelow60: students.filter((student) => student.averageAccuracy < 60).length
        },
        students
      };
    },
    async list(resource) {
      ensureResource(resource);
      return db[resource];
    },
    async create(resource, payload, userId) {
      ensureResource(resource);
      const item = {
        id: nextId(db[resource]),
        ...payload,
        createdBy: userId
      };
      db[resource].push(item);
      return item;
    },
    async update(resource, id, payload) {
      ensureResource(resource);
      const index = db[resource].findIndex((item) => item.id === id);
      if (index === -1) return null;
      db[resource][index] = { ...db[resource][index], ...payload };
      return db[resource][index];
    },
    async remove(resource, id) {
      ensureResource(resource);
      const index = db[resource].findIndex((item) => item.id === id);
      if (index === -1) return null;
      const [removed] = db[resource].splice(index, 1);
      return removed;
    }
  };
}

function toPercent(value) {
  return Number((Number(value || 0) * 100).toFixed(1));
}

function ensureResource(resource) {
  if (!RESOURCE_TYPES.includes(resource)) {
    throw new Error(`Recurso inválido: ${resource}`);
  }
}
