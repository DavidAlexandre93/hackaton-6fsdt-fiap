# Revisão de aderência ao padrão MVVM

## Status geral

O frontend do domínio de planejamento está **majoritariamente aderente ao padrão MVVM**.

## Evidências de aderência

1. **Model separado e reutilizável**
   - Regras de domínio e transformação (filtros, métricas, validação, normalização) estão isoladas em `activity-model.js`.
   - Constantes de domínio (opções e chaves de storage) estão em `constants.js`.
   - Acesso a dados/infra (localStorage, fetch e export) está em `activity-repository.js`.

2. **ViewModel dedicado**
   - `usePlannerViewModel.js` concentra estado da tela, efeitos de ciclo de vida e ações de interação (`handleSubmit`, `handleEdit`, `toggleCompleted`, filtros etc.).
   - A View (React) recebe dados e callbacks prontos, sem precisar implementar regras de negócio complexas.

3. **View focada em apresentação**
   - `App.jsx`, `Card.jsx` e `DataList.jsx` estão orientados a renderização e binding de eventos.

## Pontos de atenção (não bloqueantes)

1. **View muito concentrada em um arquivo**
   - `App.jsx` acumula estrutura visual extensa e muitos componentes styled no mesmo arquivo. Não quebra MVVM, mas reduz manutenibilidade.

2. **Camada legada paralela**
   - `client/src/app-state.js` mantém regras de domínio antigas que não participam claramente do fluxo MVVM atual do planner.
   - Isso pode confundir a fronteira arquitetural no crescimento do projeto.

3. **Acoplamento do ViewModel com APIs de navegador**
   - `usePlannerViewModel.js` utiliza `navigator`, `window` e eventos online/offline diretamente.
   - É aceitável em SPA, porém para maior testabilidade pode-se encapsular essas dependências em serviços/adapters.

## Conclusão

O projeto está **no padrão MVVM de forma correta na feature de planejamento**, com separação coerente entre Model, ViewModel e View.

### Nível de aderência (estimado)

- **Aderência MVVM:** 8/10
- **Prioridade de melhoria:** média (refatoração estrutural de View e redução de artefatos legados)

## Recomendações objetivas

1. Quebrar `App.jsx` em subviews (`PlannerFormView`, `PlannerMetricsView`, `PlannerListView`) mantendo o mesmo ViewModel.
2. Mover styled-components para arquivos por seção para reduzir acoplamento visual.
3. Deprecar/remover `app-state.js` (ou migrar para a estrutura de `features/.../model`).
4. Opcional: introduzir adapters para browser APIs (online status, storage, download) para facilitar testes unitários do ViewModel.
