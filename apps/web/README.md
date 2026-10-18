# Township Connect (web)

Mobile-first PWA for young volunteers (Help a Neighbour). Vite, React 19, TypeScript and React Router 7. It covers the neighbourhood hub, volunteer feed, challenges and rewards, safety and the profile.

## Run

From the repo root, with the API running (see the root README):

```
pnpm install
pnpm db:up && pnpm db:setup && pnpm --filter @sdh/api db:seed
pnpm --filter @sdh/api dev            # API on http://127.0.0.1:3001
pnpm --filter @sdh/web dev            # web on http://localhost:5173, proxies /api
pnpm --filter @sdh/web build          # production build in dist/
pnpm --filter @sdh/web preview        # built app on http://localhost:4173
pnpm --filter @sdh/web test
pnpm --filter @sdh/web typecheck
```

Set `API_PROXY_TARGET` to point the dev proxy somewhere other than `http://127.0.0.1:3001`. For a tunnel to the preview server set `PREVIEW_HOST` and `PREVIEW_ALLOWED_HOSTS`.

## Live and demo modes

Profile, Demo sign-in picks a seeded user from `GET /api/demo/users`. The id is sent as the `X-Demo-User` header by `@sdh/api-client`.

- Signed in (live): `GET /api/me`, `/api/opportunities`, `/api/contributions/mine`, `/api/requests/mine`, `/api/events`, `PATCH /api/me`. Accept, complete and join call the matching endpoints. Errors show with Try again and never fall back to mock data. Try "Justina Tan" (verified volunteer) or "Aiman Hakim" (pending verification).
- Signed out (demo): labelled sample data that lives under `src/data/*.mock.ts` and is read only through the data hooks.

Still simulated on the device: points, badges, leaderboard, rewards, the resident confirm step and the settings toggles. Saved state is stored per user and cleared on sign out. The "Demo controls" card on Profile resets it; it shows in dev builds or when `VITE_DEMO_CONTROLS=true`.

## Layout

```
src/
  app/          Route pages (home, community, volunteer, safety, profile)
  components/   ui (shared kit), layout, and one folder per feature
  data/         Providers and hooks; the only code that imports mock data
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

- Resident confirmation has no API step yet; "Confirm (Demo)" stays on the device.
- Profile interests and languages are not stored by the API.
- The volunteer status model (`accepted`, `completed`, `verified`) is separate from the API request states.
- Match scores come from the API when signed in; the UI already shows score and reason, so an AI re-rank needs no frontend change.
