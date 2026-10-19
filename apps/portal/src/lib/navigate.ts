// Full page loads into the other apps (and back to sign-in). Isolated so tests can replace it.
export function navigateToApp(path: string): void {
  window.location.assign(path);
}
