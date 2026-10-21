import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserRound } from "lucide-react";
import { IconHome, IconPlus, IconUsers, IconTrophy } from "./Icons";

interface Tab {
  label: string;
  path: string;
  icon: (active: boolean) => ReactNode;
  // The raised round button in the middle of the bar.
  raised?: boolean;
}

const TABS: Tab[] = [
  {
    label: "Home",
    path: "/home",
    icon: (active) => <IconHome size={22} strokeWidth={active ? 2.2 : 1.8} />,
  },
  {
    label: "Community",
    path: "/community",
    icon: (active) => <IconUsers size={22} strokeWidth={active ? 2.2 : 1.8} />,
  },
  {
    label: "Help request",
    path: "/request",
    raised: true,
    icon: () => <IconPlus size={30} strokeWidth={2.6} />,
  },
  {
    label: "Play",
    path: "/challenges",
    icon: (active) => <IconTrophy size={22} strokeWidth={active ? 2.2 : 1.8} />,
  },
  {
    label: "Profile",
    path: "/me",
    icon: (active) => <UserRound size={22} strokeWidth={active ? 2.2 : 1.8} />,
  },
];

// Mobile bottom tab bar with standardized monochrome line icons
export function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // Publish the real bar height so page content always clears it, at any text size.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = nav.closest<HTMLElement>(".app-root");
    if (!root) return;
    const publish = () => root.style.setProperty("--tab-bar-height", `${nav.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <nav ref={navRef} className="app-tab-bar" aria-label="Main navigation">
      {TABS.map((tab) => {
        // The request flow belongs to Help request; My requests pages highlight no tab.
        const isHomeArea = tab.path === "/home" && pathname === "/";
        const active = isHomeArea || pathname === tab.path || pathname.startsWith(tab.path + "/");
        return (
          <button
            key={tab.path}
            type="button"
            className={`app-tab-bar__item${tab.raised ? " app-tab-bar__item--raised" : ""}${active ? " app-tab-bar__item--active" : ""}`}
            onClick={() => navigate(tab.path)}
            aria-current={active ? "page" : undefined}
          >
            {tab.raised ? (
              <>
                <span className="app-tab-bar__bump" aria-hidden="true" />
                <span className="app-tab-bar__fab" aria-hidden="true">
                  {tab.icon(active)}
                </span>
              </>
            ) : null}
            <span className="app-tab-bar__icon" aria-hidden="true">
              {tab.raised ? null : tab.icon(active)}
            </span>
            <span className="app-tab-bar__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
