import type { User } from "@sdh/contracts";
import { describe, expect, it } from "vitest";
import { rankVolunteers, scoreVolunteer, type MatchTarget } from "./scoring";
import { SHORTLIST_SIZE } from "./weights";

const ORIGIN = { lat: 3.1, lng: 101.5 };
// One degree of latitude is about 111 km, so 0.01 is about 1.1 km.
const at = (km: number) => ({ lat: ORIGIN.lat + km / 111.19, lng: ORIGIN.lng });

// Saturday 09:30 in Malaysia time.
const SAT_0930_MYT = "2026-10-17T01:30:00Z";

const target: MatchTarget = {
  category: "groceries",
  title: "Weekly shopping",
  description: "Need help carrying shopping",
  scheduledAt: SAT_0930_MYT,
  durationMinutes: 60,
  location: ORIGIN,
};

let counter = 0;
const volunteer = (overrides: Partial<User> = {}): User => {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    name: `Volunteer ${counter}`,
    area: "Precinct 3",
    location: ORIGIN,
    skills: [],
    experience: "",
    availability: [],
    role: "volunteer",
    verification: "verified",
    points: 0,
    lifetimePoints: 0,
    interests: [],
    languages: [],
    leaderboardOptIn: false,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
};

const slot = { day: "sat", start: "09:00", end: "12:00" } as const;

describe("scoreVolunteer components", () => {
  it("gives full skill credit when the category is a skill", () => {
    const result = scoreVolunteer(volunteer({ skills: ["groceries"] }), target);
    expect(result?.components.skill).toBe(1);
    expect(result?.reasons).toContain("Has helped with groceries");
  });

  it("gives half skill credit for a keyword in the experience, case-insensitive", () => {
    const result = scoreVolunteer(volunteer({ experience: "I do Pasar runs" }), target);
    expect(result?.components.skill).toBe(0.5);
    expect(result?.reasons).toContain("Experience mentions pasar");
  });

  it("gives no skill credit otherwise", () => {
    const result = scoreVolunteer(
      volunteer({ skills: ["transport"], experience: "Retired teacher" }),
      target,
    );
    expect(result?.components.skill).toBe(0);
  });

  it("scales proximity linearly on the coarse 0.5 km distance", () => {
    // Same spot still counts as 0.5 km, so proximity tops out at 0.9 with a 5 km radius.
    expect(scoreVolunteer(volunteer(), target)?.components.proximity).toBeCloseTo(0.9, 2);
    expect(scoreVolunteer(volunteer({ location: at(0.3) }), target)?.components.proximity).toBe(
      scoreVolunteer(volunteer({ location: at(0.6) }), target)?.components.proximity,
    );
    const half = scoreVolunteer(volunteer({ location: at(2.5) }), target);
    expect(half?.components.proximity).toBeCloseTo(0.5, 2);
    expect(half?.reasons).toContain("About 2.5 km away");
  });

  it("honours a custom radius", () => {
    const far = volunteer({ location: at(3) });
    expect(scoreVolunteer(far, target, 2)).toBeNull();
    expect(scoreVolunteer(far, target, 10)?.components.proximity).toBeCloseTo(0.7, 2);
  });

  it("combines weights into a rounded 0..100 score", () => {
    const best = scoreVolunteer(volunteer({ skills: ["groceries"], availability: [slot] }), target);
    expect(best?.score).toBe(97);
    const skillOnly = scoreVolunteer(
      volunteer({ skills: ["groceries"], location: at(4.9) }),
      target,
    );
    expect(skillOnly?.score).toBe(50);
  });
});

describe("availability in Malaysia time", () => {
  const withSlot = volunteer({ availability: [slot] });

  it("converts UTC to Saturday 09:30 MYT and fits a 09:00 to 12:00 slot", () => {
    const result = scoreVolunteer(withSlot, target);
    expect(result?.components.availability).toBe(1);
    expect(result?.reasons).toContain("Free on Saturday 09:00 to 12:00");
  });

  it("rejects a 180 minute request starting 11:00", () => {
    const late = { ...target, scheduledAt: "2026-10-17T03:00:00Z", durationMinutes: 180 };
    expect(scoreVolunteer(withSlot, late)?.components.availability).toBe(0);
  });

  it("uses the Malaysia weekday, not the UTC one", () => {
    // 20:00 UTC Friday is 04:00 Saturday in Malaysia.
    const early = volunteer({ availability: [{ day: "sat", start: "03:00", end: "06:00" }] });
    const result = scoreVolunteer(early, { ...target, scheduledAt: "2026-10-16T20:00:00Z" });
    expect(result?.components.availability).toBe(1);
  });

  it("does not match another weekday", () => {
    const sunday = volunteer({ availability: [{ day: "sun", start: "09:00", end: "12:00" }] });
    expect(scoreVolunteer(sunday, target)?.components.availability).toBe(0);
  });

  it("does not match requests that cross midnight", () => {
    const night = volunteer({ availability: [{ day: "sat", start: "20:00", end: "23:59" }] });
    const crossing = { ...target, scheduledAt: "2026-10-17T15:00:00Z", durationMinutes: 120 };
    expect(scoreVolunteer(night, crossing)?.components.availability).toBe(0);
  });
});

describe("eligibility", () => {
  it("excludes unverified volunteers", () => {
    for (const verification of ["pending", "rejected", "not_required"] as const) {
      expect(scoreVolunteer(volunteer({ verification }), target)).toBeNull();
    }
  });

  it("excludes volunteers beyond the radius", () => {
    expect(scoreVolunteer(volunteer({ location: at(5.5) }), target)).toBeNull();
  });
});

describe("rankVolunteers", () => {
  it("orders by score descending", () => {
    const weak = volunteer({ name: "Weak" });
    const strong = volunteer({ name: "Strong", skills: ["groceries"] });
    const ranked = rankVolunteers(target, [weak, strong]);
    expect(ranked.map((r) => r.volunteer.name)).toEqual(["Strong", "Weak"]);
  });

  it("breaks score ties by distance then name", () => {
    // Same 0 skill, no availability; proximity differs but rounds to equal scores.
    const near = volunteer({ name: "Zed", location: at(0.01) });
    const nearer = volunteer({ name: "Amy", location: ORIGIN });
    const alsoNear = volunteer({ name: "Bob", location: ORIGIN });
    const ranked = rankVolunteers(target, [near, alsoNear, nearer]);
    expect(ranked.map((r) => r.volunteer.name)).toEqual(["Amy", "Bob", "Zed"]);
  });

  it("drops ineligible volunteers", () => {
    const ranked = rankVolunteers(target, [
      volunteer({ verification: "pending" }),
      volunteer({ location: at(50) }),
      volunteer(),
    ]);
    expect(ranked).toHaveLength(1);
  });

  it("caps the shortlist", () => {
    const many = Array.from({ length: SHORTLIST_SIZE + 5 }, () => volunteer());
    expect(rankVolunteers(target, many)).toHaveLength(SHORTLIST_SIZE);
  });
});
