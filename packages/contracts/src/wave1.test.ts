import { describe, expect, it } from "vitest";
import {
  CreateEventBody,
  CreateNoticeBody,
  MedicalId,
  PutMedicalIdBody,
  QuizPublic,
  SafetyReading,
  UpdateMeBody,
} from "./index";

describe("new contracts", () => {
  it("rejects points in the self-update body", () => {
    expect(UpdateMeBody.safeParse({ points: 999 }).success).toBe(false);
    expect(UpdateMeBody.safeParse({ leaderboardOptIn: true }).success).toBe(true);
  });

  it("defaults event purpose and organiser on create", () => {
    const parsed = CreateEventBody.parse({
      title: "Walk",
      category: "community_activity",
      startsAt: "2026-11-01T08:00:00+08:00",
      durationMinutes: 60,
      location: { lat: 3, lng: 101, area: "Elmina West" },
      capacity: 10,
    });
    expect(parsed.purpose).toBe("activity");
    expect(parsed.organiser).toBe("");
  });

  it("discriminates safety readings by type", () => {
    const base = {
      area: "Elmina West",
      value: 1,
      unit: "x",
      advice: "ok",
      measuredAt: "2026-10-19T00:00:00Z",
    };
    expect(SafetyReading.safeParse({ type: "air", level: "good", ...base }).success).toBe(true);
    expect(SafetyReading.safeParse({ type: "air", level: "danger", ...base }).success).toBe(false);
    expect(SafetyReading.safeParse({ type: "water", level: "watch", ...base }).success).toBe(false);
  });

  it("requires a window for maintenance notices only", () => {
    const base = { title: "t", area: "a", topic: "water", source: "mgmt" };
    expect(CreateNoticeBody.safeParse({ ...base, kind: "maintenance" }).success).toBe(false);
    expect(CreateNoticeBody.safeParse({ ...base, kind: "update" }).success).toBe(true);
  });

  it("validates Malaysian phone numbers in the medical id", () => {
    const body = { bloodGroup: "O+", nextOfKinName: "A", nextOfKinRelation: "Son" };
    for (const ok of ["012-345 6789", "+60123456789", "0312345678"]) {
      expect(PutMedicalIdBody.safeParse({ ...body, nextOfKinPhone: ok }).success).toBe(true);
    }
    for (const bad of ["12345", "+1 555 123 4567", "abc"]) {
      expect(PutMedicalIdBody.safeParse({ ...body, nextOfKinPhone: bad }).success).toBe(false);
    }
    expect(MedicalId.shape.bloodGroup.options).toContain("unknown");
  });

  it("strips correctIndex from the public quiz", () => {
    const parsed = QuizPublic.parse({
      id: "6f1b3a52-6f0a-4c33-9d7e-0a1f6c1d2e01",
      title: "q",
      passMark: 1,
      createdAt: "2026-10-19T00:00:00Z",
      updatedAt: "2026-10-19T00:00:00Z",
      questions: [{ id: "1", question: "?", options: ["a", "b", "c", "d"], correctIndex: 2 }],
    });
    expect(parsed.questions[0]).not.toHaveProperty("correctIndex");
  });
});
