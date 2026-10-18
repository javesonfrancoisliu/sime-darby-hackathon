# Help a Neighbour

Team Capybara, Sime Darby Property University Hackathon 2026.

A mobile-first web app that connects elderly residents with nearby young volunteers for short, practical help such as groceries, transport and learning new technology.

| Member  | Role                                 |
| ------- | ------------------------------------ |
| Richard | Business research, backend           |
| Javeson | Backend, infrastructure              |
| Jens    | Frontend (elderly)                   |
| Justina | Frontend (young volunteers), AI part |

## Codebase structure

A pnpm monorepo. `apps/` holds what runs; `packages/` holds code shared between apps.

```
apps/
  api/                    Backend API (TypeScript, runs on AWS Lambda)
    src/
      handler.ts          Lambda entry point
      local.ts            Local dev server (pnpm dev)
      router.ts           Sends each URL to its feature module
      lib/                Shared helpers: config, database, validation, demo sign-in, distance
      modules/            One folder per feature
        users/            Profiles, demo sign-in, volunteer verification
        requests/         Help requests: create, approve, accept, complete
        events/           Community events: create, join, close
        matching/         Suggested volunteers: rule scoring plus optional AI re-rank
        opportunities/    Feed of nearby requests and events for volunteers
        contributions/    Volunteer hours
        health/           Health check
      test/               Test helpers
    scripts/              Local table setup
  web/                    Volunteer app (React 19, PWA), see apps/web/README.md
  elderly-web/            Elderly app (React 18, PWA), see apps/elderly-web/README.md
packages/
  contracts/              Request and response schemas shared by frontends and API
  config/                 Shared TypeScript config, Vite proxy and PWA settings
  api-client/             Fetch wrapper, error mapping and demo sign-in session for both apps
  design-tokens/          Shared tokens.css and design guidelines
infra/terraform/
  bootstrap/              S3 bucket for Terraform state (run once)
  modules/                api (Lambda, API Gateway), data (DynamoDB), web-hosting (S3, CloudFront)
  envs/dev, envs/prod     Settings for each environment
compose.yaml              DynamoDB Local for development
```

Most feature modules are split into three files:

- `routes.ts`: reads the request, checks who is calling and sends the response.
- `service.ts`: business rules.
- `repository.ts`: DynamoDB reads and writes.

## API

| Method | Path                        |
| ------ | --------------------------- |
| GET    | /api/health                 |
| GET    | /api/demo/users             |
| POST   | /api/users                  |
| GET    | /api/me                     |
| PATCH  | /api/me                     |
| GET    | /api/volunteers             |
| POST   | /api/volunteers/{id}/review |
| POST   | /api/requests               |
| GET    | /api/requests/mine          |
| GET    | /api/requests               |
| GET    | /api/requests/{id}          |
| POST   | /api/requests/{id}/review   |
| POST   | /api/requests/{id}/cancel   |
| GET    | /api/requests/{id}/matches  |
| POST   | /api/requests/{id}/accept   |
| POST   | /api/requests/{id}/complete |
| GET    | /api/opportunities          |
| GET    | /api/contributions/mine     |
| GET    | /api/events                 |
| POST   | /api/events                 |
| POST   | /api/events/{id}/join       |
| POST   | /api/events/{id}/complete   |

Request and response shapes are in `packages/contracts`.

## Getting started

Requires Node 24+, pnpm 11 and Docker.

```
pnpm install
pnpm db:up      # DynamoDB Local on 127.0.0.1:8000
cp apps/api/.env.example apps/api/.env
pnpm db:setup   # create the local table (once); refuses non-loopback DYNAMODB_ENDPOINT
pnpm dev        # API on http://127.0.0.1:3001
pnpm test
pnpm lint
pnpm typecheck
```

## Frontend notes

- Import API types from `@sdh/contracts` instead of redefining them.
- Demo sign-in only works when the API runs with `DEMO_AUTH_ENABLED=true` (set by `pnpm dev` and `.env.example`). Otherwise every signed-in call returns 401 and `/api/demo/users` and `POST /api/users` return 404. `POST /api/users` never creates a coordinator.
- After the demo sign-in, send the chosen profile id on every call as the `X-Demo-User` header.
- Call the API with relative paths (`/api/...`); in local dev, proxy `/api` to `http://127.0.0.1:3001`.
- Errors come back as `{ "error": { "code": "...", "message": "..." } }`.
