export const SUBJECT_OPTIONS = [
  'Ciências',
  'Matemática',
  'Geografia',
  'Português',
  'História',
  'Inglês',
  'Sociologia',
  'Filosofia',
  'Artes',
  'Educação Física'
];

export const DIFFICULTY_OPTIONS = ['Baixa', 'Média', 'Alta'];
export const STATUS_OPTIONS = ['Planejada', 'Em andamento', 'Concluída'];

export const STORAGE_KEY = 'professor_plus_activities_v2';
export const LIGHT_CONTENT_KEY = 'professor_plus_light_content_v1';

export const FALLBACK_LIGHT_CONTENT = {
  title: 'Conteúdo leve disponível offline',
  items: [
    'Checklist rápido para preparar aulas sem depender de internet.',
    'Resumo de objetivos e critérios avaliativos para uso em sala.',
    'Orientações para registrar atividades e exportar depois.'
  ]
};

export const INITIAL_FILTER = { search: '', subject: 'Todas', status: 'Todos' };
