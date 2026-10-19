import type { CommunityEvent } from "@sdh/contracts";
import { MOCK_RESIDENT } from "./residentData";

const CREATED = "2026-10-01T09:00:00+08:00";

function demoEvent(
  n: number,
  fields: Pick<
    CommunityEvent,
    | "title"
    | "category"
    | "description"
    | "startsAt"
    | "durationMinutes"
    | "capacity"
    | "signupCount"
  > & { area: string },
): CommunityEvent {
  const { area, ...rest } = fields;
  return {
    id: `d0b90202-0000-4000-8000-00000000000${n}`,
    location: { ...MOCK_RESIDENT.location, area },
    status: "upcoming",
    purpose: "activity",
    organiser: "",
    createdBy: MOCK_RESIDENT.id,
    createdAt: CREATED,
    updatedAt: CREATED,
    joined: false,
    ...rest,
  };
}

// Fictional events, shown only while demo data is switched on.
export const MOCK_EVENTS: CommunityEvent[] = [
  demoEvent(1, {
    title: "Morning Yoga at Central Park",
    category: "health_literacy",
    description: "A gentle stretching class for all ages.",
    startsAt: "2026-10-24T07:00:00+08:00",
    durationMinutes: 60,
    capacity: 20,
    signupCount: 8,
    area: "Central Park, Zone A",
  }),
  demoEvent(2, {
    title: "Neighbourhood Farmers' Market",
    category: "community_activity",
    description: "Fresh vegetables and local snacks.",
    startsAt: "2026-10-25T08:00:00+08:00",
    durationMinutes: 240,
    capacity: 100,
    signupCount: 40,
    area: "Elmina Boulevard",
  }),
  demoEvent(3, {
    title: "Phone Skills Class",
    category: "digital_literacy",
    description: "Learn video calls and e-wallets with friendly helpers.",
    startsAt: "2026-10-27T10:00:00+08:00",
    durationMinutes: 90,
    capacity: 10,
    signupCount: 5,
    area: "Community Centre, Room 2",
  }),
];
