import { NavLink } from "react-router-dom";

import { bottomNavItemsForRole } from "../../lib/navigation";
import { useRole } from "./RoleContext";

// Mobile bottom navigation (shown under 640px). Five destinations; for the young role the middle
// one is a raised round button. Every item is a real link in tab order.
export function MobileNav() {
  const { role } = useRole();
  const items = bottomNavItemsForRole(role);

  return (
    <nav className="app-mobilenav" aria-label="Primary">
      {items.map(({ to, label, shortLabel, icon: Icon, end, centre }) =>
        centre ? (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="app-mobilenav-link app-mobilenav-link--centre"
          >
            <span className="app-mobilenav-orb" aria-hidden="true">
              <Icon size={26} />
            </span>
            <span className="app-mobilenav-label">{shortLabel ?? label}</span>
          </NavLink>
        ) : (
          <NavLink key={to} to={to} end={end ?? to === "/"} className="app-mobilenav-link">
            <Icon size={22} aria-hidden="true" />
            <span className="app-mobilenav-label">{shortLabel ?? label}</span>
          </NavLink>
        ),
      )}
    </nav>
  );
}
