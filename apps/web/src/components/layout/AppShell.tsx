import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useRole } from "./RoleContext";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

/**
 * Shared application shell: top bar (brand), desktop sidebar, main content area,
 * and mobile bottom nav. Both Module 1 (Safety) and Module 2 (Community) render
 * inside this — do not fork it per module.
 *
 * The elderly role applies the larger "Easy View" sizing via the .easy-view
 * class. The role comes from authentication (dev preview via ?role=), so there
 * is no in-app toggle.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { easyView } = useRole();

  return (
    <div className={`app-shell${easyView ? " easy-view" : ""}`}>
      <header className="app-topbar">
        <Link to="/" className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">
            <img src="/icons/pwa-192.png" alt="" width={32} height={32} />
          </span>
          Township Connect
        </Link>
      </header>

      <div className="app-body">
        <Sidebar />
        <main className="app-main" id="main-content">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
