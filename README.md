# Professor+ (MVP Full Stack)

Plataforma educacional para apoiar professores da rede pública com planejamento pedagógico, criação de atividades, acompanhamento de aprendizagem e gestão de engajamento dos estudantes.

## Sumário

- [Visão geral](#visão-geral)
- [Principais funcionalidades](#principais-funcionalidades)
- [Arquitetura e stack](#arquitetura-e-stack)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como executar localmente](#como-executar-localmente)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Autenticação e perfis](#autenticação-e-perfis)
- [API e observabilidade](#api-e-observabilidade)
- [Qualidade e testes](#qualidade-e-testes)
- [Roadmap](#roadmap)
- [Documentação complementar](#documentação-complementar)

---

## Visão geral

O **Professor+** foi concebido para reduzir o tempo operacional de docentes e aumentar a previsibilidade pedagógica, concentrando em um único fluxo:

1. Planejar aulas e atividades.
2. Publicar conteúdos e quizzes.
3. Acompanhar indicadores por turma.
4. Ajustar estratégia com base em dados.

O projeto está organizado como monorepo (`npm workspaces`) com frontend React e API Node.js/Express.

---

## Principais funcionalidades

### Gestão pedagógica

- CRUD de **atividades**, **planos**, **materiais**, **quizzes**, **missões** e **eventos de calendário**.
- Biblioteca de atividades por disciplina (`/activities/library/by-subject`).
- Exportação simulada de atividades para formatos editáveis (`/activities/:id/export`).

### Engajamento e aprendizagem

- Quizzes com tentativa e devolutiva de desempenho.
- Missões de engajamento por turma.
- Relatório de desempenho dos estudantes (`/reports/students-performance`).

### Plataforma e operação

- Autenticação JWT com perfis de acesso (RBAC).
- Rotinas assíncronas para relatórios, notificações e importações.
- Integrações externas (catálogo de provedores e sincronização manual).
- Observabilidade com health checks, métricas e rastreabilidade por request/trace id.

---

## Arquitetura e stack

### Frontend

- **React 18** + **Vite**
- **Styled Components**
- **Framer Motion**
- Suporte a PWA (manifest + service worker)

### Backend

- **Node.js** + **Express**
- **JWT** para autenticação
- Persistência com **PostgreSQL** (com fallback em memória)
- Cache e fila com modo resiliente (incluindo suporte a Redis quando configurado)

### Operação

- `docker-compose` para infraestrutura local (PostgreSQL e Redis)
- Métricas em formato Prometheus ou JSON

---

## Estrutura do repositório

```text
.
├── client/                  # Aplicação web (React + Vite)
│   ├── public/
│   ├── src/
│   └── test/
├── server/                  # API (Express)
│   ├── src/
│   └── test/
├── docs/                    # Materiais de apoio e proposta
├── docker-compose.yml       # Serviços locais (Postgres/Redis)
└── package.json             # Scripts raiz (workspaces)
```

---

## Como executar localmente

### Pré-requisitos

- **Node.js 20+**
- **npm 10+**
- **Docker** (opcional, para PostgreSQL e Redis)

### 1) Instalar dependências

```bash
npm install
```

### 2) Iniciar frontend e backend em paralelo

```bash
npm run dev
```

Serviços padrão:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### 3) (Opcional) Subir PostgreSQL local

```bash
npm run postgres:up
```

### 4) (Opcional) Subir Redis local

```bash
npm run redis:up
```

Comandos auxiliares:

```bash
npm run postgres:logs
npm run postgres:down
npm run redis:logs
npm run redis:down
```

---

## Configuração de ambiente

Crie um arquivo `.env` a partir de `.env.example` (quando aplicável) e ajuste as variáveis abaixo conforme seu cenário:

```bash
PORT=3001
JWT_SECRET=change-me
PERSISTENCE_MODE=memory # ou postgres
DATABASE_URL=postgres://professor_plus:professor_plus@localhost:5432/professor_plus
REDIS_URL=redis://localhost:6379
```

> Observação: em `PERSISTENCE_MODE=postgres`, valide em `GET /health` se o campo `persistence` retorna `postgres`.

---

## Autenticação e perfis

A autenticação ocorre via `POST /auth/login`, com retorno de token Bearer JWT.

Usuários de demonstração:

- **Professor(a):** `ana@professormais.com` / `123456`
- **Coordenação:** `marina@professormais.com` / `123456`

Perfis suportados:

- `teacher`: acesso completo aos módulos pedagógicos.
- `coordinator`: gestão de integrações, certificações e ciclos de piloto, com acesso de leitura em módulos pedagógicos.
- `student`: acesso de leitura a materiais, quizzes e missões.

---

## API e observabilidade

### Endpoints públicos

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `POST /auth/login`

### Endpoints privados (Bearer Token)

- `GET /me`
- `GET /dashboard`
- `GET /reports/students-performance?classGroup=...&minAttempts=...`
- CRUD de recursos:
  - `/activities`
  - `/plans`
  - `/materials`
  - `/quizzes`
  - `/missions`
  - `/integrations`
  - `/certifications`
  - `/pilot-cycles`
  - `/calendar-events`
- Rotas adicionais:
  - `GET /activities/library/by-subject`
  - `GET /activities/:id/export?format=pdf|docx`
  - `GET /integrations/providers`
  - `POST /integrations/:id/sync`
  - `POST /async/reports`
  - `POST /async/notifications`
  - `POST /async/imports`
  - `GET /async/jobs`
  - `GET /async/jobs/:id`

### Recursos de observabilidade

- Identificadores `x-request-id` e `x-trace-id` para correlação ponta a ponta.
- Readiness check para repositório, cache e fila.
- Métricas compatíveis com Prometheus.

---

## Qualidade e testes

### Testes automatizados (raiz)

```bash
npm test
```

### Outros scripts úteis

```bash
npm run build
npm run lint
npm run dev:server
npm run dev:client
```

---

## Roadmap

- Evoluir engine de personalização pedagógica por perfil de turma.
- Expandir integrações acadêmicas (LMS e sistemas institucionais).
- Consolidar trilha de analytics para gestão escolar.
- Aprimorar fluxos offline e acessibilidade.

---

## Documentação complementar

- Proposta do hackathon: [`docs/hackathon-proposta.md`](docs/hackathon-proposta.md)

---

## Licença

Este projeto está sob a licença descrita em [`LICENSE`](LICENSE).
