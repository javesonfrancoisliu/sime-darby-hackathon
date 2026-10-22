import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ACCESSIBILITY_STORAGE_KEY,
  AccessibilityProvider,
  useAccessibility,
} from "../context/AccessibilityContext";
import { CallConfirmProvider, useCallConfirm } from "./CallConfirm";
import { dropStaleEntry } from "./dialogLayer";
import { Sheet } from "./Sheet";

function Harness({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <AccessibilityProvider>
      <div className="app-root">
        <main>
          <button type="button" onClick={() => setOpen(true)}>
            opener
          </button>
        </main>
        <Sheet
          open={open}
          onClose={() => {
            setOpen(false);
            onClosed?.();
          }}
          title="My sheet"
        >
          <button type="button">inside</button>
        </Sheet>
      </div>
    </AccessibilityProvider>
  );
}

async function openSheet() {
  const opener = screen.getByRole("button", { name: "opener" });
  await userEvent.click(opener);
  return { opener, dialog: screen.getByRole("dialog", { name: "My sheet" }) };
}

async function gone() {
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

// jsdom has no PointerEvent; a mouse event with a pointer id carries the coordinates the sheet reads.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

function sheetMarker(): string | undefined {
  return (window.history.state as { sdhSheet?: string } | null)?.sdhSheet;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("PointerEvent", FakePointerEvent);
});
afterEach(() => vi.restoreAllMocks());

describe("Sheet open", () => {
  it("is a labelled modal dialog with a grabber, a visible Done and a scrim", async () => {
    render(<Harness />);
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.querySelector(".apple-sheet-grabber")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeVisible();
    expect(screen.getByTestId("sheet-scrim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
  });

  it("locks page scroll, makes the page inert, pushes a history entry and slides with transform", async () => {
    render(<Harness />);
    const { opener, dialog } = await openSheet();
    expect(document.body.style.overflow).toBe("hidden");
    expect(opener.closest("[inert]")).not.toBeNull();
    expect(dialog.closest("[inert]")).toBeNull();
    expect((window.history.state as { sdhSheet?: string } | null)?.sdhSheet).toBeTruthy();
    expect(dialog).toHaveAttribute("data-motion", "slide");
    await waitFor(() => expect(dialog.style.transform).toContain("0px"));
    expect(dialog.style.transition).toContain("transform");
    expect(dialog.style.transition).toContain("cubic-bezier(0.32, 0.72, 0, 1)");
  });

  it("keeps Tab inside the sheet", async () => {
    render(<Harness />);
    const { dialog } = await openSheet();
    const items = Array.from(dialog.querySelectorAll<HTMLElement>("button"));
    items[items.length - 1]?.focus();
    await userEvent.tab();
    expect(items[0]).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(items[items.length - 1]).toHaveFocus();
  });
});

describe("Sheet closing", () => {
  it("closes on Done, returns focus to the opener and unlocks the page", async () => {
    const onClosed = vi.fn();
    render(<Harness onClosed={onClosed} />);
    const { opener } = await openSheet();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await gone();
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    expect(opener.closest("[inert]")).toBeNull();
  });

  it("closes on Escape", async () => {
    render(<Harness />);
    const { opener } = await openSheet();
    await userEvent.keyboard("{Escape}");
    await gone();
    expect(opener).toHaveFocus();
  });

  it("closes when the scrim is tapped", async () => {
    render(<Harness />);
    await openSheet();
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    await gone();
  });

  it("closes on the phone back button and removes its history entry", async () => {
    render(<Harness />);
    await openSheet();
    const marker = sheetMarker();
    window.history.back();
    await gone();
    expect(sheetMarker()).not.toBe(marker);
  });

  it("pops the entry it pushed when closed by Done", async () => {
    render(<Harness />);
    await openSheet();
    const marker = sheetMarker();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await gone();
    await waitFor(() => expect(sheetMarker()).not.toBe(marker));
  });
});

describe("Sheet with less movement", () => {
  it("fades instead of sliding", async () => {
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({ reducedMotion: true }));
    render(<Harness />);
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute("data-motion", "fade");
    expect(dialog.style.transform).toBe("");
    await waitFor(() => expect(dialog.style.opacity).toBe("1"));
    expect(dialog.style.transition).toContain("opacity");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(dialog.style.opacity).toBe("0");
    await gone();
  });
});

describe("Sheet drag", () => {
  function press(y: number) {
    const handle = document.querySelector<HTMLElement>(".apple-sheet-drag") as HTMLElement;
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: y, button: 0 });
    return handle;
  }

  it("dismisses when dragged down more than a quarter of the sheet", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = press(100);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 150 });
    expect(dialog.style.transform).toContain("50px");
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 260 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 260 });
    await gone();
  });

  it("springs back when released early and slowly", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (now += 1000));
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = press(100);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 140 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });
    expect(dialog.style.transform).toContain("0px");
    expect(dialog.style.transform).not.toContain("40px");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dismisses on a fast flick even when short", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (now += 10));
    render(<Harness />);
    await openSheet();
    const handle = press(100);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 130 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 130 });
    await gone();
  });

  it("does not start a drag from the Done button", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    render(<Harness />);
    const { dialog } = await openSheet();
    const done = screen.getByRole("button", { name: "Done" });
    fireEvent.pointerDown(done, { pointerId: 1, clientY: 10, button: 0 });
    fireEvent.pointerMove(done, { pointerId: 1, clientY: 300 });
    expect(dialog.style.transform).not.toContain("290px");
  });

  it("starts from the current position when grabbed mid-move", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    render(<Harness />);
    const { dialog } = await openSheet();
    dialog.style.transform = "translate3d(0, 120px, 0)";
    const handle = press(100);
    expect(dialog.style.transition).toBe("none");
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 110 });
    expect(dialog.style.transform).toContain("130px");
  });
});

