# Township Connect — Frontend Handover (Young Resident / Module 2)

Owner: Justina (Module 2 — Centralised Neighbourhood Information + Young-role features).
Status: frontend prototype complete and verified. All dynamic data is **simulated
demo data** unless explicitly noted. No backend or shared-contract changes were made.

## 1. Completed features and routes

| Route | Page | Notes |
| --- | --- | --- |
| `/` | Home dashboard | Role-aware; Young sees a slim Help-a-Neighbour CTA + safety/community summaries |
| `/community` | Neighbourhood Hub | Events, maintenance, volunteering, township updates; filter + search; a young-only Challenges entry card |
| `/community/challenges` | Community Challenges | **Young only** (route-guarded); Challenges / Leaderboard / Rewards tabs; environmental quiz |
| `/volunteer` | Volunteer Nearby | **Young only**; sort (nearest/soonest/urgent), geolocation + demo fallback, accept, My accepted tasks, verify |
| `/safety` | Safety (placeholder) | **TEAMMATE-OWNED** — stub only |
| `/profile` | Profile | Personal info, volunteer preferences, claimed rewards, settings, demo controls |

Navigation: shared `AppShell` with desktop sidebar + mobile bottom nav. Young nav:
Home / Community / Volunteer / Safety / Profile. Role comes from `RoleProvider`
(dev preview via `?role=elderly` or `VITE_DEV_ROLE`); there is no production role toggle.

PWA: installable (manifest + service worker via `vite-plugin-pwa`), custom icon,
offline app-shell precache, `/api` NetworkFirst with a 5-min cap.

## 2. Main components and shared providers

Providers (mounted once in `src/App.tsx`, wrap the whole app so state is shared):
- `RoleProvider` (`components/layout/RoleContext.tsx`) — role, easyView (elderly), confirmActions.
- `GamificationProvider` (`data/useGamification.tsx`) — challenges, progress, points ledger, badges, achievements, rewards, claimed rewards, leaderboard.
- `AcceptedTasksProvider` (`data/AcceptedTasksContext.tsx`) — accepted → completed → verified Help-a-Neighbour tasks.
- `ProfileProvider` (`data/ProfileContext.tsx`) — profile prefs + mock settings.

Shared UI kit (`components/ui/`): `AppButton`, `AppLinkButton`, `InfoCard`,
`PageHeader`, `StatusBadge`, `Pill`, `FormField`, `Modal`, `ConfirmationDialog`,
`EmptyState`, `LoadingState`, `ProgressBar`, `DemoTag`. Design tokens in
`styles/design-tokens.css`; app/layout CSS in `styles/app.css`.

Feature components: `components/community/*`, `components/volunteer/*`,
`components/challenges/*`, `components/profile/*`, `components/demo/DemoControls.tsx`.

Pure, tested logic: `lib/points.ts` (points ledger + de-dupe) and
`lib/rewards.ts` (redemption migration + claim). Geo helpers in `lib/geo.ts`,
`lib/useGeolocation.ts`.

## 3. Mock data and localStorage

Mock data: `data/community.mock.ts`, `data/volunteer.mock.ts`,
`data/gamification.mock.ts`. All records carry `isDemoData` and are labelled
"Demo data" in the UI.

localStorage keys (all demo state, all cleared by Demo Controls reset):
- `tc.points.ledger`, `tc.challenge.progress`, `tc.verifiedVolunteerTasks`, `tc.redeemedRewards`
- `tc.acceptedTasks`
- `tc.profile.prefs`, `tc.profile.settings`

Note: `tc.redeemedRewards` was migrated from an older `string[]` shape to
`Record<id, {redeemedAt?}>`. Pre-existing claims are preserved WITHOUT an invented
date (see `lib/rewards.ts` + `lib/rewards.test.ts`).

## 4. Run, build, test

From the repo root (pnpm via corepack; pnpm is not on PATH here):

```
corepack pnpm@11.16.0 install
corepack pnpm@11.16.0 --filter @sdh/web dev        # http://localhost:5173
corepack pnpm@11.16.0 --filter @sdh/web build      # dist/ + PWA artifacts
corepack pnpm@11.16.0 --filter @sdh/web preview -- --host --port 4173
corepack pnpm@11.16.0 --filter @sdh/web typecheck
corepack pnpm@11.16.0 exec eslint apps/web/src
corepack pnpm@11.16.0 --filter @sdh/web exec vitest run
```

Regenerate PWA icons from `assets/app_icon.png` (only if the source changes):
`node apps/web/scripts/generate-icons.mjs`.

iPhone PWA testing: use an HTTPS tunnel without an interstitial (Cloudflare Tunnel
recommended) against the `preview` server; delete + re-add the Home Screen app when
the tunnel URL changes.

## 5. Demo controls

