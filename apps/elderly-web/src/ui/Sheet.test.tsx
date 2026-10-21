import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ACCESSIBILITY_STORAGE_KEY, AccessibilityProvider } from "../context/AccessibilityContext";
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
