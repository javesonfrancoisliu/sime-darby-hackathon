// Mock Community Data - Centralised Neighbourhood Information
// All values are illustrative only.

import type {
  MaintenanceAnnouncement,
  VolunteerOpportunity,
  TownshipUpdate,
} from "../types/community";

export const MAINTENANCE_ANNOUNCEMENTS: MaintenanceAnnouncement[] = [
  {
    id: "M001",
    title: "Water Supply Interruption",
    affectedArea: "Jalan Elmina 1–5",
    dateRange: "18 Oct, 9 am – 5 pm",
    impact: "Water supply will be temporarily cut for pipe upgrade.",
  },
  {
    id: "M002",
    title: "Road Resurfacing Works",
    affectedArea: "Persiaran Elmina Barat 2 & 3",
    dateRange: "20–22 Oct, 8 am – 6 pm",
    impact: "Expect delays. Use alternate routes via Jalan Elmina 7.",
  },
  {
    id: "M003",
    title: "Playground Closure for Upgrade",
    affectedArea: "Taman Elmina West, Playground 1",
    dateRange: "19–25 Oct",
    impact: "Playground closed for safety upgrade. Playground 2 remains open.",
  },
];

export const VOLUNTEER_OPPORTUNITIES: VolunteerOpportunity[] = [
  {
    id: "V001",
    title: "Grocery Delivery for Seniors",
    date: "Sat 18 Oct",
    duration: "3 hrs",
    location: "Morning market to residential blocks",
    volunteersNeeded: 10,
    volunteersSignedUp: 7,
  },
  {
    id: "V002",
    title: "Park Clean-Up Drive",
    date: "Sun 19 Oct",
    duration: "2 hrs",
    location: "Central Park",
    volunteersNeeded: 20,
    volunteersSignedUp: 14,
  },
  {
    id: "V003",
    title: "Companion Visit - Elderly Home",
    date: "Fri 24 Oct",
    duration: "2 hrs",
    location: "Rumah Ehsan, Elmina",
    volunteersNeeded: 8,
    volunteersSignedUp: 3,
  },
];

export const TOWNSHIP_UPDATES: TownshipUpdate[] = [
  {
    id: "U001",
    title: "New Community Centre Opening",
    body: "The Elmina Community Centre (Phase 2) opens on 1 Nov 2026. It features a library, meeting rooms, and a senior lounge.",
    date: "15 Oct 2026",
    category: "Announcement",
    pinned: true,
  },
  {
    id: "U002",
    title: "Bus Route 780 Extended",
    body: "Starting 20 Oct, Bus 780 will serve the new stops at Elmina Boulevard and Central Park, running 6 am–11 pm daily.",
    date: "14 Oct 2026",
    category: "Transport",
  },
  {
    id: "U003",
    title: "Free Health Screening - 25 Oct",
    body: "Sime Darby Property partners with Klinik Komuniti for free blood pressure, cholesterol and diabetes screening at the Community Centre.",
    date: "12 Oct 2026",
    category: "Health",
  },
];
