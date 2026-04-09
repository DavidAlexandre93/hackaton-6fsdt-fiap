import PlannerFormView from './features/planner/view/PlannerFormView';
import PlannerListView from './features/planner/view/PlannerListView';
import PlannerMetricsView from './features/planner/view/PlannerMetricsView';
import {
  Container,
  Grid,
  Hero,
  OfflineBadge
} from './features/planner/view/planner-styles';
import { usePlannerViewModel } from './features/planner/viewmodel/usePlannerViewModel';

export default function App() {
  const {
    actions,
    editingId,
    filter,
    form,
    hasOverdueVisible,
    isOnline,
    lightContent,
    metrics,
    options,
    upcoming,
    visibleActivities
  } = usePlannerViewModel();

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
        <PlannerFormView actions={actions} editingId={editingId} form={form} options={options} />
        <PlannerMetricsView lightContent={lightContent} metrics={metrics} upcoming={upcoming} />
        <PlannerListView
          actions={actions}
          filter={filter}
          hasOverdueVisible={hasOverdueVisible}
          options={options}
          visibleActivities={visibleActivities}
        />
      </Grid>
    </Container>
  );
}
