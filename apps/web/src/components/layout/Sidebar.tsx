import { NavLink } from "react-router-dom";

import { navItemsForRole } from "../../lib/navigation";
import { useRole } from "./RoleContext";

// Desktop sidebar navigation (hidden under 1024px - see MobileNav).
export function Sidebar() {
  const { role } = useRole();
  const items = navItemsForRole(role);

  return (
    <aside className="app-sidebar" aria-label="Primary">
      <nav>
        <ul className="app-nav">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === "/"} className="app-nav-link">
                <Icon size={20} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
