import {
  MAINTENANCE_ANNOUNCEMENTS,
  TOWNSHIP_UPDATES,
  VOLUNTEER_OPPORTUNITIES,
} from "../mock/communityData";

// Notices, volunteering and updates are demo data until the API has them; pages read them only here.
export function useCommunityContent() {
  return {
    maintenanceNotices: MAINTENANCE_ANNOUNCEMENTS,
    volunteerOpportunities: VOLUNTEER_OPPORTUNITIES,
    townshipUpdates: TOWNSHIP_UPDATES,
  };
}
