import type { MaintenanceStatus } from "../types/community";

export type BadgeVariant = "success" | "warning" | "info" | "danger";

export type StatusDescriptor = {
  label: string;
  variant: BadgeVariant;
};

// Maintenance announcement statuses (Scheduled / In Progress / Completed).
// Kept separate from safety facility-report statuses (Reported / In Progress / Resolved)
// as required by the design system — do not merge the two vocabularies.
const MAINTENANCE_STATUS: Record<MaintenanceStatus, StatusDescriptor> = {
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};

export function maintenanceStatus(status: MaintenanceStatus): StatusDescriptor {
  return MAINTENANCE_STATUS[status];
}
