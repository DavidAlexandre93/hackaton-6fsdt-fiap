import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import Card from './components/Card';
import DataList from './components/DataList';

const SUBJECT_OPTIONS = [
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

const DIFFICULTY_OPTIONS = ['Baixa', 'Média', 'Alta'];
const STATUS_OPTIONS = ['Planejada', 'Em andamento', 'Concluída'];
const STORAGE_KEY = 'professor_plus_activities_v2';
const LIGHT_CONTENT_KEY = 'professor_plus_light_content_v1';
const FALLBACK_LIGHT_CONTENT = {
  title: 'Conteúdo leve disponível offline',
  items: [
    'Checklist rápido para preparar aulas sem depender de internet.',
    'Resumo de objetivos e critérios avaliativos para uso em sala.',
    'Orientações para registrar atividades e exportar depois.'
  ]
};

const createEmptyForm = () => ({
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

const Container = styled.main`
  max-width: 1280px;
  margin: 0 auto;
  padding: 30px 24px 40px;
`;

const Hero = styled(motion.section)`
  position: relative;
  margin-bottom: 22px;
  padding: 30px;
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background:
    linear-gradient(160deg, rgba(16, 33, 80, 0.95), rgba(7, 16, 34, 0.95)),
    radial-gradient(circle at top right, rgba(38, 212, 215, 0.25), transparent 45%);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    width: 240px;
    height: 240px;
    right: -80px;
    top: -80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(124, 141, 255, 0.42), transparent 68%);
    pointer-events: none;
  }

  h1 {
    margin: 0 0 10px;
    font-size: clamp(1.8rem, 2.6vw, 2.45rem);
    letter-spacing: -0.01em;
    position: relative;
    z-index: 1;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    max-width: 860px;
    position: relative;
    z-index: 1;
  }
`;

const Grid = styled.section`
  display: grid;
  gap: 16px;
  grid-template-columns: 1.06fr 0.94fr 1.08fr;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 12px;
`;

const controlStyles = ({ theme }) => `
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  padding: 11px 12px;
  background: rgba(3, 9, 24, 0.7);
  color: ${theme.colors.text};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &::placeholder {
    color: ${theme.colors.muted};
  }

  &:focus {
    border-color: rgba(124, 141, 255, 0.65);
    box-shadow: 0 0 0 3px rgba(124, 141, 255, 0.2);
    transform: translateY(-1px);
  }
`;

const Input = styled.input`
  ${({ theme }) => controlStyles({ theme })}
`;

const TextArea = styled.textarea`
  ${({ theme }) => controlStyles({ theme })}
  min-height: 92px;
  resize: vertical;
`;

const Select = styled.select`
  ${({ theme }) => controlStyles({ theme })}
`;

const FormGrid = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Button = styled(motion.button)`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ variant }) =>
    variant === 'ghost'
      ? 'rgba(255, 255, 255, 0.08)'
      : variant === 'danger'
        ? 'linear-gradient(120deg, #ff6a8b, #ca345a)'
        : 'linear-gradient(120deg, #7c8dff, #26d4d7)'};
  color: #fff;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  width: ${({ full }) => (full ? '100%' : 'auto')};
  box-shadow: ${({ variant }) => (variant === 'ghost' ? 'none' : '0 10px 22px rgba(12, 22, 50, 0.4)')};
  letter-spacing: 0.01em;
`;

const Metrics = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const Metric = styled(motion.div)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  background: rgba(5, 10, 28, 0.62);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.85rem;
  }

  strong {
    display: block;
    font-size: 1.32rem;
    margin-top: 6px;
  }
`;

const FilterRow = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: 1.5fr 1fr 1fr;
  margin-bottom: 10px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h4`
  margin: 14px 0 8px;
  font-size: 1rem;
`;

const Warning = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 600;
`;

const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
`;

const OfflineBadge = styled.div`
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 184, 0, 0.15);
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 600;
`;

const normalize = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function App() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState({ search: '', subject: 'Todas', status: 'Todos' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lightContent, setLightContent] = useState(FALLBACK_LIGHT_CONTENT);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setActivities(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem(LIGHT_CONTENT_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.title && Array.isArray(parsed.items)) {
          setLightContent(parsed);
        }
      } catch {
        localStorage.removeItem(LIGHT_CONTENT_KEY);
      }
    }

    fetch('/offline/light-content.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Não foi possível carregar conteúdo leve offline.');
        }
        return response.json();
      })
      .then((payload) => {
        if (payload?.title && Array.isArray(payload.items)) {
          setLightContent(payload);
          localStorage.setItem(LIGHT_CONTENT_KEY, JSON.stringify(payload));
        }
      })
      .catch(() => {
        // fallback já coberto pelo localStorage e constante local
      });
  }, []);

  const visibleActivities = useMemo(() => {
    return activities.filter((item) => {
      const matchesSearch = normalize(
        `${item.title} ${item.grade} ${item.classGroup} ${item.bnccSkill} ${item.description}`
      ).includes(normalize(filter.search));
      const matchesSubject = filter.subject === 'Todas' || item.subject === filter.subject;
      const matchesStatus = filter.status === 'Todos' || item.status === filter.status;
      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [activities, filter]);

  const metrics = useMemo(() => {
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
  }, [activities]);

  const upcoming = useMemo(() => {
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
  }, [activities]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const requiredFields = ['title', 'subject', 'grade', 'classGroup', 'dueDate'];
    const hasMissing = requiredFields.some((field) => !String(form[field]).trim());
    if (hasMissing) {
      return;
    }

    if (editingId) {
      setActivities((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...form } : item)));
      resetForm();
      return;
    }

    setActivities((prev) => [{ id: crypto.randomUUID(), ...form }, ...prev]);
    resetForm();
  }

  function handleDelete(id) {
    setActivities((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function handleEdit(activity) {
    setEditingId(activity.id);
    setForm({ ...activity });
  }

  function toggleCompleted(activity) {
    const nextStatus = activity.status === 'Concluída' ? 'Em andamento' : 'Concluída';
    setActivities((prev) => prev.map((item) => (item.id === activity.id ? { ...item, status: nextStatus } : item)));
  }

  function handleExport() {
    const content = JSON.stringify(visibleActivities, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'planejamento-escolar.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasOverdueVisible = visibleActivities.some(
    (item) => item.status !== 'Concluída' && item.dueDate < new Date().toISOString().slice(0, 10)
  );

  return (
    <Container>
      <Hero initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1>Professor+ • Gestão escolar inteligente</h1>
        <p>
          Um painel moderno para planejar atividades com BNCC, acompanhar prazos, executar ações rápidas e visualizar
          a evolução pedagógica em um só lugar.
        </p>
      </Hero>

      {!isOnline && <OfflineBadge>Você está offline. Conteúdos leves continuam disponíveis.</OfflineBadge>}

      <Grid>
        <Card title={editingId ? 'Editar atividade' : 'Nova atividade pedagógica'}>
          <Form onSubmit={handleSubmit}>
            <Input
              name="title"
              placeholder="Título da atividade"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />

            <FormGrid>
              <Select value={form.subject} onChange={(event) => updateField('subject', event.target.value)}>
                {SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </Select>

              <Input
                placeholder="Série/ano (ex: 8º ano)"
                value={form.grade}
                onChange={(event) => updateField('grade', event.target.value)}
              />

              <Input
                placeholder="Turma (ex: 8A manhã)"
                value={form.classGroup}
                onChange={(event) => updateField('classGroup', event.target.value)}
              />

              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => updateField('dueDate', event.target.value)}
              />

              <Input
                placeholder="Habilidade BNCC (ex: EF08CI02)"
                value={form.bnccSkill}
                onChange={(event) => updateField('bnccSkill', event.target.value)}
              />

              <Input
                type="number"
                min="10"
                step="5"
                placeholder="Tempo (min)"
                value={form.durationMinutes}
                onChange={(event) => updateField('durationMinutes', event.target.value)}
              />

              <Select value={form.difficulty} onChange={(event) => updateField('difficulty', event.target.value)}>
                {DIFFICULTY_OPTIONS.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </Select>

              <Select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </FormGrid>

            <Input
              type="url"
              placeholder="Link de apoio (vídeo, material, simulador)"
              value={form.resourceLink}
              onChange={(event) => updateField('resourceLink', event.target.value)}
            />

            <TextArea
              placeholder="Descrição da proposta, critérios de avaliação e adaptações"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />

            <Actions>
              <Button whileTap={{ scale: 0.985 }} whileHover={{ scale: 1.01 }} type="submit" full>
                {editingId ? 'Atualizar atividade' : 'Salvar atividade'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar edição
                </Button>
              )}
            </Actions>
          </Form>
        </Card>

        <Card title="Métricas pedagógicas">
          <Metrics>
            {metrics.map((item, index) => (
              <Metric
                key={item.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </Metric>
            ))}
          </Metrics>
          <SectionTitle>{lightContent.title}</SectionTitle>
          <DataList
            items={lightContent.items.map((text, index) => ({ id: `light-${index}`, text }))}
            fields={[{ key: 'text', label: 'Guia rápido' }]}
          />

          <SectionTitle>Alertas da semana</SectionTitle>
          {upcoming.length ? (
            <DataList
              items={upcoming}
              fields={[
                { key: 'title', label: 'Atividade' },
                { key: 'classGroup', label: 'Turma' },
                { key: 'dueDate', label: 'Prazo' }
              ]}
            />
          ) : (
            <Muted>Nenhuma atividade próxima do vencimento nos próximos 7 dias.</Muted>
          )}
        </Card>

        <Card
          title="Planejamento cadastrado"
          action={
            <Button type="button" variant="ghost" onClick={handleExport}>
              Exportar JSON
            </Button>
          }
        >
          <FilterRow>
            <Input
              placeholder="Buscar por título, turma, BNCC..."
              value={filter.search}
              onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value }))}
            />
            <Select
              value={filter.subject}
              onChange={(event) => setFilter((prev) => ({ ...prev, subject: event.target.value }))}
            >
              <option value="Todas">Todas disciplinas</option>
              {SUBJECT_OPTIONS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </Select>
            <Select
              value={filter.status}
              onChange={(event) => setFilter((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="Todos">Todos status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </FilterRow>

          {hasOverdueVisible && <Warning>Atenção: existem atividades em atraso. Priorize intervenções.</Warning>}

          <DataList
            items={visibleActivities}
            fields={[
              { key: 'title', label: 'Título' },
              { key: 'subject', label: 'Disciplina' },
              { key: 'grade', label: 'Série' },
              { key: 'classGroup', label: 'Turma' },
              { key: 'status', label: 'Status' },
              { key: 'dueDate', label: 'Prazo' },
              { key: 'bnccSkill', label: 'BNCC' },
              { key: 'durationMinutes', label: 'Carga (min)' }
            ]}
            actions={(item) => (
              <Actions>
                <Button type="button" variant="ghost" onClick={() => handleEdit(item)}>
                  Editar
                </Button>
                <Button type="button" variant="ghost" onClick={() => toggleCompleted(item)}>
                  {item.status === 'Concluída' ? 'Reabrir' : 'Concluir'}
                </Button>
                <Button type="button" variant="danger" onClick={() => handleDelete(item.id)}>
                  Excluir
                </Button>
              </Actions>
            )}
          />
        </Card>
      </Grid>
    </Container>
  );
}
