// One-shot request for Profile to open the My details drawer the next time it mounts. Used when a
// page is left by going back in history, which cannot carry router state.
let requested = false;

export function requestDetailsOnProfile(): void {
  requested = true;
}

// True once per request: reading it clears it, so a later visit or reload opens nothing.
export function takeDetailsRequest(): boolean {
  const wanted = requested;
  requested = false;
  return wanted;
}
