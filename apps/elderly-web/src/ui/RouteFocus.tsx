import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { clearDetailsRequest } from "../pages/me/detailsRequest";
import { scrollToTop } from "./scrollToTop";

const APP_NAME = "Township Connect";

// Page names for the browser tab and screen readers, matched on the start of the path.
const TITLES: [string, string][] = [
  ["/safety", "Health and safety"],
  ["/community", "Community"],
  ["/challenges", "Play"],
  ["/me", "Profile"],
  ["/request/confirmation", "Request sent"],
  ["/request", "Ask for help"],
  ["/requests", "My requests"],
];

function titleFor(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1] : "Home";
}

// On every page change, name the page, start at the top and move focus to its main heading.
// Going back keeps the browser's own scroll position, so a person finds their place again.
export function RouteFocus() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const firstRun = useRef(true);
  const lastPath = useRef<string | null>(null);

  // A request to open My details is meant for the Profile page right after it: if Back landed on
  // any other page, drop it so a later visit to Profile does not open the drawer unasked.
  useEffect(() => {
    if (pathname !== "/me") clearDetailsRequest();
  }, [pathname]);

  useEffect(() => {
    const isFirstRun = firstRun.current;
    firstRun.current = false;
    // Closing a sheet with the back button pops to the same page; focus stays where the sheet put it.
    const samePage = lastPath.current === pathname;
    lastPath.current = pathname;
    if (samePage) return;
    document.title = `${titleFor(pathname)} - ${APP_NAME}`;
    // A first load reports POP too, and still starts at the top.
    if (navigationType !== "POP" || isFirstRun) scrollToTop();
    const heading = document.querySelector<HTMLElement>("main h1");
    const target = heading ?? document.querySelector<HTMLElement>("main");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, [pathname, navigationType]);

  return null;
}
