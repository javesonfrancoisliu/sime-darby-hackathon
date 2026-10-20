# Township Connect

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
  portal/                 Shared sign-in and account app (React 19), see apps/portal/README.md
packages/
  contracts/              Request and response schemas shared by frontends and API
  config/                 Shared TypeScript config, Vite proxy and PWA settings
  api-client/             Fetch wrapper, error mapping and demo sign-in session for both apps
  design-tokens/          Shared tokens.css and design guidelines
infra/terraform/
  bootstrap/              S3 bucket for Terraform state (run once)
  modules/                api (Lambda, API Gateway), auth (Cognito), data (DynamoDB), web-hosting (S3, CloudFront)
  envs/dev, envs/prod     Settings for each environment; each serves all three apps from one site
infra/scripts/deploy.sh   Build, apply Terraform and publish the three frontends
compose.yaml              DynamoDB Local for development
```

Most feature modules are split into three files:

- `routes.ts`: reads the request, checks who is calling and sends the response.
- `service.ts`: business rules.
- `repository.ts`: DynamoDB reads and writes.

## API

The API accepts `Authorization: Bearer <Cognito access token>`. `POST /api/me` creates your profile after the first sign-in (Bearer token only).

| Method | Path                                 |
| ------ | ------------------------------------ |
| GET    | /api/health                          |
| GET    | /api/demo/users                      |
| POST   | /api/users                           |
| GET    | /api/me                              |
| POST   | /api/me                              |
| PATCH  | /api/me                              |
| GET    | /api/volunteers                      |
| POST   | /api/volunteers/{id}/review          |
| POST   | /api/requests                        |
| GET    | /api/requests/mine                   |
| GET    | /api/requests                        |
| GET    | /api/requests/{id}                   |
| POST   | /api/requests/{id}/review            |
| POST   | /api/requests/{id}/cancel            |
| GET    | /api/requests/{id}/matches           |
| POST   | /api/requests/{id}/accept            |
| POST   | /api/requests/{id}/complete          |
| GET    | /api/opportunities                   |
| GET    | /api/contributions/mine              |
| GET    | /api/events                          |
| POST   | /api/events                          |
| POST   | /api/events/{id}/join                |
| POST   | /api/events/{id}/attendance/complete |
| POST   | /api/events/{id}/complete            |
| GET    | /api/rewards                         |
| POST   | /api/rewards/{id}/redeem             |
| POST   | /api/rewards/{id}/use                |

Request and response shapes are in `packages/contracts`.

Redeeming a reward spends points and adds a voucher to the profile. Vouchers expire 30 days after redemption and become claimed only when used. The young profile's volunteer level counts completed contributions, including self-reported event attendance; event points are still awarded when the coordinator closes the event. My accepted tasks requests `/api/events?includeJoined=true` so joined activities remain available after their start time.

For an existing local demo table, `pnpm --filter @sdh/api db:sync-rewards` updates the reward catalogue without replacing reward IDs or redemptions. This script refuses non-loopback database endpoints; deployed catalogues need a separate authorised data update.

## Getting started

Requires Node 24+, pnpm 11 and Docker.

```
pnpm install
pnpm db:up      # DynamoDB Local on 127.0.0.1:8000
cp apps/api/.env.example apps/api/.env
pnpm db:setup   # create the local table (once); refuses non-loopback DYNAMODB_ENDPOINT
pnpm db:seed    # add demo people, requests and events; skips if demo people already exist
pnpm dev        # API on http://127.0.0.1:3001 and the apps; open http://localhost:5175 (sign-in app) for all three on one address
pnpm test
pnpm lint
pnpm typecheck
```

The seed never overwrites an existing table, so a table seeded before a demo-data rename keeps the old names. To reseed, run `docker compose down -v`, then `pnpm db:up`, `pnpm db:setup` and `pnpm db:seed` (this deletes the local table data).

## Deploy

Runs from your machine; there is no CI/CD. Needs the AWS CLI, Terraform 1.10+ and a named AWS profile.

1. Once per account: `terraform -chdir=infra/terraform/bootstrap init`, then `apply` with `bootstrap/terraform.tfvars` filled in from the example. It creates the state bucket.
2. Copy `envs/dev/terraform.tfvars.example` and `envs/dev/backend.hcl.example` (drop `.example`) and fill them in. Set `demo_auth_enabled = true` only while the demo needs sign-in, because anyone with the URL can then pick any demo user.
3. Run `infra/scripts/deploy.sh dev <aws-profile>` (add `--yes` to skip both prompts). It builds the API, shows the Terraform plan and asks before applying, then reads the Cognito pool and client ids from the Terraform outputs and builds the three frontends with them. It uploads everything to one S3 bucket, clears the CloudFront cache once and prints the three URLs: `/` (sign in), `/elder/` (elderly app) and `/volunteer/` (volunteer app).

Hashed files in `assets/` are cached for a year; `index.html`, `sw.js` and the manifest are always revalidated so installed PWAs pick up new releases.

## Frontend notes

- Import API types from `@sdh/contracts` instead of redefining them.
- Demo sign-in only works when the API runs with `DEMO_AUTH_ENABLED=true` (set in `.env.example`; copy it to `apps/api/.env` for local development) and Cognito is not configured; once `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` are set, only Cognito sign-in is accepted. Otherwise every signed-in call returns 401 and `/api/demo/users` and `POST /api/users` return 404. `POST /api/users` never creates a coordinator.
- After the demo sign-in, send the chosen profile id on every call as the `X-Demo-User` header.
- Call the API with relative paths (`/api/...`); in local dev, proxy `/api` to `http://127.0.0.1:3001`.
- Errors come back as `{ "error": { "code": "...", "message": "..." } }`.