A dev/demo-only "Demo controls" card on Profile resets ALL demo state (tasks,
challenges, points, rewards, profile prefs). Shown when `import.meta.env.DEV` OR
`VITE_DEMO_CONTROLS=true` (see `.env.local.example`). It is a visibility flag only,
NOT authentication or a security boundary.

## 6. Frontend ↔ backend integration (live mode)

Profile → **Demo sign-in** picks a seeded user (`GET /api/demo/users`) and stores
its id in `tc.demoUserId`; `lib/api.ts` sends it as `X-Demo-User`. Signed out,
the app runs on labelled demo data as before. Signed in ("live mode"):

- `data/SessionContext.tsx` loads `GET /api/me`; the user's role drives the app
  role (`elder` → elderly, otherwise young) and the verification badge.
- `data/useVolunteer.ts` — `GET /api/opportunities` + `GET /api/contributions/mine`.
  Errors are shown (with Try again), never replaced by mock data. Urgency is
  derived from how soon the task starts (the API has no urgency field).
- `data/AcceptedTasksContext.tsx` — tasks from `GET /api/requests/mine` + joined
  events from `GET /api/events`; accept → `POST /api/requests/{id}/accept`, join →
  `POST /api/events/{id}/join`, complete → `POST /api/requests/{id}/complete`
  with the minutes the volunteer enters (prefilled with the planned duration).
- Community → event "Register to attend" → `POST /api/events/{id}/join` for API events.
- "Confirm (Demo)" stays on-device in both modes: the API has no resident
  confirmation step yet.

Run it locally:

```
pnpm db:up && pnpm db:setup && pnpm db:seed   # DynamoDB Local + demo data
pnpm --filter @sdh/api dev                     # API on :3001
pnpm --filter @sdh/web dev                     # web on :5173, proxies /api
```

Then Profile → Demo sign-in → "Justina Tan — Volunteer" (verified). "Aiman Hakim"
is a pending volunteer (shows the not-verified path); the residents use the elderly view.

## 7. Backend contract mismatches to resolve later

Documented in `docs/FUTURE_REQUIREMENTS.md`. Summary:
- **Assistance time**: completion asks for minutes spent again (prefilled with the
  planned duration) because `CompleteRequestBody` requires `minutesSpent`.
- **Resident confirmation**: the API completes a request on the volunteer's word;
  the frontend's "Confirm (Demo)" step has no backend equivalent yet.
- **Languages**: profile "preferred languages" is frontend-only; `User` in
  `@sdh/contracts` has no `languages` field yet. Promote it there before using it in
  real matching.
- **Help-a-Neighbour status model**: the frontend uses a demo-only
  `accepted → completed → verified` model, deliberately separate from the backend
  `pending_review → open → matched → completed` machine. Map these when wiring the API.

## 8. Simulated vs. real

Everything dynamic is **simulated** for the prototype:
- Volunteer accept / complete / verify (localStorage; "Confirm (Demo)" stands in for
  the resident confirming — a volunteer must NOT verify their own task in a real system).
- Challenge join / progress / completion / verification; points, badges, achievements,
  leaderboard, rewards, reward redemption.
- Profile edits and settings toggles (saved on-device only; toggles do not control
  real notifications or enforce privacy).
- Match Scores (see below). Geolocation is real when permission is granted; otherwise
  demo distances.

## 9. Match Scores and future AI

Volunteer Nearby shows a per-opportunity **Match Score (0–100) + reasons**. Currently
these come from mock data (`matchScore`/`reasons` in `data/volunteer.mock.ts`). The
backend already implements a **rule-based** matcher (`apps/api/.../matching/`) returning
the same `Opportunity.matchScore`/`Match.score` + `reason` shape, with an AI-rerank seam
(`selectReranker()` → Bedrock when `MATCHING_AI_MODEL_ID` is set; response carries
`rankedBy: "ai" | "rules"`). Integration path: mock → live rule-based scores (wire the
API) → AI scores (enable the reranker) with NO frontend or contract change — the UI
already renders score + reason and can badge the source. Profile skills/interests/
availability/languages are stored consistently in `ProfileProvider` as the future
inputs; editing them does NOT currently affect any real matching or backend scores.

## 10. Teammate-owned — DO NOT MODIFY

- `src/app/safety/*` and `src/components/safety/*` — Health & Safety (Module 1).
  The current files are placeholders I created only so navigation/Home resolve; the
  teammate replaces them. `SafetyOverview` keeps its `townshipId` prop contract.
- `apps/api/**`, `packages/**` (including `@sdh/contracts`), `infra/**` — backend and
  shared contracts. Read-only from the frontend.
- Shared UI (`components/ui/*`), layout (`components/layout/*`), and
  `styles/design-tokens.css` are shared — change only by agreement.
