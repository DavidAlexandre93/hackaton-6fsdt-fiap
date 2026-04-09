import Card from '../../../components/Card';
import DataList from '../../../components/DataList';
import { Metric, Metrics, Muted, SectionTitle } from './planner-styles';

export default function PlannerMetricsView({ lightContent, metrics, upcoming }) {
  return (
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
  );
}
