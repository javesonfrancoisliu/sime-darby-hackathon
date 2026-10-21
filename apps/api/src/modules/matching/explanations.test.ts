import { describe, expect, it } from "vitest";
import { rankVolunteers } from "./scoring";
import { prepareExplanation, shortenReason } from "./explanations";
import { scenarios } from "../../../scripts/matching-benchmark/dataset";

const scenario = scenarios[0]!;
const candidates = rankVolunteers(scenario.target, scenario.volunteers);
const unknown = candidates.find((c) => c.volunteer.availability.length === 0)!;
const known = candidates.find((c) => c.components.availability === 1)!;

describe("grounded explanation treatment", () => {
  it.each([
    "Not confirmed as available at your time.",
    "Availability is unknown.",
    "Not confirmed available at your time.",
    "Not listed as free at your time.",
  ])("preserves explicit uncertainty: %s", (reason) => {
    expect(prepareExplanation(reason, unknown)).toEqual({ reason, treatment: "unchanged" });
  });
  it.each([
    "They are not free at your time.",
    "They are free at your time.",
    "They are available.",
    "They are unavailable.",
    "Your saved availability covers this time.",
    "Your confirmed availability suits this request.",
    "They cannot attend.",
    "Not confirmed available, but they are free at your time.",
  ])("rejects unsupported availability: %s", (reason) => {
    expect(prepareExplanation(reason, unknown).treatment).toBe("rule-replacement");
  });
  it("does not reverse confirmed availability", () => {
    expect(prepareExplanation("They are not available.", known).treatment).toBe("rule-replacement");
    expect(prepareExplanation("They are free at your time.", known).treatment).toBe("unchanged");
  });
  it.each([
    "They have not carried bags before.",
    "They have never done this.",
    "They haven't done box moving.",
    "They haven’t done box moving.",
    "This helper has not helped at counters.",
    "I have done this for neighbours.",
    "You have digital help skills.",
    "You have years of electrical repair experience.",
    "A certified doctor with ten years of experience.",
  ])("rejects unsupported history, credentials or speaker: %s", (reason) => {
    expect(prepareExplanation(reason, known).treatment).toBe("rule-replacement");
  });
  it("accepts verified second-person skills and rejects invented ones", () => {
    const entry = {
      ...known,
      volunteer: { ...known.volunteer, skills: ["digital_literacy" as const] },
    };
    const reason = "Your digital help skills fit this nearby request.";
    expect(prepareExplanation(reason, entry)).toEqual({ reason, treatment: "unchanged" });
    expect(prepareExplanation("Your home repairs skills fit this request.", entry).treatment).toBe(
      "rule-replacement",
    );
    expect(prepareExplanation("You are available.", unknown).treatment).toBe("rule-replacement");
    expect(prepareExplanation("Your availability is unknown.", unknown).treatment).toBe(
      "unchanged",
    );
  });
  it("preserves explanations at 240 characters and rejects unshortenable excess text", () => {
    const reason = "x".repeat(240);
    expect(prepareExplanation(reason, known)).toEqual({ reason, treatment: "unchanged" });
    expect(prepareExplanation(reason + "x", known).treatment).toBe("rule-replacement");
  });
  it("preserves factual unlisted experience language", () => {
    expect(prepareExplanation("Book carrying is not mentioned.", known).treatment).toBe(
      "unchanged",
    );
  });
  it("does not mistake negated profile qualifications for positive evidence", () => {
    expect(
      prepareExplanation("A certified nurse.", {
        ...known,
        volunteer: { ...known.volunteer, experience: "Not a certified nurse." },
      }).treatment,
    ).toBe("rule-replacement");
  });
  it("shortens complete sentences without losing qualifications or decimal prefixes", () => {
    expect(
      shortenReason(
        "Lives 0.5 km away. " + "Further generic explanation ".repeat(10),
        "Factual fallback",
      ),
    ).toBe("Lives 0.5 km away.");
    expect(
      shortenReason(
        "Relevant experience. " + "x".repeat(240) + " but availability is unknown.",
        "Factual fallback",
      ),
    ).toBe("Factual fallback");
    expect(shortenReason("x".repeat(250), "Factual fallback")).toBe("Factual fallback");
    expect(shortenReason("😀".repeat(200), "Factual fallback")).toBe("Factual fallback");
    expect(shortenReason("x".repeat(240), "fallback")).toHaveLength(240);
  });
  it("retains uncertainty and negation during phrase compaction", () => {
    const text =
      "The volunteer's experience does not mention ladder work; availability is unknown." +
      " The volunteer's experience is unlisted.".repeat(5);
    expect(text.length).toBeGreaterThan(240);
    const result = prepareExplanation(text + " ".repeat(5), unknown);
    expect(result.reason).toContain("does not mention ladder work");
    expect(result.reason).toContain("availability is unknown");
    expect(result.reason).toContain("unlisted");
    expect(result.reason.length).toBeLessThanOrEqual(240);
  });
  it("never discards a later uncertainty or negative qualification to fit", () => {
    for (const qualifier of [
      "no ladder experience is stated",
      "availability may change",
      "the schedule cannot be confirmed",
      "experience is unlisted",
    ]) {
      expect(
        shortenReason("A nearby option. " + "x".repeat(240) + " " + qualifier, "Fallback"),
      ).toBe("Fallback");
    }
  });
  it("reports failed shortening as rule replacement rather than AI shortening", () => {
    expect(prepareExplanation("x".repeat(250), known).treatment).toBe("rule-replacement");
    expect(prepareExplanation("A certified doctor. " + "x".repeat(250), known).treatment).toBe(
      "rule-replacement",
    );
  });
});
