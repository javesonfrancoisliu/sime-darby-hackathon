import type { CreateEventBody } from "@sdh/contracts";
import { at } from "./dates";

// ~0.009 degrees is about 1 km around Elmina West.
const BASE = { lat: 3.0738, lng: 101.5183 };
const KM = 0.009;
const near = (northKm: number, eastKm: number) => ({
  lat: BASE.lat + northKm * KM,
  lng: BASE.lng + eastKm * KM,
});

// Regular events stay with the existing seed; only volunteer drives are loaded here.
export const volunteerDrives = (): CreateEventBody[] => [
  {
    title: "Neighbour Helpers sign-up morning",
    category: "community_activity",
    description:
      "Meet the team, learn how to help a neighbour safely and sign up for weekly errands.",
    startsAt: at(9, 9),
    durationMinutes: 90,
    location: { ...near(0.2, -0.3), area: "Community Hall, Elmina West" },
    capacity: 30,
    purpose: "volunteer_drive",
    organiser: "Elmina Community Council",
  },
  {
    title: "Phone buddies training for seniors",
    category: "digital_literacy",
    description:
      "Learn simple ways to teach seniors messaging, video calls and e-wallets, with patience.",
    startsAt: at(21, 14),
    durationMinutes: 120,
    location: { ...near(1.2, 0.9), area: "Reading Room, Block C" },
    capacity: 25,
    purpose: "volunteer_drive",
    organiser: "Elmina Youth Club",
  },
  {
    title: "Monthly clinic ride-along volunteers",
    category: "health_literacy",
    description:
      "Accompany seniors to the community clinic and help them understand their appointments.",
    startsAt: at(46, 8, 30),
    durationMinutes: 180,
    location: { ...near(-1.6, 1.1), area: "Elmina Community Clinic" },
    capacity: 15,
    purpose: "volunteer_drive",
    organiser: "Elmina Community Clinic",
  },
];
