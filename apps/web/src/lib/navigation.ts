import {
  Gamepad2,
  HandHeart,
  House,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "../components/layout/RoleContext";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  // Shorter label for the mobile bottom nav.
  shortLabel?: string;
  // If set, the item only shows for these roles. Omitted = all roles.
  roles?: Role[];
  // Match the path exactly, so a nested route does not light this item up too.
  end?: boolean;
  // Rendered as the raised round button in the middle of the mobile bottom nav.
  centre?: boolean;
};

// Prototype navigation per DESIGN_SYSTEM.md section 6: Home, Community, Safety, Profile.
// "Volunteer" is a young-role destination (Township Connect). Shared by both
// modules - do not fork this list; filter it by role instead.
const ALL_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/safety", label: "Safety", icon: Shield },
  { to: "/community", label: "Community", icon: Users },
  { to: "/volunteer", label: "Volunteer", icon: HandHeart, roles: ["young"] },
  { to: "/profile", label: "Profile", icon: UserRound },
];

// Navigation destinations visible for the given role.
export function navItemsForRole(role: Role): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

// Mobile bottom bar for the young role: Safety is reached from All hazards on Home, Profile > Help
// and safety and the sidebar, Volunteer is the raised centre button and Play opens Challenges.
// Other roles keep the shared list.
const YOUNG_BOTTOM_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/community", label: "Community", icon: Users, end: true },
  { to: "/volunteer", label: "Volunteer", icon: HandHeart, centre: true },
  { to: "/community/challenges", label: "Play", icon: Gamepad2 },
  { to: "/profile", label: "Profile", icon: UserRound },
];

// Bottom bar destinations for the given role.
export function bottomNavItemsForRole(role: Role): NavItem[] {
  return role === "young" ? YOUNG_BOTTOM_ITEMS : navItemsForRole(role);
}
