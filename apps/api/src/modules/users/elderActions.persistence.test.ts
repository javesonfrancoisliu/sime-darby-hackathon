import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Challenge, CommunityEvent, HelpRequest, Reward, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { db, table } from "../../lib/db";
import { backdate, call, createVerifiedVolunteer } from "../../test/api";
import { createCoordinator, createElder } from "../../test/people";
import { useTestTable } from "../../test/table";
import { createChallengeVia, givePoints } from "../play/testSupport";

useTestTable();

// Reads the stored item itself, so a route that only echoed a value would fail here.
async function item(PK: string, SK: string): Promise<Record<string, unknown> | undefined> {
  const res = await db().send(new GetCommand({ TableName: table(), Key: { PK, SK } }));
  return res.Item;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

describe("every elder action is stored in the table", () => {
  let coordinator: User;
  let elder: User;
  let volunteer: User;

  beforeAll(async () => {
    coordinator = await createCoordinator();
    elder = await createElder({ name: "Auntie Mary" });
    volunteer = await createVerifiedVolunteer(coordinator.id, { name: "Aina" });
  });

  it("create, cancel and confirm a request", async () => {
    const body = {
      category: "groceries",
      title: "Weekly shopping",
      description: "Two bags",
      scheduledAt: inDays(2),
      durationMinutes: 60,
      location: { lat: 3.0738, lng: 101.5183, area: "Elmina West" },
    };
    const created = (await call("POST", "/api/requests", { as: elder.id, body }))
      .body as HelpRequest;
    expect(await item(`REQUEST#${created.id}`, "META")).toMatchObject({
      title: "Weekly shopping",
      elderId: elder.id,
      status: "open",
    });

    const cancelled = await call("POST", `/api/requests/${created.id}/cancel`, { as: elder.id });
    expect(cancelled.status).toBe(200);
    expect(await item(`REQUEST#${created.id}`, "META")).toMatchObject({ status: "cancelled" });

    const second = (await call("POST", "/api/requests", { as: elder.id, body }))
      .body as HelpRequest;
    await call("POST", `/api/requests/${second.id}/accept`, { as: volunteer.id });
    await backdate(second.id);
    await call("POST", `/api/requests/${second.id}/complete`, {
      as: volunteer.id,
      body: { minutesSpent: 30 },
    });
    const confirmed = await call("POST", `/api/requests/${second.id}/confirm`, { as: elder.id });
    expect(confirmed.status).toBe(200);
    const stored = await item(`REQUEST#${second.id}`, "META");
    expect(stored).toMatchObject({ status: "completed" });
    expect(stored?.confirmedAt).toBeDefined();
  });

  it("event register and volunteer sign-up write a signup item", async () => {
    for (const purpose of ["activity", "volunteer_drive"] as const) {
      const made = await call("POST", "/api/events", {
        as: coordinator.id,
        body: {
          title: `Test ${purpose}`,
          category: "digital_literacy",
          purpose,
          startsAt: inDays(7),
          durationMinutes: 60,
          location: { lat: 3.07, lng: 101.52, area: "Elmina West" },
          capacity: 5,
          ...(purpose === "volunteer_drive" ? { organiser: "Township office" } : {}),
        },
      });
      const event = made.body as CommunityEvent;
      const joined = await call("POST", `/api/events/${event.id}/join`, { as: elder.id });
      expect(joined.status).toBe(200);
      expect(await item(`EVENT#${event.id}`, `SIGNUP#${elder.id}`)).toBeDefined();
      expect(await item(`EVENT#${event.id}`, "META")).toMatchObject({ signupCount: 1 });
    }
  });

  it("check-in stores the streak and a ledger entry", async () => {
    const res = await call("POST", "/api/me/check-in", { as: elder.id });
    expect(res.status).toBe(200);
    expect(await item(`USER#${elder.id}`, "STREAK")).toMatchObject({ current: 1, best: 1 });
    expect(await item(`USER#${elder.id}`, "PROFILE")).toMatchObject({ points: 10 });
  });

  it("Add my part stores the team day and the precinct count", async () => {
    const team = (await createChallengeVia(coordinator.id, {
      mode: "team",
      goal: { target: 100, unit: "contributions", type: "count" },
    })) as Challenge;
    const res = await call("POST", `/api/challenges/${team.id}/contribute`, { as: elder.id });
    expect(res.status).toBe(200);
    const stored = await item(`CHALLENGE#${team.id}`, `TEAM#${elder.area}`);
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored)).toContain("1");
  });

  it("redeem stores the redemption and the new balance", async () => {
    const reward = (
      await call("POST", "/api/rewards", {
        as: coordinator.id,
        body: { title: "Kopi voucher", pointsCost: 40, icon: "coffee", category: "food" },
      })
    ).body as Reward;
    await givePoints(elder.id, 100);
    const before = (await item(`USER#${elder.id}`, "PROFILE"))?.points as number;
    const res = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: elder.id });
    expect(res.status).toBe(200);
    expect(await item(`USER#${elder.id}`, `REDEEM#${reward.id}`)).toBeDefined();
    expect((await item(`USER#${elder.id}`, "PROFILE"))?.points).toBe(before - 40);
  });

  it("Medical ID add, edit and remove", async () => {
    const medical = {
      bloodGroup: "O+",
      nextOfKinName: "Lim Ah Kow",
      nextOfKinRelation: "Son",
      nextOfKinPhone: "012-345 6789",
    };
    await call("PUT", "/api/me/medical-id", { as: elder.id, body: medical });
    expect(await item(`USER#${elder.id}`, "MEDICAL")).toMatchObject(medical);
    await call("PUT", "/api/me/medical-id", {
      as: elder.id,
      body: { ...medical, bloodGroup: "A+" },
    });
    expect(await item(`USER#${elder.id}`, "MEDICAL")).toMatchObject({ bloodGroup: "A+" });
    const removed = await call("DELETE", "/api/me/medical-id", { as: elder.id });
    expect(removed.status).toBe(204);
    expect(await item(`USER#${elder.id}`, "MEDICAL")).toBeUndefined();
  });

  it("accessibility settings and the profile name are stored", async () => {
    const settings = {
      fontSize: "xlarge",
      highContrast: true,
      reducedMotion: true,
      voiceAssist: true,
      notifyEvents: true,
      notifyVolunteering: false,
      shareApproxLocation: true,
    };
    await call("PUT", "/api/me/settings", { as: elder.id, body: settings });
    expect(await item(`USER#${elder.id}`, "SETTINGS")).toMatchObject(settings);

    const patched = await call("PATCH", "/api/me", {
      as: elder.id,
      body: { name: "Auntie Mary Lee" },
    });
    expect(patched.status).toBe(200);
    expect(await item(`USER#${elder.id}`, "PROFILE")).toMatchObject({ name: "Auntie Mary Lee" });
  });
});
