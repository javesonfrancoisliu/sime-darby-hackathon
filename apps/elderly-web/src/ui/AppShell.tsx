import type { ReactNode } from "react";
import { useInRouterContext } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { DemoBanner } from "./DemoBanner";
import { AccessibilitySheet } from "./AccessibilitySheet";
import { AnnouncerProvider } from "./Announcer";
import { RouteFocus } from "./RouteFocus";
import { useAccessibility } from "../context/AccessibilityContext";

// Page frame: Sime Darby branding, one readable column, and the settings classes
// (text size, strong contrast, less movement) on the root element.
export function AppShell({
  children,
  hideTabs = false,
}: {
  children: ReactNode;
  hideTabs?: boolean;
}) {
  const inRouter = useInRouterContext();
  const { fontSize, highContrast, reducedMotion } = useAccessibility();

  const rootClasses = [
    "app-root",
    "easy-view",
    `text-size-${fontSize}`,
    highContrast ? "high-contrast" : "",
    reducedMotion ? "reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AnnouncerProvider>
      <div className={rootClasses}>
        {inRouter && <RouteFocus />}
        <DemoBanner />
        <main className="app-main">{children}</main>
        {inRouter && !hideTabs && <BottomTabBar />}
        <AccessibilitySheet />
      </div>
    </AnnouncerProvider>
  );
}
