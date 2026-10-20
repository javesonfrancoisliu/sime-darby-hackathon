import { MAX_REASON_LENGTH } from "@sdh/contracts";
import { CATEGORY_LABELS } from "./weights";
import type { ScoredVolunteer } from "./scoring";

export type ReasonTreatment = "unchanged" | "shortened" | "rule-replacement";

/** Bound UTF-16 length to the contract without splitting a word or surrogate pair.
 * Never keep only the front of a sentence: it could drop a crucial qualification.
 */
export function shortenReason(text: string, fallback: string): string {
  let clean = text.trim();
  if (clean.length <= MAX_REASON_LENGTH) return clean;
  // Conservative phrase substitutions, not arbitrary clause/word truncation.
  // Keep subjects, distances, negation and uncertainty in the original explanation.
  clean = clean
    .replace(/\bthe volunteer['’]s experience\b/gi, (phrase) =>
      phrase.startsWith("T") ? "Their experience" : "their experience",
    )
    .replace(/\bdigital help skills\b/gi, "digital skills")
    .replace(/\ba short, low-distance\b/gi, "a brief nearby")
    .replace(/, and this\b/g, "; this")
    .replace(
      /\band the (\d+(?:\.\d+)? km) distance(?= and (?:confirmed|saved) availability\b)/gi,
      "and being $1 away",
    )
    .replace(/\breading session\b/gi, "reading");
  if (clean.length <= MAX_REASON_LENGTH) return clean;
  const sentences = clean.match(/[\s\S]+?(?:[.!?](?=\s|$)|$)/g)?.filter((s) => s.trim()) ?? [];
  let complete = "";
  for (const sentence of sentences) {
    const next = `${complete} ${sentence.trim()}`.trim();
    if (next.length > MAX_REASON_LENGTH) break;
    complete = next;
  }
  // A later sentence may qualify or contradict the first; a factual fallback is safer.
  if (
    complete &&
    !/\b(but|though|however|not|never|no|without|unknown|unconfirmed|unavailable|unlisted|uncertain|may|might|could|cannot|unless|only)\b|n['’]t\b/i.test(
      clean.slice(complete.length),
    )
  )
    return complete;
  return fallback;
}

const LINK_OR_EMAIL = /(https?:|www\.|@|[a-z0-9-]+\.[a-z]{2,})/i;
export const isSafeReason = (reason: string): boolean =>
  reason.trim().length > 0 && !LINK_OR_EMAIL.test(reason) && reason.replace(/\D/g, "").length <= 6;

function unsupported(reason: string, entry: ScoredVolunteer): boolean {
  reason = reason.replaceAll("’", "'");
  // First-person narration is not provider evidence. Second-person claims still need grounding.
  if (/\b(?:I|I'm|I've|my|me)\b/i.test(reason)) return true;
  if (
    /\b(?:has|have|had) (?:not|never) (?:done|helped|carried|taught|driven|worked|provided)|\b(?:hasn't|haven't|hadn't|never) (?:done|helped|carried|taught|driven|worked|provided)\b/i.test(
      reason,
    )
  )
    return true;

  // Accept direct address only when named skill claims match the saved profile.
  const skillClaims = [...reason.matchAll(/\b(?:your|you have) ([a-z -]+?) skills?\b/gi)];
  if (/\byou have\b/i.test(reason) && !skillClaims.length) return true;
  const listedSkills = entry.volunteer.skills.map((skill) => CATEGORY_LABELS[skill]);
  for (const [, claim] of skillClaims) {
    const names = claim!
      .toLowerCase()
      .replace(/^(?:listed|saved) /, "")
      .split(/\s+and\s+/);
    if (names.some((name) => !listedSkills.includes(name === "digital" ? "digital help" : name)))
      return true;
  }
  // A claim about actions is not implied by merely listing a related skill.
  if (/\byou (?:know|teach|drive|carry|repair)\b/i.test(reason)) return true;

  const qualifications =
    reason.match(/\b(certified|licensed|nurse|doctor|physician|therapist|paramedic)\b/gi) ?? [];
  if (/\b(?:has|have) no (?:prior |previous )?(?:experience|skills?)\b/i.test(reason)) return true;
  const evidence = entry.volunteer.experience.toLowerCase();
  if (
    qualifications.some(
      (word) =>
        !new RegExp(`\\b${word}\\b`, "i").test(evidence) ||
        /\b(not|never|no|isn't|wasn't)\b/i.test(evidence),
    )
  )
    return true;
  const years =
    reason.match(
      /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|many|several) years?\b/gi,
    ) ?? [];
  if (years.some((claim) => !evidence.includes(claim.toLowerCase()))) return true;

  if (entry.components.availability !== 1) {
    // Remove only explicit uncertainty statements, not arbitrary negated clauses.
    const remaining = reason
      .replace(/\bnot (?:yet )?confirmed (?:as )?(?:available|free)\b/gi, "unknown")
      .replace(/\bnot listed as (?:available|free)\b/gi, "unknown")
      .replace(/\bavailability (?:is )?(?:unknown|unconfirmed|not confirmed)\b/gi, "unknown");
    if (
      /\b(?:confirmed availability|availability (?:covers|matches)|saved availability (?:covers|matches)|available|unavailable|free|fits? (?:the|your) schedule|cannot (?:come|attend)|can't (?:come|attend))\b/i.test(
        remaining,
      )
    )
      return true;
  } else if (
    /\b(?:unavailable|(?:not|isn't|aren't|won't be) (?:available|free)|cannot (?:come|attend)|can't (?:come|attend))\b/i.test(
      reason,
    )
  )
    return true;
  return false;
}

export function prepareExplanation(
  reason: string,
  entry: ScoredVolunteer,
): { reason: string; treatment: ReasonTreatment } {
  const facts = [...entry.reasons];
  // Rule evidence is generated by the scorer. Drop whole evidence clauses to fit.
  let fallback = "";
  for (const fact of facts) {
    const next = fallback ? `${fallback}; ${fact}` : fact;
    if (next.length <= MAX_REASON_LENGTH) fallback = next;
  }
  fallback ||= "A nearby volunteer; please confirm the details";
  if (!isSafeReason(reason) || unsupported(reason, entry))
    return { reason: fallback, treatment: "rule-replacement" };
  const result = shortenReason(reason, fallback);
  if (result === fallback && result !== reason.trim())
    return { reason: fallback, treatment: "rule-replacement" };
  // Apply the same grounding checks after shortening, before calling it AI text.
  if (!isSafeReason(result) || unsupported(result, entry))
    return { reason: fallback, treatment: "rule-replacement" };
  return { reason: result, treatment: result === reason.trim() ? "unchanged" : "shortened" };
}
