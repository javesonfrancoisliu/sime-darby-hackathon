// Loads fictional City of Elmina content through the coordinator API routes.
// Usage: pnpm --filter @sdh/api load:content -- --base-url <url>
// Deployed: set COORDINATOR_TOKEN (bearer). Local: optional COORDINATOR_DEMO_USER_ID (else looked up from /api/demo/users).
import {
  authHeaders,
  errorCodeOf,
  isLoopbackUrl,
  parseBaseUrl,
  resolveAuth,
  validateAllContent,
  type Auth,
} from "./loader-lib";

const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_LIMIT = 50;
const MAX_PAGES = 20;

class LoadError extends Error {}

type Counts = Record<string, { created: number; skipped: number }>;
const counts: Counts = {};
function tally(type: string, created: boolean) {
  const c = (counts[type] ??= { created: 0, skipped: 0 });
  if (created) c.created += 1;
  else c.skipped += 1;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const baseUrl = parseBaseUrl(process.argv.slice(2));
if (!baseUrl) fail("Usage: load:content -- --base-url <url>");
const resolved = resolveAuth(baseUrl, process.env);
if (!resolved.ok) fail(resolved.error);
const auth: Auth = resolved.auth;
let demoUserId: string | undefined;

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...authHeaders(auth, demoUserId),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new LoadError(`${method} ${path} failed: could not reach ${baseUrl}`);
  }
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }
  if (!res.ok) {
    throw new LoadError(`${method} ${path} failed: ${res.status} ${errorCodeOf(parsed)}`);
  }
  return parsed;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const asList = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.map(asRecord) : []);
const titleOf = (item: Record<string, unknown>) =>
  typeof item.title === "string" ? item.title : undefined;
const idOf = (item: Record<string, unknown> | undefined) =>
  typeof item?.id === "string" ? item.id : undefined;

// Existing items by title, following the cursor on paged routes.
async function titleMap(path: string, key: string, paged = false): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const query = paged
      ? `${sep}limit=${PAGE_LIMIT}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      : "";
    const data = asRecord(await call("GET", `${path}${query}`));
    for (const item of asList(data[key])) {
      const title = titleOf(item);
      const id = idOf(item);
      if (title && id) map.set(title, id);
    }
    cursor = typeof data.nextCursor === "string" ? data.nextCursor : undefined;
    if (!paged || !cursor) break;
  }
  return map;
}

async function createIfMissing(
  type: string,
  existing: Map<string, string>,
  title: string,
  path: string,
  body: unknown,
): Promise<string | undefined> {
  const found = existing.get(title);
  if (found) {
    tally(type, false);
    return found;
  }
  const id = idOf(asRecord(await call("POST", path, body)));
  if (id) existing.set(title, id);
  tally(type, true);
  return id;
}

async function main() {
  const content = validateAllContent();

  if (auth.kind === "demo" && !auth.userId) {
    if (!isLoopbackUrl(baseUrl!)) throw new LoadError("Demo sign-in is only for local URLs");
    const users = asList(asRecord(await call("GET", "/api/demo/users?role=coordinator")).users);
    demoUserId = idOf(users.find((u) => u.role === "coordinator") ?? users[0]);
    if (!demoUserId) throw new LoadError("No coordinator found; seed the local database first");
  }

  await call("PUT", "/api/township", content.township);
  tally("township", true);

  const noticeIds = await titleMap("/api/notices", "items", true);
  for (const n of content.notices)
    await createIfMissing("notices", noticeIds, n.title, "/api/notices", n);

  for (const r of content.safetyReadings) {
    await call("PUT", "/api/safety/readings", r);
    tally("safety readings", true);
  }

  const safety = asRecord(await call("GET", "/api/safety"));
  const facilityIds = new Map<string, string>();
  for (const f of asList(safety.facilityReports)) {
    const title = titleOf(f);
    const id = idOf(f);
    if (title && id) facilityIds.set(title, id);
  }
  for (const f of content.facilityReports) {
    const known = facilityIds.has(f.body.title);
    let id = await createIfMissing(
      "facility reports",
      facilityIds,
      f.body.title,
      "/api/facility-reports",
      f.body,
    );
    if (!known && f.status !== "reported") {
      if (!id) {
        const again = asRecord(await call("GET", "/api/safety"));
        id = idOf(asList(again.facilityReports).find((x) => titleOf(x) === f.body.title));
      }
      if (!id) throw new LoadError("Facility report created but its id could not be found");
      await call("PATCH", `/api/facility-reports/${id}`, { status: f.status });
    }
  }

  const eventIds = await titleMap("/api/events", "events");
  for (const e of content.events)
    await createIfMissing("events", eventIds, e.title, "/api/events", e);

  const quizIds = await titleMap("/api/quizzes", "quizzes");
  await createIfMissing("quizzes", quizIds, content.quiz.title, "/api/quizzes", content.quiz);

  const challengeIds = await titleMap("/api/challenges", "challenges");
  for (const c of content.challenges) {
    let body = c.body;
    if (c.quizTitle) {
      const quizId = quizIds.get(c.quizTitle);
      if (!quizId) throw new LoadError(`Quiz "${c.quizTitle}" was not found after loading`);
      body = { ...body, quizId };
    }
    await createIfMissing("challenges", challengeIds, body.title, "/api/challenges", body);
  }

  const rewardIds = await titleMap("/api/rewards", "rewards");
  for (const r of content.rewards)
    await createIfMissing("rewards", rewardIds, r.title, "/api/rewards", r);

  const badgeIds = await titleMap("/api/badges", "badges");
  for (const b of content.badges)
    await createIfMissing("badges", badgeIds, b.title, "/api/badges", b);
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : "Load failed");
  process.exit(1);
}

console.info(`Loaded content into ${baseUrl}`);
for (const [type, c] of Object.entries(counts)) {
  console.info(`  ${type}: ${c.created} created or updated, ${c.skipped} skipped`);
}
