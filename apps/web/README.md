# Township Connect (web)

Mobile-first PWA frontend for the Help a Neighbour prototype. Vite + React +
TypeScript + React Router. Module 2 (Centralised Neighbourhood Information) plus
the shared app shell; Module 1 (Safety) is a placeholder owned by the teammate.

## Run locally

From the repo root (pnpm via corepack):

```
corepack pnpm@11.16.0 --filter @sdh/web dev      # dev server, http://localhost:5173
corepack pnpm@11.16.0 --filter @sdh/web build    # production build -> dist/
corepack pnpm@11.16.0 --filter @sdh/web preview   # serve the built app
```

The dev server proxies `/api` to the local backend on `http://127.0.0.1:3001`.
Without the backend running, API-backed screens fall back to labelled demo data.

## PWA icons

App icons are generated from `assets/app_icon.png` into `public/icons/`:

```
node scripts/generate-icons.mjs
```

Produces `pwa-192.png`, `pwa-512.png` (tight-cropped), `maskable-512.png`
(safe-padded on brand red), and `apple-touch-icon.png` (180). Re-run only if the
source icon changes.

## Dev-only role preview

The Young/Elderly role will come from authentication; there is no in-app toggle.
During development you can preview either role:

- URL query (dev only): `http://localhost:5173/?role=elderly`
- Env var: copy `.env.local.example` to `.env.local` and set `VITE_DEV_ROLE=elderly`

Default role is `young`. "Easy View" (larger text/controls) is also available to
everyone as an independent accessibility toggle in the top bar.

## Testing the PWA on a phone (HTTPS required)

Service workers and "Add to Home Screen" need HTTPS (or `localhost`). Phones on
your LAN hitting your dev machine by IP are not treated as secure, so use a
tunnel that provides HTTPS. Steps:

1. Build and preview the production app:
   ```
   corepack pnpm@11.16.0 --filter @sdh/web build
   corepack pnpm@11.16.0 --filter @sdh/web preview -- --host --port 4173
   ```
2. Expose it over HTTPS with a tunnel (any one of these):
   - `npx localtunnel --port 4173`
   - `cloudflared tunnel --url http://localhost:4173`
   - `ngrok http 4173`
3. Open the HTTPS URL the tunnel prints on your phone.

### Android (Chrome)
- Open the HTTPS URL. Chrome shows an install prompt or an "Install app" item in
  the ⋮ menu. Install it; it launches standalone (no browser chrome) with the
  Township Connect icon.
- Verify offline: enable airplane mode and reopen from the home screen — the app
  shell loads; API data falls back to demo content.

### iOS (Safari)
- Open the HTTPS URL in Safari (not Chrome — iOS only installs PWAs from Safari).
- Tap Share → "Add to Home Screen" → Add. It launches full-screen with the
  apple-touch icon.
- iOS has no automatic install prompt; the manual step above is expected.

## What is cached

- App shell + static assets are precached for offline launch.
- `/api/*` uses NetworkFirst with a 5-minute cap, so live safety/township/
  community data is never served stale indefinitely.
