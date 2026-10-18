import type { ReactNode } from "react";
import { useInRouterContext } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { AccessibilitySheet } from "./AccessibilitySheet";
import { useAccessibility } from "../context/AccessibilityContext";

/**
 * AppShell — page frame with Sime Darby Property branding and single readable column.
 * Incorporates Apple design translucent material chrome and Silver Generation accessibility:
 * - Dynamic Type text scaling (.text-size-normal / .text-size-large / .text-size-xlarge)
 * - High contrast mode (.high-contrast)
 * - Reduced motion (.reduced-motion)
 * - Accessibility control sheet (<AccessibilitySheet />)
 * - Easy View is applied at root (Option A, Req 1.1, 1.2, 2.3, 3.2).
 */
export function AppShell({ children }: { children: ReactNode }) {
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
    <div className={rootClasses}>
      <main className="app-main">{children}</main>
      {inRouter && <BottomTabBar />}
      <AccessibilitySheet />
    </div>
  );
}
