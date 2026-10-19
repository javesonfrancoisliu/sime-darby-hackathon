import {
  CommunityEvent,
  ContributionsResponse,
  HelpRequest,
  HelpRequestSummary,
  User,
  type OpportunitiesResponse,
} from "@sdh/contracts";

// Fixtures are parsed with the contract schemas so a drifting shape fails the test.
const BASE_USER = {
  location: { lat: 3.2, lng: 101.5 },
  skills: [],
  experience: "",
  availability: [],
  createdAt: "2026-10-01T09:00:00+08:00",
  updatedAt: "2026-10-01T09:00:00+08:00",
};

export const VOLUNTEER = User.parse({
  ...BASE_USER,
  id: "5b0d3a52-6f0a-4c33-9d7e-0a1f6c1d2e01",
  role: "volunteer",
  name: "Aisha Rahman",
  area: "Elmina West",
  verification: "verified",
});

export const OTHER_VOLUNTEER = User.parse({
  ...VOLUNTEER,
  id: "7c1e4b63-7a1b-4d44-8e8f-1b2a7d2e3f02",
  name: "Daniel Lim",
  area: "Elmina Valley",
});

export const PENDING_VOLUNTEER = User.parse({
  ...VOLUNTEER,
  id: "8d2f5c74-8b2c-4e55-9f90-2c3b8e3f4a03",
  name: "Hafiz Aziz",
  verification: "pending",
});

export const ELDER = User.parse({
  ...BASE_USER,
  id: "9e3a6d85-9c3d-4f66-8aa1-3d4c9f4a5b04",
  role: "elder",
  name: "Puan Salmah",
  area: "Elmina Valley",
  verification: "not_required",
});

const PLACE = { lat: 3.2, lng: 101.5, area: "Elmina Valley" };
const STAMP = "2026-10-18T09:00:00+08:00";

export function makeRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return HelpRequest.parse({
    id: "a14b7e96-ad4e-4a77-9bb2-4e5dad5b6c05",
    elderId: ELDER.id,
    elderName: ELDER.name,
    category: "groceries",
    title: "Groceries",
    description: "Milk and bread",
    scheduledAt: "2026-10-20T09:00:00+08:00",
    durationMinutes: 60,
    location: PLACE,
    status: "open",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });
}

export function makeEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return CommunityEvent.parse({
    id: "b25c8fa7-be5f-4b88-8cc3-5f6ebe6c7d06",
    title: "Tea morning",
    category: "community_activity",
    description: "Tea and a chat",
    startsAt: "2026-10-22T10:00:00+08:00",
    durationMinutes: 90,
    location: PLACE,
    capacity: 20,
    signupCount: 3,
    status: "upcoming",
    createdBy: VOLUNTEER.id,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  });
}

export function makeRequestOpportunity(
  overrides: Partial<HelpRequestSummary> = {},
): OpportunitiesResponse["items"][number] {
  const { id, category, title, description, scheduledAt, durationMinutes, status } = makeRequest();
  return {
    kind: "request",
    matchScore: 80,
    reasons: ["Close to you"],
    request: HelpRequestSummary.parse({
      id,
      category,
      title,
      description,
      scheduledAt,
      durationMinutes,
      status,
      createdAt: STAMP,
      updatedAt: STAMP,
      area: "Elmina Valley",
      distanceKm: 1.5,
      ...overrides,
    }),
  };
}

export const NO_CONTRIBUTIONS = ContributionsResponse.parse({
  totalMinutes: 0,
  completedCount: 0,
  items: [],
});
