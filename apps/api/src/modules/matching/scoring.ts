import type { AvailabilitySlot, Category, Day, Location, User } from "@sdh/contracts";
import { distanceKm, roundKm } from "../../lib/geo";
import {
  CATEGORY_KEYWORDS,
  CATEGORY_LABELS,
  DEFAULT_RADIUS_KM,
  SHORTLIST_SIZE,
  WEIGHTS,
} from "./weights";

export interface MatchTarget {
  category: Category;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  location: Location;
}

export interface Components {
  skill: number;
  proximity: number;
  availability: number;
}

export interface ScoredVolunteer {
  volunteer: User;
  score: number;
  components: Components;
  distanceKm: number;
  reasons: string[];
}

const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const PERCENT = 100;
const PARTIAL_SKILL = 0.5;

// Index matches Date#getUTCDay (0 = Sunday).
const DAYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const toMinutes = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Malaysia is fixed UTC+8 with no DST, so a constant shift is exact.
function malaysiaWindow(scheduledAt: string, durationMinutes: number) {
  const shifted = new Date(new Date(scheduledAt).getTime() + MALAYSIA_OFFSET_MS);
  const startMinutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return {
    day: DAYS[shifted.getUTCDay()] as Day,
    startMinutes,
    endMinutes: startMinutes + durationMinutes,
  };
}

function findSlot(volunteer: User, target: MatchTarget): AvailabilitySlot | undefined {
  const { day, startMinutes, endMinutes } = malaysiaWindow(
    target.scheduledAt,
    target.durationMinutes,
  );
  if (endMinutes > MINUTES_PER_DAY) return undefined;
  return volunteer.availability.find(
    (slot) =>
      slot.day === day &&
      toMinutes(slot.start) <= startMinutes &&
      endMinutes <= toMinutes(slot.end),
  );
}

function matchedKeyword(volunteer: User, category: Category): string | undefined {
  const text = volunteer.experience.toLowerCase();
  return CATEGORY_KEYWORDS[category].find((keyword) => text.includes(keyword));
}

export function scoreVolunteer(
  volunteer: User,
  target: MatchTarget,
  radiusKm = DEFAULT_RADIUS_KM,
): ScoredVolunteer | null {
  if (volunteer.verification !== "verified") return null;
  const distance = distanceKm(volunteer.location, target.location);
  if (distance > radiusKm) return null;

  const hasSkill = volunteer.skills.includes(target.category);
  const keyword = hasSkill ? undefined : matchedKeyword(volunteer, target.category);
  const slot = findSlot(volunteer, target);

  const components: Components = {
    skill: hasSkill ? 1 : keyword ? PARTIAL_SKILL : 0,
    proximity: Math.max(0, 1 - distance / radiusKm),
    availability: slot ? 1 : 0,
  };
  const weighted =
    WEIGHTS.skill * components.skill +
    WEIGHTS.proximity * components.proximity +
    WEIGHTS.availability * components.availability;

  const reasons: string[] = [];
  if (hasSkill) reasons.push(`Has helped with ${CATEGORY_LABELS[target.category]}`);
  else if (keyword) reasons.push(`Experience mentions ${keyword}`);
  const rounded = roundKm(distance);
  reasons.push(`${rounded} km away`);
  if (slot) reasons.push(`Free on ${DAY_NAMES[slot.day]} ${slot.start} to ${slot.end}`);

  return {
    volunteer,
    score: Math.round(weighted * PERCENT),
    components,
    distanceKm: rounded,
    reasons,
  };
}

export interface RankOptions {
  radiusKm?: number;
  limit?: number;
}

export function rankVolunteers(
  target: MatchTarget,
  volunteers: User[],
  options: RankOptions = {},
): ScoredVolunteer[] {
  const { radiusKm = DEFAULT_RADIUS_KM, limit = SHORTLIST_SIZE } = options;
  return volunteers
    .map((volunteer) => scoreVolunteer(volunteer, target, radiusKm))
    .filter((entry): entry is ScoredVolunteer => entry !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceKm - b.distanceKm ||
        a.volunteer.name.localeCompare(b.volunteer.name),
    )
    .slice(0, limit);
}

export const ruleReason = (entry: ScoredVolunteer): string => entry.reasons.join("; ");
