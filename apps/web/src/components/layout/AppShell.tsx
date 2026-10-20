import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useRole } from "./RoleContext";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { useLargeText } from "../../data/LargeTextContext";

// Shared application shell: top bar (brand), desktop sidebar, main content area,
// and mobile bottom nav. Both Module 1 (Safety) and Module 2 (Community) render
// inside this - do not fork it per module.
//
// The larger comfort sizing (.easy-view) is applied for the elderly role, and
// for any resident who turns on the "Larger text" preference in Settings. The
// role comes from authentication; the preference is a device-only toggle.
export function AppShell({ children }: { children: ReactNode }) {
  const { easyView } = useRole();
  const { largeText } = useLargeText();
  const largerText = easyView || largeText;

  return (
    <div className={`app-shell${largerText ? " easy-view" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-topbar">
        <Link to="/" className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">
            <img
              src={`${import.meta.env.BASE_URL}icons/pwa-192.png`}
              alt=""
              width={32}
              height={32}
            />
          </span>
          Township Connect
        </Link>
      </header>

      <div className="app-body">
        <Sidebar />
        <main className="app-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
