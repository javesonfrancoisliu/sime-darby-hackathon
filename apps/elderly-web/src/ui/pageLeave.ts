// True once the page has started leaving for another document (for example after sign out), so
// teardown code does not start a history move or a second navigation that would cancel it.
let leaving = false;

export function beginPageLeave(): void {
  leaving = true;
}

export function endPageLeave(): void {
  leaving = false;
}

export function pageIsLeaving(): boolean {
  return leaving;
}
