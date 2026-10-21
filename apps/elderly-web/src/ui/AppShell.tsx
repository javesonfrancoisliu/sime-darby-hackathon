import type { MouseEvent, ReactNode } from "react";
import { useInRouterContext } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { AccessibilitySheet } from "./AccessibilitySheet";
import { AnnouncerProvider } from "./Announcer";
import { CallConfirmProvider } from "./CallConfirm";
import { RouteFocus } from "./RouteFocus";
import { useAccessibility } from "../context/AccessibilityContext";

// Move focus to the main landmark without changing the URL hash.
function skipToMain(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById("main-content")?.focus();
}

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
      <CallConfirmProvider>
        <div className={rootClasses}>
          <a className="skip-link" href="#main-content" onClick={skipToMain}>
            Skip to main content
          </a>
          {inRouter && <RouteFocus />}
          <main className="app-main" id="main-content" tabIndex={-1}>
            {children}
          </main>
          {inRouter && !hideTabs && <BottomTabBar />}
          <AccessibilitySheet />
        </div>
      </CallConfirmProvider>
    </AnnouncerProvider>
  );
}