function MotionToggle() {
  const { setReducedMotion } = useAccessibility();
  return (
    <button type="button" onClick={() => setReducedMotion(true)}>
      less movement
    </button>
  );
}

function CallButton() {
  const { requestCall } = useCallConfirm();
  return (
    <button
      type="button"
      onClick={() => requestCall({ tel: "999", display: "999", label: "Emergency services" })}
    >
      call
    </button>
  );
}

function Stack({ guard }: { guard?: () => boolean }) {
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(false);
  return (
    <AccessibilityProvider>
      <CallConfirmProvider>
        <div className="app-root">
          <main>
            <button type="button" onClick={() => setFirst(true)}>
              open first
            </button>
            <button type="button" onClick={() => setSecond(true)}>
              open second
            </button>
          </main>
          <Sheet open={first} onClose={() => setFirst(false)} title="First" canDismiss={guard}>
            <MotionToggle />
            <CallButton />
          </Sheet>
          <Sheet open={second} onClose={() => setSecond(false)} title="Second">
            <button type="button">second inside</button>
          </Sheet>
        </div>
      </CallConfirmProvider>
    </AccessibilityProvider>
  );
}

describe("Sheet keys and focus", () => {
  it("closes on Escape when focus has fallen to the body", async () => {
    render(<Harness />);
    await openSheet();
    (document.activeElement as HTMLElement).blur();
    expect(document.body).toHaveFocus();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await gone();
  });

  it("pulls Tab back into the sheet when focus has fallen to the body", async () => {
    render(<Harness />);
    const { dialog } = await openSheet();
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("gives focus back to the clicked opener even when the click did not focus it", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "opener" });
    fireEvent.click(opener);
    await screen.findByRole("dialog");
    expect(opener).not.toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await gone();
    expect(opener).toHaveFocus();
  });
});

