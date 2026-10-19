import type { User } from "@sdh/contracts";

// Fictional resident used when demo data is switched on.
export const MOCK_RESIDENT: User = {
  id: "5b0d3a52-6f0a-4c33-9d7e-0a1f6c1d2e01",
  role: "elder",
  name: "Puan Rohani",
  area: "Elmina West",
  location: { lat: 3.2, lng: 101.49 },
  skills: [],
  experience: "",
  availability: [],
  verification: "not_required",
  createdAt: "2026-10-01T09:00:00+08:00",
  updatedAt: "2026-10-01T09:00:00+08:00",
};
