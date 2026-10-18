import type { HelpRequest } from "@sdh/contracts";
import { MOCK_RESIDENT } from "./residentData";

const WHEN = "2026-10-15T08:00:00+08:00";

function demoRequest(
  n: number,
  fields: Pick<
    HelpRequest,
    "category" | "title" | "description" | "scheduledAt" | "durationMinutes" | "status"
  > &
    Partial<Pick<HelpRequest, "volunteerName">>,
): HelpRequest {
  return {
    id: `c0a80101-0000-4000-8000-00000000000${n}`,
    elderId: MOCK_RESIDENT.id,
    elderName: MOCK_RESIDENT.name,
    location: { ...MOCK_RESIDENT.location, area: MOCK_RESIDENT.area },
    createdAt: WHEN,
    updatedAt: WHEN,
    ...fields,
  };
}

// Fictional requests, newest first, shown only while demo data is switched on.
export const MOCK_HELP_REQUESTS: HelpRequest[] = [
  demoRequest(1, {
    category: "groceries",
    title: "Groceries",
    description: "Help carrying groceries up to my flat on the 3rd floor.",
    scheduledAt: "2026-10-21T09:00:00+08:00",
    durationMinutes: 60,
    status: "matched",
    volunteerName: "Aisha Rahman",
  }),
  demoRequest(2, {
    category: "transport",
    title: "Transport",
    description: "Ride to the clinic for my 10am check-up.",
    scheduledAt: "2026-10-22T09:00:00+08:00",
    durationMinutes: 90,
    status: "open",
  }),
  demoRequest(3, {
    category: "digital_literacy",
    title: "Phone and computer help",
    description: "Teach me how to make a video call to my grandchildren.",
    scheduledAt: "2026-10-23T14:00:00+08:00",
    durationMinutes: 60,
    status: "pending_review",
  }),
  demoRequest(4, {
    category: "home_help",
    title: "Help at home",
    description: "Replace two ceiling light bulbs in the kitchen and hallway.",
    scheduledAt: "2026-10-12T14:00:00+08:00",
    durationMinutes: 30,
    status: "completed",
    volunteerName: "Siti Hanim",
  }),
  demoRequest(5, {
    category: "health_literacy",
    title: "Health help",
    description: "Explain my new medication schedule.",
    scheduledAt: "2026-10-10T09:00:00+08:00",
    durationMinutes: 60,
    status: "cancelled",
  }),
];
