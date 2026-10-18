# Help a Neighbour (elderly web)

Mobile-first PWA for elderly residents. Vite, React 18, TypeScript and React Router 6. Large readable text, few steps, read-aloud voice assist, and Safety, Community and Play sections in the Sime Darby red theme.

## Run

From the repo root, with the API running (see the root README):

```
pnpm install
pnpm db:up && pnpm db:setup && pnpm --filter @sdh/api db:seed
pnpm --filter @sdh/api dev                 # API on http://127.0.0.1:3001
pnpm --filter @sdh/elderly-web dev         # app on http://localhost:5174, proxies /api
pnpm --filter @sdh/elderly-web build       # production build in dist/
pnpm --filter @sdh/elderly-web preview     # built app on http://localhost:4174
pnpm --filter @sdh/elderly-web test
pnpm --filter @sdh/elderly-web typecheck
```

Run both apps live side by side: start the API, then `pnpm --filter @sdh/web dev` (5173) and `pnpm --filter @sdh/elderly-web dev` (5174). Create a request as a resident here, then accept it as a verified volunteer in the web app.

Set `API_PROXY_TARGET` to point the dev proxy somewhere other than `http://127.0.0.1:3001`. For a tunnel to the preview server set `PREVIEW_HOST` and `PREVIEW_ALLOWED_HOSTS`.

## Live and demo modes

The first screen asks who is using the phone and lists residents from `GET /api/demo/users?role=elder`. The choice is stored by `@sdh/api-client` and sent as the `X-Demo-User` header.

- Live: requests (`/api/requests`), events (`/api/events`) and the resident name come from the API. The request and event lists refresh every 10 seconds while the page is visible.
- Demo: set `VITE_USE_MOCK=true` to skip sign-in and use sample data from `src/mock`. Mock data is read only through the data hooks and is tagged "Demo data" in the UI. A failed live call never falls back to mock data.

Notices, Volunteer, Updates, Safety, Play and Medical ID are still demo data.

## Layout

```
src/
  pages/        Route pages, with request flow steps in pages/requestFlow
  ui/           Shared components
  api/          Request and event calls and error messages
  hooks/        Live query, mutation and data hooks; the only code that imports mock data
  session/      Resident picker and session gate
  context/      Accessibility settings
  requests/     Categories and scheduling rules
  mock/         Fictional demo data
  types/        Shared types and ambient declarations
  theme/        App CSS on top of @sdh/design-tokens
  test/         Test setup and helpers
```

## PWA

Built with vite-plugin-pwa. Only the app shell is precached; API calls are never cached. Regenerate the icons from `assets/app_icon.jpeg` with `pnpm --filter @sdh/elderly-web icons`.
