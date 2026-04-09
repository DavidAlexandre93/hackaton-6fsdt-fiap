import Card from '../../../components/Card';
import { Actions, Button, Form, FormGrid, Input, Select, TextArea } from './planner-styles';

export default function PlannerFormView({ actions, editingId, form, options }) {
  return (
    <Card title={editingId ? 'Editar atividade' : 'Nova atividade pedagógica'}>
      <Form onSubmit={actions.handleSubmit}>
        <Input
          name="title"
          placeholder="Título da atividade"
          value={form.title}
          onChange={(event) => actions.updateField('title', event.target.value)}
        />

        <FormGrid>
          <Select value={form.subject} onChange={(event) => actions.updateField('subject', event.target.value)}>
            {options.subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </Select>

          <Input
            placeholder="Série/ano (ex: 8º ano)"
            value={form.grade}
            onChange={(event) => actions.updateField('grade', event.target.value)}
          />

          <Input
            placeholder="Turma (ex: 8A manhã)"
            value={form.classGroup}
            onChange={(event) => actions.updateField('classGroup', event.target.value)}
          />

          <Input
            type="date"
            value={form.dueDate}
            onChange={(event) => actions.updateField('dueDate', event.target.value)}
          />

          <Input
            placeholder="Habilidade BNCC (ex: EF08CI02)"
            value={form.bnccSkill}
            onChange={(event) => actions.updateField('bnccSkill', event.target.value)}
          />

          <Input
            type="number"
            min="10"
            step="5"
            placeholder="Tempo (min)"
            value={form.durationMinutes}
            onChange={(event) => actions.updateField('durationMinutes', event.target.value)}
          />

          <Select value={form.difficulty} onChange={(event) => actions.updateField('difficulty', event.target.value)}>
            {options.difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </Select>

          <Select value={form.status} onChange={(event) => actions.updateField('status', event.target.value)}>
            {options.statuses.map((status) => (
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
          onChange={(event) => actions.updateField('resourceLink', event.target.value)}
        />

        <TextArea
          placeholder="Descrição da proposta, critérios de avaliação e adaptações"
          value={form.description}
          onChange={(event) => actions.updateField('description', event.target.value)}
        />

        <Actions>
          <Button whileTap={{ scale: 0.985 }} whileHover={{ scale: 1.01 }} type="submit" full>
            {editingId ? 'Atualizar atividade' : 'Salvar atividade'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={actions.resetForm}>
              Cancelar edição
            </Button>
          )}
        </Actions>
      </Form>
    </Card>
  );
}
