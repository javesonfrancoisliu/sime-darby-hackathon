# Help a Neighbour (elderly web)

Mobile-first PWA for elderly residents. Vite, React 18, TypeScript and React Router 6. Large readable text, few steps, read-aloud voice assist, and Safety, Community and Play sections in the Sime Darby red theme.

## Run

From the repo root, with the API running (see the root README):

```
pnpm install
pnpm db:up && pnpm db:setup && pnpm --filter @sdh/api db:seed
pnpm --filter @sdh/api dev                 # API on http://127.0.0.1:3001
pnpm --filter @sdh/elderly-web dev         # app on http://localhost:5174/elder/, proxies /api
pnpm --filter @sdh/elderly-web build       # production build in dist/
pnpm --filter @sdh/elderly-web preview     # built app on http://localhost:4174/elder/
pnpm --filter @sdh/elderly-web test
pnpm --filter @sdh/elderly-web typecheck
```

On one origin the app runs behind the sign-in app (http://localhost:5175).

Run both apps live side by side: start the API, then `pnpm --filter @sdh/web dev` (5173) and `pnpm --filter @sdh/elderly-web dev` (5174). Create a request as a resident here, then accept it as a verified volunteer in the web app.

Set `API_PROXY_TARGET` to point the dev proxy somewhere other than `http://127.0.0.1:3001`. For a tunnel to the preview server set `PREVIEW_HOST` and `PREVIEW_ALLOWED_HOSTS`.

## Sign-in modes

The first screen asks who is using the phone and lists residents from `GET /api/demo/users?role=elder`. The choice is stored by `@sdh/api-client` and sent as the `X-Demo-User` header. Build with `VITE_DEMO_SIGN_IN=false` to remove the picker (pair it with an API run without `DEMO_AUTH_ENABLED=true`).

- Every screen reads the API: requests, events, notices, safety readings, challenges, rewards, Medical ID and settings. Request and event lists refresh every 10 seconds while the page is visible.

## Layout

```
src/
  pages/        Route pages (including the resident picker), with request flow steps in pages/requestFlow
  ui/           Shared components
  api/          Calls to the township API and error messages
  hooks/        Live query and mutation hooks
  session/      Session gate and the signed-in resident
  context/      Accessibility settings
  community/    Event category words and spots left
  safety/       Labels, colours and severity for each safety reading
  requests/     Categories and scheduling rules
  theme/        App CSS on top of @sdh/design-tokens
  config.ts     Sign-in switch and fixed numbers
  test/         Test setup and helpers
```

## PWA

Built with vite-plugin-pwa. Only the app shell is precached; API calls are never cached. Regenerate the icons from `assets/app_icon.jpeg` with `pnpm --filter @sdh/elderly-web icons`.
