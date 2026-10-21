import { describe, expect, it } from "vitest";
import type { Opportunity } from "../../types/volunteer";
import { matchingJustification } from "./OpportunityCard";

const explain = (reasons: string[], matchSource: "rules" | "ai" = "rules") =>
  matchingJustification({ reasons, matchSource } as Opportunity);

describe("matching justification", () => {
  it("uses only supplied skills, proximity and saved availability evidence", () => {
    expect(
      explain(["Lists transport as a skill; About 2 km away; Free on Monday 08:00 to 10:00"]),
    ).toBe(
      "Your transport skills fit this task · You are about 2 km away · Your saved availability covers this time",
    );
  });
  it("does not invent missing skills or availability", () => {
    expect(explain(["About 2 km away"])).toBe("You are about 2 km away");
    expect(explain(["Experience mentions driving"])).toBe("Your experience mentions driving");
  });
  it("uses natural community wording and preserves unknown or conflicting availability", () => {
    const unknown = explain([
      "Lists community activities as a skill",
      "About 0.5 km away",
      "Your availability is not provided",
    ]);
    expect(unknown).toBe(
      "Community activities match your listed skills · You are about 0.5 km away · Your availability is not provided",
    );
    expect(
      explain(["About 0.5 km away", "Your saved schedule does not cover this time"]),
    ).toContain("Your saved schedule does not cover this time");
    expect(unknown.length).toBeLessThanOrEqual(240);
  });
  it("keeps validated Claude text unchanged, including uncertainty", () => {
    const reason = "Transport is a listed skill; availability is unknown.";
    expect(explain([reason], "ai")).toBe(reason);
  });
  it("keeps complete evidence clauses within 240 characters", () => {
    const reason = explain(["Experience mentions " + "x".repeat(230), "About 2 km away"]);
    expect(reason).toBe("You are about 2 km away");
    expect(reason.length).toBeLessThanOrEqual(240);
    expect(explain([])).toBe("");
  });
});
