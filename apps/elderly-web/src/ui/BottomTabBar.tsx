import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconGamepad, IconHome, IconPlus, IconUserRound, IconUsers } from "./Icons";

interface Tab {
  label: string;
  path: string;
  icon: (active: boolean) => ReactNode;
  // The raised round button in the middle of the bar.
  raised?: boolean;
}

// Same glyph size and stroke rule as the volunteer app tab bar: 22, stroke 2, heavier when current.
// The raised centre button keeps a larger glyph for its larger target but follows the same stroke.
const TAB_ICON_SIZE = 22;
const tabStroke = (active: boolean) => (active ? 2.5 : 2);

const TABS: Tab[] = [
  {
    label: "Home",
    path: "/home",
    icon: (active) => <IconHome size={TAB_ICON_SIZE} strokeWidth={tabStroke(active)} />,
  },
  {
    label: "Community",
    path: "/community",
    icon: (active) => <IconUsers size={TAB_ICON_SIZE} strokeWidth={tabStroke(active)} />,
  },
  {
    label: "Help request",
    path: "/request",
    raised: true,
    icon: (active) => <IconPlus size={30} strokeWidth={tabStroke(active)} />,
  },
  {
    label: "Play",
    path: "/challenges",
    icon: (active) => <IconGamepad size={TAB_ICON_SIZE} strokeWidth={tabStroke(active)} />,
  },
  {
    label: "Profile",
    path: "/me",
    icon: (active) => <IconUserRound size={TAB_ICON_SIZE} strokeWidth={tabStroke(active)} />,
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
