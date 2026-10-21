import { NavLink } from "react-router-dom";

import { bottomNavItemsForRole } from "../../lib/navigation";
import { useRole } from "./RoleContext";

// Lucide glyphs are drawn at stroke 2; the active tab uses this heavier stroke. Both weights and the
// regular tab icon size (22) match the Elder app; the centre orb glyph is sized to this bar's orb.
const ACTIVE_STROKE = 2.5;
const BASE_STROKE = 2;

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
            {({ isActive }) => (
              <>
                <span className="app-mobilenav-orb" aria-hidden="true">
                  <Icon size={24} strokeWidth={isActive ? ACTIVE_STROKE : BASE_STROKE} />
                </span>
                <span className="app-mobilenav-label">{shortLabel ?? label}</span>
              </>
            )}
          </NavLink>
        ) : (
          <NavLink key={to} to={to} end={end ?? to === "/"} className="app-mobilenav-link">
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? ACTIVE_STROKE : BASE_STROKE}
                  aria-hidden="true"
                />
                <span className="app-mobilenav-label">{shortLabel ?? label}</span>
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  );
}
