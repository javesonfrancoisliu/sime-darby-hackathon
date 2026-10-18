// ── Facility Maintenance Announcements ───────────────
export interface MaintenanceAnnouncement {
  id: string;
  title: string;
  affectedArea: string;
  dateRange: string;
  impact: string;
}

// ── Volunteering Opportunities ───────────────────────
export interface VolunteerOpportunity {
  id: string;
  title: string;
  date: string;
  duration: string;
  location: string;
  volunteersNeeded: number;
  volunteersSignedUp: number;
}

// ── Township Updates ─────────────────────────────────
export interface TownshipUpdate {
  id: string;
  title: string;
  body: string;
  date: string;
  category: string;
  pinned?: boolean;
}
