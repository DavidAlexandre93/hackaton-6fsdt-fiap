export const db = {
  users: [
    {
      id: 1,
      name: 'Ana Souza',
      email: 'ana@professormais.com',
      password: '123456',
      role: 'teacher',
      discipline: 'Matemática'
    },
    {
      id: 2,
      name: 'Marina Costa',
      email: 'marina@professormais.com',
      password: '123456',
      role: 'coordinator'
    },
    {
      id: 3,
      name: 'Carlos Lima',
      email: 'carlos@professormais.com',
      password: '123456',
      role: 'student',
      grade: '7º ano'
    },
    {
      id: 3,
      name: 'Bruna Alves',
      email: 'bruna@professormais.com',
      password: '123456',
      role: 'student',
      grade: '7º ano'
    }
  ],
  plans: [
    {
      id: 1,
      teacherId: 1,
      subject: 'Matemática',
      topic: 'Frações',
      grade: '7º ano',
      date: '2026-03-28',
      objective: 'Resolver problemas com frações equivalentes.'
    }
  ],
  materials: [
    {
      id: 1,
      title: 'Guia rápido de Frações',
      subject: 'Matemática',
      grade: '7º ano',
      description: 'Material colaborativo com exemplos práticos.',
      createdBy: 1
    }
  ],
  quizzes: [
    {
      id: 1,
      title: 'Quiz de Frações',
      subject: 'Matemática',
      classGroup: '7º ano A',
      difficulty: 'Médio',
      questions: 3,
      questionItems: [
        {
          id: 1,
          prompt: 'Qual fração representa metade?',
          correctAnswer: '1/2',
          explanation: 'Metade é uma parte em duas partes iguais.'
        },
        {
          id: 2,
          prompt: 'Qual fração é equivalente a 2/4?',
          correctAnswer: '1/2',
          explanation: '2/4 simplifica para 1/2.'
        },
        {
          id: 3,
          prompt: 'Quanto é 1/4 + 1/4?',
          correctAnswer: '1/2',
          explanation: 'Somando partes iguais: 1/4 + 1/4 = 2/4 = 1/2.'
        }
      ],
      difficulty: 'Difícil',
      questions: 5,
      createdBy: 1
    },
    {
      id: 2,
      title: 'Quiz de geometria plana',
      subject: 'Matemática',
      difficulty: 'Difícil',
      questions: 6,
      createdBy: 1
    }
  ],
  quizAttempts: [
    {
      id: 1,
      quizId: 1,
      studentName: 'Carlos Lima',
      classGroup: '7º ano A',
      score: 2,
      totalQuestions: 3,
      createdAt: '2026-03-24T14:00:00.000Z'
    },
    {
      id: 2,
      quizId: 1,
      studentName: 'Carlos Lima',
      classGroup: '7º ano A',
      score: 3,
      totalQuestions: 3,
      createdAt: '2026-03-25T14:00:00.000Z'
    },
    {
      id: 3,
      quizId: 1,
      studentName: 'Bruna Alves',
      classGroup: '7º ano A',
      score: 1,
      totalQuestions: 3,
      createdAt: '2026-03-25T14:10:00.000Z'
    }
  ],
  missions: [
    {
      id: 1,
      title: 'Desafio relâmpago de frações',
      classGroup: '7º ano A',
      week: '2026-W13',
      dueDate: '2026-03-30',
      points: 15,
      participants: 18,
      status: 'pending',
      createdBy: 1
    },
    {
      id: 2,
      title: 'Trilha de revisão de geometria',
      classGroup: '7º ano B',
      dueDate: '2026-03-31',
      points: 10,
      status: 'done',
      createdBy: 1
    }
  ],
  calendarEvents: [
    {
      id: 1,
      title: 'Avaliação diagnóstica de frações',
      type: 'avaliação',
      classGroup: '7º ano A',
      bimester: '1º bimestre',
      date: '2026-03-29',
      createdBy: 1
    },
    {
      id: 2,
      title: 'Entrega de lista complementar',
      type: 'entrega',
      classGroup: '7º ano A',
      bimester: '1º bimestre',
      date: '2026-03-31',
      createdBy: 1
    },
    {
      id: 3,
      title: 'Reposição - operações com frações',
      type: 'reposição',
      classGroup: '7º ano B',
      bimester: '1º bimestre',
      date: '2026-04-02',
      createdBy: 1
    }
  ],
  activities: [
    {
      id: 1,
      title: 'Lista de exercícios - Frações',
      subject: 'Matemática',
      bnccSkill: 'EF07MA06',
      level: 'Intermediário',
      grade: '7º ano',
      classDuration: 50,
      type: 'Exercício',
      exportFormats: ['PDF', 'DOCX'],
      createdBy: 1
    }
  ],
  pilotCycles: [
    {
      id: 1,
      schoolName: 'EMEF Monte Azul',
      usageNotes: 'Acesso semanal em laboratório e via celular dos estudantes.',
      satisfactionScore: 4,
      localContext: 'Internet instável em 2 dias da semana.',
      schoolCalendar: 'Semanas de prova em abril exigem redução de quizzes.',
      multiplierTeacher: 'Juliana Martins',
      trainingStatus: 'iniciado',
      createdBy: 1
    }
  ],
  integrations: [
    {
      id: 1,
      name: 'Google Classroom',
      category: 'AVA',
      status: 'active',
      syncScope: 'turmas e atividades',
      createdBy: 1
    }
  ],
  certifications: [
    {
      id: 1,
      title: 'Avaliação Formativa na Prática',
      provider: 'Comunidade Professor+',
      workloadHours: 12,
      level: 'Intermediário',
      createdBy: 1
    }
  ]
};

export function nextId(collection) {
  if (!collection.length) return 1;
  return Math.max(...collection.map((item) => item.id)) + 1;
}
