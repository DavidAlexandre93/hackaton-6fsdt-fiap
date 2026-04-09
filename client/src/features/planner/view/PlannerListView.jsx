import Card from '../../../components/Card';
import DataList from '../../../components/DataList';
import { Actions, Button, FilterRow, Input, Select, Warning } from './planner-styles';

export default function PlannerListView({ actions, filter, hasOverdueVisible, options, visibleActivities }) {
  return (
    <Card
      title="Planejamento cadastrado"
      action={
        <Button type="button" variant="ghost" onClick={actions.handleExport}>
          Exportar JSON
        </Button>
      }
    >
      <FilterRow>
        <Input
          placeholder="Buscar por título, turma, BNCC..."
          value={filter.search}
          onChange={(event) => actions.setFilter((prev) => ({ ...prev, search: event.target.value }))}
        />
        <Select
          value={filter.subject}
          onChange={(event) => actions.setFilter((prev) => ({ ...prev, subject: event.target.value }))}
        >
          <option value="Todas">Todas disciplinas</option>
          {options.subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </Select>
        <Select
          value={filter.status}
          onChange={(event) => actions.setFilter((prev) => ({ ...prev, status: event.target.value }))}
        >
          <option value="Todos">Todos status</option>
          {options.statuses.map((status) => (
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
            <Button type="button" variant="ghost" onClick={() => actions.handleEdit(item)}>
              Editar
            </Button>
            <Button type="button" variant="ghost" onClick={() => actions.toggleCompleted(item)}>
              {item.status === 'Concluída' ? 'Reabrir' : 'Concluir'}
            </Button>
            <Button type="button" variant="danger" onClick={() => actions.handleDelete(item.id)}>
              Excluir
            </Button>
          </Actions>
        )}
      />
    </Card>
  );
}
