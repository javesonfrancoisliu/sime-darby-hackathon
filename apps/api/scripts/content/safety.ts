import type { CreateFacilityReportBody, FacilityStatus, SafetyReading } from "@sdh/contracts";
import { hoursAgo } from "./dates";

export const safetyReadings = (): SafetyReading[] => [
  {
    type: "air",
    area: "Elmina West",
    value: 42,
    unit: "API",
    level: "good",
    advice: "Air is fine. Enjoy your usual outdoor activities.",
    measuredAt: hoursAgo(1),
  },
  {
    type: "air",
    area: "Elmina Valley",
    value: 78,
    unit: "API",
    level: "moderate",
    advice: "Air is acceptable. Those with breathing problems should take it easy outdoors.",
    measuredAt: hoursAgo(1),
  },
  {
    type: "air",
    area: "Central Park",
    value: 55,
    unit: "API",
    level: "good",
    advice: "Air is fine. A good time for a walk in the park.",
    measuredAt: hoursAgo(2),
  },
  {
    type: "water",
    area: "Elmina East",
    name: "Sungai Elmina",
    waterBody: "river",
    value: 1.8,
    normalMax: 2.5,
    unit: "m",
    level: "normal",
    advice: "River level is normal.",
    measuredAt: hoursAgo(1),
  },
  {
    type: "water",
    area: "Central Park",
    name: "Central Park Lake",
    waterBody: "lake",
    value: 2.9,
    normalMax: 2.5,
    unit: "m",
    level: "watch",
    advice: "Lake level is a little high. Keep clear of the water's edge.",
    measuredAt: hoursAgo(2),
  },
  {
    type: "heat",
    area: "City of Elmina",
    value: 34,
    unit: "C",
    feelsLike: 39,
    humidity: 68,
    level: "warning",
    advice: "Very hot afternoon. Stay indoors from 12pm to 4pm and drink water regularly.",
    measuredAt: hoursAgo(1),
  },
];

export interface FacilityReportContent extends CreateFacilityReportBody {
  status: FacilityStatus;
}

export const facilityReports: FacilityReportContent[] = [
  {
    title: "Broken bench at Central Park playground",
    area: "Central Park",
    category: "Seating",
    description: "A bench slat near the swings is cracked and may hurt someone.",
    status: "reported",
  },
  {
    title: "Flickering light in Block B stairwell",
    area: "Elmina West",
    category: "Lighting",
    description: "The third floor stairwell light keeps flickering at night.",
    status: "reported",
  },
  {
    title: "Blocked drain along Jalan Valley 2",
    area: "Elmina Valley",
    category: "Drainage",
    description: "Leaves are blocking the drain and water pools after rain.",
    status: "in_progress",
  },
  {
    title: "Loose handrail at Elmina East bus stop",
    area: "Elmina East",
    category: "Safety",
    description: "The handrail on the ramp moves when held.",
    status: "in_progress",
  },
  {
    title: "Faded pedestrian crossing near the clinic",
    area: "Elmina East",
    category: "Road",
    description: "The zebra crossing markings are hard to see.",
    status: "resolved",
  },
  {
    title: "Overflowing bin at Block A lobby",
    area: "Elmina West",
    category: "Cleaning",
    description: "The bin was overflowing and has now been emptied and replaced.",
    status: "resolved",
  },
];
