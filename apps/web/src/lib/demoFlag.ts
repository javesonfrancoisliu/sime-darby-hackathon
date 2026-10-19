// Whether the local identity picker is offered. On unless a build sets VITE_DEMO_SIGN_IN=false,
// which pairs with an API run without DEMO_AUTH_ENABLED=true. Not a security boundary on its own.
export function demoSignInEnabled(): boolean {
  return import.meta.env.VITE_DEMO_SIGN_IN !== "false";
}
