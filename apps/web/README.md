# Help a Neighbour (web)

Mobile-first PWA for young volunteers (Help a Neighbour). Vite, React 19, TypeScript and React Router 7. It covers the neighbourhood hub, volunteer feed, challenges and rewards, safety and the profile.

## Run

From the repo root, with the API running (see the root README):

```
pnpm install
pnpm db:up && pnpm db:setup && pnpm --filter @sdh/api db:seed
pnpm --filter @sdh/api dev            # API on http://127.0.0.1:3001
pnpm --filter @sdh/web dev            # web on http://localhost:5173/volunteer/, proxies /api
pnpm --filter @sdh/web build          # production build in dist/
pnpm --filter @sdh/web preview        # built app on http://localhost:4173/volunteer/
pnpm --filter @sdh/web test
pnpm --filter @sdh/web typecheck
```

On one origin the app runs behind the sign-in app (http://localhost:5175).

Set `API_PROXY_TARGET` to point the dev proxy somewhere other than `http://127.0.0.1:3001`. For a tunnel to the preview server set `PREVIEW_HOST` and `PREVIEW_ALLOWED_HOSTS`.

## Data and sign-in

Every screen reads the API (`/api/township`, `/api/notices`, `/api/events`, `/api/safety`, `/api/challenges`, `/api/rewards`, `/api/badges`, `/api/me/points`, `/api/leaderboard`, `/api/me/settings`, `/api/requests/mine`, `/api/opportunities`) and writes through the matching endpoints. Nothing is kept on the device. Errors show with Try again.

For local work, Profile, Local sign-in picks a seeded user from `GET /api/demo/users`. The id is sent as the `X-Demo-User` header by `@sdh/api-client`. With Cognito settings in the build the real sign-in is used and the picker is off.

## Layout

```
src/
  app/          Route pages (home, community, volunteer, safety, profile)
  components/   ui (shared kit), layout, and one folder per feature
  data/         Providers and hooks; the only code that calls the API
  lib/          Pure helpers (points, rewards, geo, availability, storage)
  types/        View-model types shared by hooks and components
  styles/       App and layout CSS on top of @sdh/design-tokens
  test/         Test setup and helpers
```

## Role preview

The role comes from the signed-in user (`elder` is the elderly view, anything else is young). While signed out you can preview a role in dev with `?role=elderly` or `VITE_DEV_ROLE=elderly` in `.env.local`.

## PWA

The app shell is precached and only the public event list is cached for offline use. Regenerate the icons from `assets/app_icon.png` with `pnpm --filter @sdh/web icons`.

To test install on a phone you need HTTPS: build, run `preview` with the tunnel variables above, and expose port 4173 through a tunnel such as `cloudflared tunnel --url http://localhost:4173`. On iOS use Safari, Share, Add to Home Screen. Remove and re-add the app when the tunnel URL changes.

## Known gaps

- Points, rewards and the leaderboard are server state; nothing is cached for offline use.
- Match scores come from the API when signed in; the UI already shows score and reason, so an AI re-rank needs no frontend change.
