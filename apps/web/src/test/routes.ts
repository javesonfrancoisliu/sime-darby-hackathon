import { NO_CONTRIBUTIONS, SETTINGS, TOWNSHIP, makePoints, type VOLUNTEER } from "./fixtures";

// Every GET the app makes for a signed-in person, answering "nothing yet". Tests override the few
// routes they care about; an unlisted route answers 404 so a stray call fails loudly.
export function signedInRoutes(user: typeof VOLUNTEER, overrides: Record<string, unknown> = {}) {
  return {
    "GET /api/me": { body: user },
    "GET /api/township": { body: TOWNSHIP },
    "GET /api/notices": { body: { items: [] } },
    "GET /api/events": { body: { events: [] } },
    "GET /api/safety": { body: { readings: [], facilityReports: [] } },
    "GET /api/requests/mine": { body: { requests: [] } },
    "GET /api/opportunities": { body: { items: [] } },
    "GET /api/contributions/mine": { body: NO_CONTRIBUTIONS },
    "GET /api/challenges": { body: { challenges: [] } },
    "GET /api/me/points": { body: makePoints(0) },
    "GET /api/rewards": { body: { rewards: [] } },
    "GET /api/badges": { body: { badges: [] } },
    "GET /api/leaderboard": { body: { entries: [] } },
    "GET /api/me/settings": { body: SETTINGS },
    ...overrides,
  } as Parameters<typeof import("./fakeApi").installFakeApi>[0];
}
