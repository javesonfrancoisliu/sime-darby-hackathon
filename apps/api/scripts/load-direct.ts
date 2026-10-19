// Direct mode of the content loader: calls the same service functions the coordinator routes call.
// Imported lazily by load-content.ts after the table and region env are set.
import { ChallengesQuery, type Paged, type Notice } from "@sdh/contracts";
import { HttpError } from "../src/lib/http";
import { allQuizzes, createQuiz } from "../src/modules/quizzes/service";
import { createBadge, listFor as listBadges } from "../src/modules/badges/service";
import { createChallenge, listFor as listChallenges } from "../src/modules/challenges/service";
import { createEvent, listEvents } from "../src/modules/events/service";
import { createNotice, listNotices } from "../src/modules/notices/service";
import { createReward, listFor as listRewards } from "../src/modules/rewards/service";
import {
  createFacilityReport,
  loadSafety,
  patchFacilityReport,
  saveReading,
} from "../src/modules/safety/service";
import { saveTownship } from "../src/modules/township/service";
import { syntheticCoordinator, type validateAllContent } from "./loader-lib";

type Content = ReturnType<typeof validateAllContent>;
type Tally = (type: string, created: boolean) => void;

const PAGE_LIMIT = 50;
const MAX_PAGES = 20;

// A readable one-line reason that never includes item data.
export function describeDirectError(err: unknown): string {
  if (err instanceof HttpError) return `${err.code}: ${err.message}`;
  if (err instanceof Error)
    return `${err.name}: the write or read failed (check credentials, table and region)`;
  return "Load failed";
}

async function allNotices(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data: Paged<Notice> = await listNotices({
      limit: PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    for (const n of data.items) map.set(n.title, n.id);
    cursor = data.nextCursor;
    if (!cursor) break;
  }
  return map;
}

async function createIfMissing<T extends { id: string }>(
  tally: Tally,
  type: string,
  existing: Map<string, string>,
  title: string,
  create: () => Promise<T>,
): Promise<string> {
  const found = existing.get(title);
  if (found) {
    tally(type, false);
    return found;
  }
  const { id } = await create();
  existing.set(title, id);
  tally(type, true);
  return id;
}

const byTitle = (items: { title: string; id: string }[]) =>
  new Map(items.map((i) => [i.title, i.id]));

export async function loadDirect(content: Content, tally: Tally): Promise<void> {
  const coordinator = syntheticCoordinator();

  await saveTownship(content.township);
  tally("township", true);

  const noticeIds = await allNotices();
  for (const n of content.notices) {
    await createIfMissing(tally, "notices", noticeIds, n.title, () => createNotice(coordinator, n));
  }

  for (const r of content.safetyReadings) {
    await saveReading(r);
    tally("safety readings", true);
  }

  const facilityIds = byTitle((await loadSafety()).facilityReports);
  for (const f of content.facilityReports) {
    const known = facilityIds.has(f.body.title);
    const id = await createIfMissing(tally, "facility reports", facilityIds, f.body.title, () =>
      createFacilityReport(f.body),
    );
    if (!known && f.status !== "reported") await patchFacilityReport(id, { status: f.status });
  }

  const eventIds = byTitle(await listEvents());
  for (const e of content.events) {
    await createIfMissing(tally, "events", eventIds, e.title, () => createEvent(coordinator, e));
  }

  const quizIds = byTitle(await allQuizzes());
  await createIfMissing(tally, "quizzes", quizIds, content.quiz.title, () =>
    createQuiz(content.quiz),
  );

  const challengeIds = byTitle(await listChallenges(coordinator, ChallengesQuery.parse({})));
  for (const c of content.challenges) {
    let body = c.body;
    if (c.quizTitle) {
      const quizId = quizIds.get(c.quizTitle);
      if (!quizId) throw new Error(`Quiz "${c.quizTitle}" was not found after loading`);
      body = { ...body, quizId };
    }
    const final = body;
    await createIfMissing(tally, "challenges", challengeIds, final.title, () =>
      createChallenge(coordinator, final),
    );
  }

  const rewardIds = byTitle(await listRewards(coordinator));
  for (const r of content.rewards) {
    await createIfMissing(tally, "rewards", rewardIds, r.title, () => createReward(r));
  }

  const badgeIds = byTitle(await listBadges(coordinator));
  for (const b of content.badges) {
    await createIfMissing(tally, "badges", badgeIds, b.title, () => createBadge(b));
  }
}
