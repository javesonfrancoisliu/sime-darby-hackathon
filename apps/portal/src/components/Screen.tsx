import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { APP_NAME } from "../lib/constants";

type ScreenProps = {
  // Page name for the browser tab, shown as "<title> - Help a Neighbour".
  title: string;
  // Visible heading; defaults to the page name.
  heading?: string;
  // Back link; the heading sits beside it, as in the account pages.
  backTo?: string;
  backLabel?: string;
  // Small text beside the back link, such as "Step 1 of 3".
  stepLabel?: string;
  step?: 1 | 2 | 3;
  tone?: "white" | "grey";
  centredHeading?: boolean;
  inlineHeading?: boolean;
  // Shown above the heading, such as the logo.
  aboveHeading?: ReactNode;
  children: ReactNode;
};

const STEP_COUNT = 3;

// One screen: sets the tab title and moves focus to the heading each time the page opens.
export function Screen({
  title,
  heading,
  backTo,
  backLabel = "Back",
  stepLabel,
  step,
  tone = "white",
  centredHeading = false,
  inlineHeading = false,
  aboveHeading,
  children,
}: ScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} - ${APP_NAME}`;
    headingRef.current?.focus();
  }, [title]);

  const h1 = (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className={`screen__heading${centredHeading ? " screen__heading--centre" : ""}`}
    >
      {heading ?? title}
    </h1>
  );

  return (
    <div className={`screen-bg screen-bg--${tone}`}>
      <main className="screen">
        {backTo && (
          <div className="screen__bar">
            <Link to={backTo} className="icon-link" aria-label={backLabel}>
              <ChevronLeft aria-hidden="true" size={28} strokeWidth={2.25} />
            </Link>
            {stepLabel && <span className="screen__step-label">{stepLabel}</span>}
            {inlineHeading && h1}
          </div>
        )}
        {step && (
          <div className="steps" aria-hidden="true">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <div key={i} className={`steps__bar${i < step ? " steps__bar--done" : ""}`} />
            ))}
          </div>
        )}
        {aboveHeading}
        {!inlineHeading && h1}
        {children}
      </main>
    </div>
  );
}
