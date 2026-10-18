// Whether the demo identity picker is offered. On unless a build sets VITE_DEMO_SIGN_IN=false,
// which pairs with an API run without DEMO_AUTH_ENABLED=true. Not a security boundary on its own.
export function demoSignInEnabled(): boolean {
  return import.meta.env.VITE_DEMO_SIGN_IN !== "false";
}

// Whether demo-only affordances (e.g. Demo Controls) should be shown.
//
// True in dev, or in any build where VITE_DEMO_CONTROLS=true (so it can be
// enabled for the mobile Vite preview used in the hackathon showcase).
//
// NOTE: this is a UI convenience flag ONLY. It is NOT authentication or a
// security boundary - it just toggles visibility of demo controls.
export function demoControlsEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_DEMO_CONTROLS === "true";
}
