import { NavLink } from "react-router-dom";

import { navItemsForRole } from "../../lib/navigation";
import { useRole } from "./RoleContext";

/** Mobile bottom navigation (shown under 640px). Max 5 destinations, 56px tall. */
export function MobileNav() {
  const { role } = useRole();
  const items = navItemsForRole(role);

  return (
    <nav className="app-mobilenav" aria-label="Primary">
      {items.map(({ to, label, shortLabel, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} className="app-mobilenav-link">
          <Icon size={22} aria-hidden="true" />
          {shortLabel ?? label}
        </NavLink>
      ))}
    </nav>
  );
}
