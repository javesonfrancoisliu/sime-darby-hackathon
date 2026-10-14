# Help a Neighbour

Team Capybara, Sime Darby Property University Hackathon 2026.

A mobile-first web app that connects elderly residents with nearby young volunteers for short, practical help such as groceries, transport and learning new technology.

| Member  | Role                                 |
| ------- | ------------------------------------ |
| Richard | Business research, backend           |
| Javeson | Backend, infrastructure              |
| Jens    | Frontend (elderly)                   |
| Justina | Frontend (young volunteers), AI part |

## Layout

```
apps/api/            TypeScript API on AWS Lambda
apps/<frontend>/     React frontends (added by the frontend team)
packages/contracts/  Request and response schemas shared by frontend and API
packages/config/     Shared TypeScript config
infra/terraform/     AWS infrastructure
```

## Getting started

Requires Node 24+ and pnpm 11.

```
pnpm install
pnpm dev        # API on http://127.0.0.1:3001
pnpm test
pnpm lint
pnpm typecheck
```

## Frontend notes

- Import API types from `@sdh/contracts` instead of redefining them.
- Call the API with relative paths (`/api/...`); in local dev, proxy `/api` to `http://127.0.0.1:3001`.
- Errors come back as `{ "error": { "code": "...", "message": "..." } }`.
