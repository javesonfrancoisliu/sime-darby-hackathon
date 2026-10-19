# Help a Neighbour (portal)

The shared sign-in and account app, served at `/`. Residents sign in or create an account here, then land in the Elderly app (`/elder/`) or the Youth app (`/volunteer/`) by role. It also holds the account pages (`/account`): change name, email and password. Vite, React 19, TypeScript and React Router 7. No service worker and no manifest. Sign-in talks to Cognito through `@sdh/auth`; profiles go through `/api/me`.

## Run

```
pnpm --filter @sdh/portal dev       # http://localhost:5175 (port is fixed)
pnpm --filter @sdh/portal build
pnpm --filter @sdh/portal preview   # http://localhost:4175
pnpm --filter @sdh/portal test
```

Settings, in `apps/portal/.env.local` (same names the deploy script sets):

- `VITE_COGNITO_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

Without all three the app shows "Sign-in is not set up in this build." with links to the two apps.

## All three apps on one address locally

Start the API, the volunteer app (`pnpm --filter @sdh/web dev`, base `/volunteer/`), the elderly app (`pnpm --filter @sdh/elderly-web dev`, base `/elder/`) and the portal, then open http://localhost:5175. The portal dev server proxies `/api`, `/elder` and `/volunteer`. Set `ELDER_DEV_URL` or `VOLUNTEER_DEV_URL` if those apps run on other ports.
