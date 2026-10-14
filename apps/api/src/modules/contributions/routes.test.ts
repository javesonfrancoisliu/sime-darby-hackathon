import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import type { Contribution, ContributionsResponse } from "@sdh/contracts";
import { describe, expect, it } from "vitest";
import { db } from "../../lib/db";
import { call, createUser } from "../../test/api";
import { useTestTable } from "../../test/table";
import { contributionPut } from "./repository";

useTestTable();

const contribution = (volunteerId: string, minutes: number, completedAt: string): Contribution => ({
  id: randomUUID(),
  volunteerId,
  source: "request",
  sourceId: randomUUID(),
  title: "Grocery trip",
  minutes,
  completedAt,
});

describe("contributions", () => {
  it("summarises a volunteer's hours newest first", async () => {
    const volunteer = await createUser("volunteer");
    const older = contribution(volunteer.id, 45, "2026-10-10T10:00:00.000Z");
    const newer = contribution(volunteer.id, 30, "2026-10-12T10:00:00.000Z");
    await db().send(
      new TransactWriteCommand({ TransactItems: [contributionPut(older), contributionPut(newer)] }),
    );

    const res = await call("GET", "/api/contributions/mine", { as: volunteer.id });
    const body = res.body as ContributionsResponse;
    expect(res.status).toBe(200);
    expect(body.totalMinutes).toBe(75);
    expect(body.completedCount).toBe(2);
    expect(body.items.map((item) => item.id)).toEqual([newer.id, older.id]);
  });

  it("returns an empty summary for a new volunteer and 403 for other roles", async () => {
    const volunteer = await createUser("volunteer");
    const elder = await createUser("elder");
    const empty = await call("GET", "/api/contributions/mine", { as: volunteer.id });
    expect(empty.body).toEqual({ totalMinutes: 0, completedCount: 0, items: [] });
    expect((await call("GET", "/api/contributions/mine", { as: elder.id })).status).toBe(403);
  });
});
