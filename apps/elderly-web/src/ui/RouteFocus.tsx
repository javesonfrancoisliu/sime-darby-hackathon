import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const APP_NAME = "Help a Neighbour";

// Page names for the browser tab and screen readers, matched on the start of the path.
const TITLES: [string, string][] = [
  ["/safety", "Health and safety"],
  ["/community", "Community"],
  ["/challenges", "Play"],
  ["/me", "Me"],
  ["/request/confirmation", "Request sent"],
  ["/request", "Ask for help"],
  ["/requests", "My requests"],
];

function titleFor(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1] : "Home";
}

// On every page change, name the page and move focus to its main heading.
export function RouteFocus() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${titleFor(pathname)} - ${APP_NAME}`;
    const heading = document.querySelector<HTMLElement>("main h1");
    const target = heading ?? document.querySelector<HTMLElement>("main");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
