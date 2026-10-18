import {
  HandHeart,
  Home,
  Megaphone,
  ShieldAlert,
  UserRound,
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
};

// Prototype navigation per DESIGN_SYSTEM.md section 6: Home, Community, Safety, Profile.
// "Volunteer" is a young-role destination (Help a Neighbour). Shared by both
// modules - do not fork this list; filter it by role instead.
const ALL_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Megaphone },
  { to: "/volunteer", label: "Volunteer", icon: HandHeart, roles: ["young"] },
  { to: "/safety", label: "Safety", icon: ShieldAlert },
  { to: "/profile", label: "Profile", icon: UserRound },
];

// Navigation destinations visible for the given role.
export function navItemsForRole(role: Role): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
