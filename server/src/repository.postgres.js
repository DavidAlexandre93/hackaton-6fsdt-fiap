import { RESOURCE_TYPES } from './repository.js';

export async function createPostgresRepository() {
  const { Pool } = await import('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  await syncSchema(pool);
  await seedDemoData(pool);

  return {
    async findUserByCredentials(email, password) {
      const result = await pool.query(
        `SELECT id, name, email, password, role, discipline, grade
         FROM users
         WHERE email = $1 AND password = $2
         LIMIT 1`,
        [email, password]
      );
      return result.rows[0] || null;
    },
    async findUserById(id) {
      const result = await pool.query(
        `SELECT id, name, email, role, discipline, grade
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      return result.rows[0] || null;
    },
    async getDashboard() {
      const counts = {};
      for (const resource of RESOURCE_TYPES) {
        const result = await pool.query('SELECT COUNT(*)::int AS total FROM records WHERE resource = $1', [
          resource
        ]);
        counts[resource] = result.rows[0].total;
      }

      const completedMissionsResult = await pool.query(
        `SELECT COALESCE(SUM((payload->>'points')::int), 0)::int AS points, COUNT(*)::int AS total
         FROM records
         WHERE resource = 'missions' AND payload->>'status' = 'done'`
      );

      const upcomingPlansResult = await pool.query(
        `SELECT id, payload, created_by AS "createdBy"
         FROM records
         WHERE resource = 'plans'
           AND payload ? 'date'
         ORDER BY (payload->>'date')::date ASC
         LIMIT 5`
      );

      return {
        summary: {
          activities: counts.activities,
          materials: counts.materials,
          quizzes: counts.quizzes,
          plans: counts.plans,
          missions: counts.missions,
          completedMissions: completedMissionsResult.rows[0].total,
          engagementPoints: completedMissionsResult.rows[0].points
        },
        upcomingPlans: upcomingPlansResult.rows.map(mapRecord)
      };
    },
    async getStudentPerformanceReport({ classGroup = null, minAttempts = 1 } = {}) {
      const filters = [];
      const values = [];
      let valueIndex = 1;

      if (classGroup) {
        filters.push(`payload->>'classGroup' = $${valueIndex++}`);
        values.push(classGroup);
      }

      const whereClause = filters.length ? `AND ${filters.join(' AND ')}` : '';
      const attemptsResult = await pool.query(
        `SELECT payload
         FROM records
         WHERE resource = 'quizAttempts'
         ${whereClause}
         ORDER BY COALESCE((payload->>'createdAt')::timestamptz, NOW()) ASC`,
        values
      );

      const byStudent = {};
      for (const row of attemptsResult.rows) {
        const attempt = row.payload;
        const name = attempt.studentName || 'Aluno sem nome';
        if (!byStudent[name]) {
          byStudent[name] = {
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
        const student = byStudent[name];
        student.attempts += 1;
        student.quizzesAnswered.add(attempt.quizId);
        student.sumAccuracy += accuracy;
        student.bestAccuracy = Math.max(student.bestAccuracy, accuracy);
        student.firstAccuracy = student.firstAccuracy ?? accuracy;
        student.lastAccuracy = accuracy;
        student.firstAttemptAt = student.firstAttemptAt ?? attempt.createdAt;
        student.lastAttemptAt = attempt.createdAt;
      }

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
      const result = await pool.query(
        `SELECT id, payload, created_by AS "createdBy"
         FROM records
         WHERE resource = $1
         ORDER BY id ASC`,
        [resource]
      );
      return result.rows.map(mapRecord);
    },
    async create(resource, payload, userId) {
      ensureResource(resource);
      const result = await pool.query(
        `INSERT INTO records (resource, payload, created_by)
         VALUES ($1, $2::jsonb, $3)
         RETURNING id, payload, created_by AS "createdBy"`,
        [resource, JSON.stringify(payload), userId]
      );
      return mapRecord(result.rows[0]);
    },
    async update(resource, id, payload) {
      ensureResource(resource);
      const current = await pool.query(
        `SELECT id, payload, created_by AS "createdBy"
         FROM records
         WHERE resource = $1 AND id = $2`,
        [resource, id]
      );
      if (!current.rows.length) return null;

      const mergedPayload = {
        ...current.rows[0].payload,
        ...payload
      };

      const result = await pool.query(
        `UPDATE records
         SET payload = $1::jsonb
         WHERE resource = $2 AND id = $3
         RETURNING id, payload, created_by AS "createdBy"`,
        [JSON.stringify(mergedPayload), resource, id]
      );
      return mapRecord(result.rows[0]);
    },
    async remove(resource, id) {
      ensureResource(resource);
      const result = await pool.query(
        `DELETE FROM records
         WHERE resource = $1 AND id = $2
         RETURNING id, payload, created_by AS "createdBy"`,
        [resource, id]
      );
      return result.rows[0] ? mapRecord(result.rows[0]) : null;
    }
  };
}

function toPercent(value) {
  return Number((Number(value || 0) * 100).toFixed(1));
}

function mapRecord(row) {
  return {
    id: row.id,
    ...row.payload,
    createdBy: row.createdBy
  };
}

function ensureResource(resource) {
  if (!RESOURCE_TYPES.includes(resource)) {
    throw new Error(`Recurso inválido: ${resource}`);
  }
}

async function syncSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      discipline TEXT,
      grade TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      resource TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_by INT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function seedDemoData(pool) {
  const usersCount = await pool.query('SELECT COUNT(*)::int AS total FROM users');
  if (usersCount.rows[0].total > 0) return;

  const teacher = await pool.query(
    `INSERT INTO users (name, email, password, role, discipline)
     VALUES ('Ana Souza', 'ana@professormais.com', '123456', 'teacher', 'Matemática')
     RETURNING id`
  );

  await pool.query(
    `INSERT INTO users (name, email, password, role, grade)
     VALUES ('Carlos Lima', 'carlos@professormais.com', '123456', 'student', '7º ano')`
  );

  const teacherId = teacher.rows[0].id;
  await pool.query(
    `INSERT INTO records (resource, payload, created_by) VALUES
      ('plans', '{"teacherId":1,"subject":"Matemática","topic":"Frações","grade":"7º ano","date":"2026-03-28","objective":"Resolver problemas com frações equivalentes."}', $1),
      ('materials', '{"title":"Guia rápido de Frações","subject":"Matemática","grade":"7º ano","description":"Material colaborativo com exemplos práticos."}', $1),
      ('quizzes', '{"title":"Quiz de Frações","subject":"Matemática","difficulty":"Médio","questions":5}', $1),
      ('missions', '{"title":"Desafio relâmpago de frações","classGroup":"7º ano A","dueDate":"2026-03-30","points":15,"status":"pending"}', $1),
      ('activities', '{"title":"Lista de exercícios - Frações","subject":"Matemática","level":"Intermediário","grade":"7º ano","type":"Exercício"}', $1)`,
    [teacherId]
  );
}
