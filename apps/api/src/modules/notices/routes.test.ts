import { randomUUID } from "node:crypto";
import type { Notice, Paged } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { putNotice } from "./repository";

useTestTable();

const DAY_MS = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

const update = (overrides: Record<string, unknown> = {}) => ({
  kind: "update",
  title: "Pool open",
  area: "Precinct 1",
  topic: "facilities",
  source: "Management",
  ...overrides,
});

const maintenance = (overrides: Record<string, unknown> = {}) => ({
  kind: "maintenance",
  title: "Water cut",
  area: "Precinct 1",
  topic: "water",
  source: "Management",
  windowStart: ago(-1),
  windowEnd: ago(-2),
  ...overrides,
});

describe("notices", () => {
  let coordinatorId: string;
  let elderId: string;

  beforeAll(async () => {
    coordinatorId = (await createCoordinator()).id;
    elderId = (await createElder()).id;
  });

  const create = async (body: Record<string, unknown>) => {
    const res = await call("POST", "/api/notices", { as: coordinatorId, body });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
    return res.body as Notice;
  };
  const list = async (query: Record<string, string> = {}) => {
    const res = await call("GET", "/api/notices", { as: elderId, query });
    expect(res.status).toBe(200);
    return res.body as Paged<Notice>;
  };

  // Stored directly so published times can be set in the past.
  const seed = async (kind: Notice["kind"], publishedAt: string, extra: Partial<Notice> = {}) => {
    const notice: Notice = {
      id: randomUUID(),
      kind,
      title: `${kind} ${publishedAt}`,
      description: "",
      area: "Precinct 1",
      topic: "x",
      priority: "normal",
      source: "Management",
      publishedAt,
      createdBy: coordinatorId,
      createdAt: publishedAt,
      updatedAt: publishedAt,
      ...extra,
    };
    await putNotice(notice, false);
    return notice;
  };

  it("restricts writes to coordinators and reads to signed-in users", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    for (const as of [elderId, volunteer.id]) {
      expect((await call("POST", "/api/notices", { as, body: update() })).status).toBe(403);
      expect(
        (await call("PATCH", `/api/notices/${randomUUID()}`, { as, body: { title: "x" } })).status,
      ).toBe(403);
    }
    expect((await call("GET", "/api/notices")).status).toBe(401);
    expect((await call("GET", "/api/notices", { as: volunteer.id })).status).toBe(200);
  });

  it("validates bodies, maintenance windows and ids", async () => {
    const post = (body: unknown) => call("POST", "/api/notices", { as: coordinatorId, body });
    expect((await post(update({ title: "" }))).status).toBe(400);
    expect((await post(update({ extra: 1 }))).status).toBe(400);
    expect((await post(maintenance({ windowStart: undefined }))).status).toBe(400);
    expect((await post(maintenance({ windowStart: ago(-3), windowEnd: ago(-2) }))).status).toBe(
      400,
    );
    expect((await post(update({ status: "completed" }))).status).toBe(400);
    const patch = (id: string, body: unknown) =>
      call("PATCH", `/api/notices/${id}`, { as: coordinatorId, body });
    expect((await patch("nope", { title: "x" })).status).toBe(400);
    expect((await patch(randomUUID(), { title: "x" })).status).toBe(404);
    expect((await patch(randomUUID(), {})).status).toBe(400);
    expect((await call("GET", "/api/notices", { as: elderId, query: { kind: "x" } })).status).toBe(
      400,
    );
    expect(
      (await call("GET", "/api/notices", { as: elderId, query: { cursor: "bad" } })).status,
    ).toBe(400);
  });

  it("stores times in UTC and defaults maintenance status", async () => {
    const created = await create(
      maintenance({
        windowStart: "2030-01-01T08:00:00+08:00",
        windowEnd: "2030-01-01T10:00:00+08:00",
      }),
    );
    expect(created).toMatchObject({
      windowStart: "2030-01-01T00:00:00.000Z",
      windowEnd: "2030-01-01T02:00:00.000Z",
      status: "scheduled",
      priority: "normal",
      description: "",
      createdBy: coordinatorId,
    });
    const plain = await create(update());
    expect(plain).not.toHaveProperty("windowStart");
    expect(plain).not.toHaveProperty("status");
  });

  it("lists newest first, merged across kinds, and pages with a cursor", async () => {
    const base = Date.parse("2020-01-01T00:00:00.000Z");
    const at = (n: number) => new Date(base + n * 1000).toISOString();
    const made = [
      await seed("update", at(1)),
      await seed("maintenance", at(2)),
      await seed("update", at(3)),
      await seed("maintenance", at(4)),
      await seed("update", at(5)),
    ];
    const newest = [...made].reverse().map((n) => n.id);
    const mine = new Set(newest);
    const only = (page: Paged<Notice>) => page.items.filter((n) => mine.has(n.id)).map((n) => n.id);

    const first = await list({ limit: "50" });
    expect(only(first)).toEqual(newest.filter((id) => only(first).includes(id)));

    // Page through only the 2020 items: a fresh kind-scoped walk plus merged walk.
    const collected: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 30; i++) {
      const page = await list({ limit: "2", ...(cursor ? { cursor } : {}) });
      expect(page.items.length).toBeLessThanOrEqual(2);
      collected.push(...page.items.map((n) => n.id));
      cursor = page.nextCursor;
      if (!cursor) break;
    }
    expect(cursor).toBeUndefined();
    expect(collected.filter((id) => mine.has(id))).toEqual(newest);
    expect(new Set(collected).size).toBe(collected.length);

    const updates = await list({ kind: "update", limit: "50" });
    expect(updates.items.every((n) => n.kind === "update")).toBe(true);
    const dates = updates.items.map((n) => n.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("rejects a cursor from another kind", async () => {
    await seed("update", ago(100));
    await seed("update", ago(101));
    const page = await list({ kind: "update", limit: "1" });
    expect(page.nextCursor).toBeDefined();
    const res = await call("GET", "/api/notices", {
      as: elderId,
      query: { kind: "maintenance", cursor: page.nextCursor as string },
    });
    expect(res.status).toBe(400);
  });

  it("hides completed maintenance whose window ended over 7 days ago", async () => {
    const stale = await seed("maintenance", ago(30), {
      status: "completed",
      windowStart: ago(31),
      windowEnd: ago(8),
    });
    const recent = await seed("maintenance", ago(30), {
      status: "completed",
      windowStart: ago(31),
      windowEnd: ago(6),
    });
    const old = await seed("maintenance", ago(30), {
      status: "scheduled",
      windowStart: ago(31),
      windowEnd: ago(8),
    });
    for (const query of [{ limit: "50" }, { kind: "maintenance", limit: "50" }] as Record<
      string,
      string
    >[]) {
      const ids = (await list(query)).items.map((n) => n.id);
      expect(ids).not.toContain(stale.id);
      expect(ids).toContain(recent.id);
      expect(ids).toContain(old.id);
    }
  });

  it("patches fields, keeps publishedAt and refreshes updatedAt", async () => {
    const created = await create(maintenance());
    const res = await call("PATCH", `/api/notices/${created.id}`, {
      as: coordinatorId,
      body: { status: "in_progress", priority: "high", windowEnd: "2031-01-01T10:00:00+08:00" },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      status: "in_progress",
      priority: "high",
      windowEnd: "2031-01-01T02:00:00.000Z",
      publishedAt: created.publishedAt,
    });
    const bad = await call("PATCH", `/api/notices/${created.id}`, {
      as: coordinatorId,
      body: { windowEnd: ago(1000) },
    });
    expect(bad.status).toBe(400);
    const plain = await create(update());
    const onUpdate = await call("PATCH", `/api/notices/${plain.id}`, {
      as: coordinatorId,
      body: { status: "completed" },
    });
    expect(onUpdate.status).toBe(400);
    const retitled = await call("PATCH", `/api/notices/${plain.id}`, {
      as: coordinatorId,
      body: { title: "New title" },
    });
    expect(retitled.body).toMatchObject({ title: "New title", kind: "update" });
  });
});