describe("Sheet motion mode while open", () => {
  it("switches to fade when the system setting turns on", async () => {
    let listener: (() => void) | undefined;
    const query = {
      matches: false,
      addEventListener: (_: string, fn: () => void) => (listener = fn),
      removeEventListener: () => {},
    };
    vi.stubGlobal("matchMedia", () => query);
    render(<Harness />);
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute("data-motion", "slide");
    query.matches = true;
    act(() => listener?.());
    expect(dialog).toHaveAttribute("data-motion", "fade");
    expect(dialog.style.transform).toBe("");
    await waitFor(() => expect(dialog.style.opacity).toBe("1"));
    vi.unstubAllGlobals();
  });

  it("switches to fade when the app Less movement setting turns on", async () => {
    render(<Stack />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    const dialog = screen.getByRole("dialog", { name: "First" });
    expect(dialog).toHaveAttribute("data-motion", "slide");
    await userEvent.click(screen.getByRole("button", { name: "less movement" }));
    expect(dialog).toHaveAttribute("data-motion", "fade");
  });
});

describe("Sheet drag details", () => {
  it("ignores a drag started with a non-primary button", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = document.querySelector<HTMLElement>(".apple-sheet-drag") as HTMLElement;
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 2 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });
    expect(dialog.style.transform).not.toContain("200px");
  });

  it("keeps a fast flick shorter than 24 px open", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (now += 10));
    render(<Harness />);
    await openSheet();
    const handle = document.querySelector<HTMLElement>(".apple-sheet-drag") as HTMLElement;
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 115 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 115 });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("stays open when canDismiss refuses a scrim tap, Escape and Done, then closes once allowed", async () => {
    let allow = false;
    const guard = vi.fn(() => allow);
    render(<Stack guard={guard} />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(guard).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("dialog", { name: "First" })).toBeInTheDocument();
    allow = true;
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await gone();
  });
});

describe("Sheet stacking", () => {
  it("keeps the scroll lock until the last sheet closes", async () => {
    render(<Stack />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    fireEvent.click(screen.getByRole("button", { name: "open second", hidden: true }));
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document.body, { key: "Escape" });
    await gone();
    expect(document.body.style.overflow).toBe("");
  });

  it("Back closes a confirm dialog before the sheet under it", async () => {
    render(<Stack />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    await userEvent.click(screen.getByRole("button", { name: "call" }));
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(2);
    window.history.back();
    await waitFor(() => expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1));
    expect(screen.getByRole("dialog", { name: "First" })).toBeInTheDocument();
    window.history.back();
    await gone();
  });

  it("keeps the sheet when the engine runs window popstate listeners in the order they were added", async () => {
    // Some engines ignore the capture flag for listeners on the window itself.
    const add = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) =>
      add(
        type,
        listener,
        type === "popstate" ? false : options,
      )) as typeof window.addEventListener);
    render(<Stack />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    const sheetEntry = sheetMarker();
    await userEvent.click(screen.getByRole("button", { name: "call" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(sheetMarker()).toBe(sheetEntry));
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(screen.getByRole("dialog", { name: "First" })).toBeInTheDocument();
    expect(sheetMarker()).toBe(sheetEntry);
  });

  it("Cancel closes only the confirm dialog and leaves the sheet and its history entry", async () => {
    render(
      <StrictMode>
        <Stack />
      </StrictMode>,
    );
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    const sheetEntry = sheetMarker();
    await userEvent.click(screen.getByRole("button", { name: "call" }));
    expect(sheetMarker()).not.toBe(sheetEntry);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(sheetMarker()).toBe(sheetEntry));
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "First" })).toBeInTheDocument();
    expect(sheetMarker()).toBe(sheetEntry);
  });

  it("Escape closes only the confirm dialog when it sits over a sheet", async () => {
    render(<Stack />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    await userEvent.click(screen.getByRole("button", { name: "call" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1));
    expect(screen.getByRole("dialog", { name: "First" })).toBeInTheDocument();
  });
});

describe("Sheet history after a reload", () => {
  it("steps off a stale entry left by a reload instead of leaving a dead Back press", async () => {
    window.history.replaceState({ sdhSheet: "gone" }, "");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    dropStaleEntry();
    expect(back).toHaveBeenCalledTimes(1);
    expect(sheetMarker()).toBeUndefined();
  });

  it("opens over a stale entry with a fresh marker that Back closes", async () => {
    window.history.replaceState({ sdhSheet: "gone" }, "");
    render(<Harness />);
    await openSheet();
    expect(sheetMarker()).toBeTruthy();
    expect(sheetMarker()).not.toBe("gone");
    window.history.back();
    await gone();
  });
});
