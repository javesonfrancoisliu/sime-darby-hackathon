import { HelpRequest, User } from "@sdh/contracts";

// Fixtures are parsed with the contract schemas so a drifting shape fails the test.
export const ELDER = User.parse({
  id: "5b0d3a52-6f0a-4c33-9d7e-0a1f6c1d2e01",
  role: "elder",
  name: "Puan Salmah",
  area: "Elmina Valley",
  location: { lat: 3.2, lng: 101.5 },
  skills: [],
  experience: "",
  availability: [],
  verification: "not_required",
  createdAt: "2026-10-01T09:00:00+08:00",
  updatedAt: "2026-10-01T09:00:00+08:00",
});

export const OTHER_ELDER = User.parse({
  ...ELDER,
  id: "7c1e4b63-7a1b-4d44-8e8f-1b2a7d2e3f02",
  name: "Encik Hamid",
  area: "Elmina West",
});

export function makeRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return HelpRequest.parse({
    id: "9d2f5c74-8b2c-4e55-9f90-2c3b8e3f4a03",
    elderId: ELDER.id,
    elderName: ELDER.name,
    category: "groceries",
    title: "Groceries",
    description: "Milk and bread",
    scheduledAt: "2026-10-20T09:00:00+08:00",
    durationMinutes: 60,
    location: { lat: ELDER.location.lat, lng: ELDER.location.lng, area: ELDER.area },
    status: "open",
    createdAt: "2026-10-18T09:00:00+08:00",
    updatedAt: "2026-10-18T09:00:00+08:00",
    ...overrides,
  });
}
