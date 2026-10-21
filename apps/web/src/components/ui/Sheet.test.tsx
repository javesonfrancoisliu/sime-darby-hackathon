import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";
import { dropStaleSheetEntry, Sheet } from "./Sheet";

function Harness({ onClosed, reducedMotion }: { onClosed?: () => void; reducedMotion?: boolean }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  return (
    <div className="app-shell">
      <main>
        <button
          type="button"
          onClick={(event) => {
            opener.current = event.currentTarget;
            setOpen(true);
          }}
        >
          opener
        </button>
      </main>
      <Sheet
        open={open}
        openerRef={opener}
        reducedMotion={reducedMotion}
        onClose={() => {
          setOpen(false);
          onClosed?.();
        }}
        title="My sheet"
      >
        <button type="button">inside</button>
      </Sheet>
    </div>
  );
}

// A sheet that can open a second sheet, and a confirm dialog drawn beside the first one.
function Stacked() {
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="app-shell">
      <main>
        <button type="button" onClick={() => setFirst(true)}>
          open first
        </button>
      </main>
      <Sheet open={first} onClose={() => setFirst(false)} title="First sheet">
        <button type="button" onClick={() => setSecond(true)}>
          open second
        </button>
        <button type="button" onClick={() => setConfirm(true)}>
          ask
        </button>
      </Sheet>
      <Sheet open={second} onClose={() => setSecond(false)} title="Second sheet">
        <p>second body</p>
      </Sheet>
      <Modal open={confirm} title="Sure?" onClose={() => setConfirm(false)}>
        <p>confirm body</p>
      </Modal>
    </div>
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
  isPrimary: boolean;
  constructor(
    type: string,
    init: MouseEventInit & { pointerId?: number; isPrimary?: boolean } = {},
  ) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.isPrimary = init.isPrimary ?? true;
  }
}

function sheetMarker(): string | undefined {
  return (window.history.state as { sdhSheet?: string } | null)?.sdhSheet;
}

// Replaces matchMedia so a test can flip the system reduced-motion choice while a sheet is open.
function stubReducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") ? matches : false,
    media: query,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  }));
  return (next: boolean) => {
    matches = next;
    act(() => listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent)));
  };
}

beforeEach(() => {
  window.history.replaceState(null, "");
  vi.stubGlobal("PointerEvent", FakePointerEvent);
});
afterEach(async () => {
  vi.restoreAllMocks();
  // Let any history step a closing sheet started finish before the next test.
  await new Promise((resolve) => setTimeout(resolve, 60));
});

describe("Sheet open", () => {
  it("is a labelled modal dialog with a grabber, a visible Done and a scrim", async () => {
    render(<Harness />);
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "My sheet" })).toBeInTheDocument();
    expect(dialog.querySelector(".ui-sheet-grabber")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeVisible();
    expect(screen.getByTestId("sheet-scrim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
  });

  it("locks page scroll, makes the page inert, pushes one history entry and slides with transform", async () => {
    const push = vi.spyOn(window.history, "pushState");
    render(<Harness />);
    const { opener, dialog } = await openSheet();
    expect(document.body.style.overflow).toBe("hidden");
    expect(opener.closest("[inert]")).not.toBeNull();
    expect(dialog.closest("[inert]")).toBeNull();
    expect(sheetMarker()).toBeTruthy();
    expect(push).toHaveBeenCalledTimes(1);
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

  it("pulls Tab back into the sheet when focus has fallen to the page body", async () => {
    render(<Harness />);
    const { dialog } = await openSheet();
    (document.activeElement as HTMLElement).blur();
    expect(document.body).toHaveFocus();
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();

    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "inside" })).toHaveFocus();
  });

  it("limits its height to 85 percent of the screen and scrolls the body inside", async () => {
    render(<Harness />);
    const { dialog } = await openSheet();
    expect(dialog.querySelector(".ui-sheet-body")).not.toBeNull();
    expect(dialog.querySelector(".ui-sheet-drag")?.contains(screen.getByRole("heading"))).toBe(
      true,
    );
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

  it("returns focus to the opener recorded on click even when the click never focused it", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "opener" });
    // Safari does not focus a button on click; the page body holds focus instead.
    fireEvent.click(opener);
    expect(opener).not.toHaveFocus();
    await screen.findByRole("dialog", { name: "My sheet" });
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await gone();
    expect(opener).toHaveFocus();
  });

  it("closes on Escape", async () => {
    render(<Harness />);
    const { opener } = await openSheet();
    await userEvent.keyboard("{Escape}");
    await gone();
    expect(opener).toHaveFocus();
  });

  it("closes on Escape even when focus has fallen to the page body", async () => {
    render(<Harness />);
    await openSheet();
    (document.activeElement as HTMLElement).blur();
    expect(document.body).toHaveFocus();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await gone();
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
    expect(marker).toBeTruthy();
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

describe("Sheet history after a reload", () => {
  it("reuses a stale entry instead of stacking another one on it", async () => {
    window.history.replaceState({ sdhSheet: "left-over" }, "");
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    render(<Harness />);
    await openSheet();
    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(sheetMarker()).toBeTruthy();
    expect(sheetMarker()).not.toBe("left-over");
  });

  it("steps back over a stale entry at start-up so Back is not a dead press", () => {
    window.history.replaceState({ sdhSheet: "left-over" }, "");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    dropStaleSheetEntry();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("steps over a stale entry when Back lands on it later", () => {
    window.history.replaceState({ sdhSheet: "left-over" }, "");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("leaves a plain entry alone at start-up", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    dropStaleSheetEntry();
    expect(back).not.toHaveBeenCalled();
  });

  it("does not treat the entry of an open sheet as stale", async () => {
    render(<Harness />);
    await openSheet();
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    dropStaleSheetEntry();
    expect(back).not.toHaveBeenCalled();
  });
});

describe("Sheet motion", () => {
  it("fades instead of sliding when the app asks for less movement", async () => {
    render(<Harness reducedMotion />);
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute("data-motion", "fade");
    expect(dialog.style.transform).toBe("");
    await waitFor(() => expect(dialog.style.opacity).toBe("1"));
    expect(dialog.style.transition).toContain("opacity");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(dialog.style.opacity).toBe("0");
    await gone();
  });

  it("follows the system reduced-motion setting when it changes while open", async () => {
    const setReduced = stubReducedMotion(false);
    render(<Harness />);
    const { dialog } = await openSheet();
    await waitFor(() => expect(dialog.style.transform).toContain("0px"));
    expect(dialog).toHaveAttribute("data-motion", "slide");

    setReduced(true);
    expect(dialog).toHaveAttribute("data-motion", "fade");
    expect(dialog.style.transform).toBe("");
    expect(dialog.style.opacity).toBe("1");

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(dialog.style.opacity).toBe("0");
    await gone();
  });

  it("goes back to sliding when the setting is switched off while open", async () => {
    const setReduced = stubReducedMotion(true);
    render(<Harness />);
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute("data-motion", "fade");

    setReduced(false);
    expect(dialog).toHaveAttribute("data-motion", "slide");
    expect(dialog.style.opacity).toBe("");
    expect(dialog.style.transform).toContain("0px");

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(dialog.style.transform).not.toContain("0px, 0px");
    await gone();
  });
});

describe("Sheet drag", () => {
  function press(y: number, init: Record<string, unknown> = {}) {
    const handle = document.querySelector<HTMLElement>(".ui-sheet-drag") as HTMLElement;
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: y, button: 0, ...init });
    return handle;
  }

  function clock(step: number) {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (now += step));
  }

  it("dismisses when dragged down more than a quarter of the sheet", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    clock(1000);
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
    clock(1000);
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = press(100);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 140 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });
    expect(dialog.style.transform).toContain("0px");
    expect(dialog.style.transform).not.toContain("40px");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dismisses on a fast flick past 24 px even when short of a quarter", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    clock(10);
    render(<Harness />);
    await openSheet();
    const handle = press(100);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 130 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 130 });
    await gone();
  });

  it("ignores a fast flick of 24 px or less", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    clock(10);
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = press(100);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 120 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 120 });
    expect(dialog.style.transform).not.toContain("20px");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("drags from the title row as well as the grabber", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    clock(1000);
    render(<Harness />);
    const { dialog } = await openSheet();
    const title = screen.getByRole("heading", { name: "My sheet" });
    fireEvent.pointerDown(title, { pointerId: 1, clientY: 100, button: 0 });
    fireEvent.pointerMove(title, { pointerId: 1, clientY: 130 });
    expect(dialog.style.transform).toContain("30px");
  });

  it("ignores a drag that starts with a non-primary button", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = press(100, { button: 2 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });
    expect(dialog.style.transform).not.toContain("200px");
  });

  it("ignores a drag from a secondary pointer", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    render(<Harness />);
    const { dialog } = await openSheet();
    const handle = press(100, { isPrimary: false });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });
    expect(dialog.style.transform).not.toContain("200px");
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

describe("Sheet stacking", () => {
  it("keeps the scroll lock and the page inert until the last of two sheets closes", async () => {
    render(<Stacked />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    await userEvent.click(await screen.findByRole("button", { name: "open second" }));
    expect(await screen.findByRole("dialog", { name: "Second sheet" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("dialog", { name: "First sheet" }).closest("[inert]")).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Second sheet" })).not.toBeInTheDocument(),
    );
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("dialog", { name: "First sheet" }).closest("[inert]")).toBeNull();

    await userEvent.keyboard("{Escape}");
    await gone();
    expect(document.body.style.overflow).toBe("");
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
  });

  it("closes only the top sheet on Escape and only the top sheet on Back", async () => {
    render(<Stacked />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    await userEvent.click(await screen.findByRole("button", { name: "open second" }));
    await screen.findByRole("dialog", { name: "Second sheet" });

    window.history.back();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Second sheet" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "First sheet" })).toBeInTheDocument();

    window.history.back();
    await gone();
  });

  it("closes a confirm dialog before the sheet beneath it, on Escape and on Back", async () => {
    render(<Stacked />);
    await userEvent.click(screen.getByRole("button", { name: "open first" }));
    await userEvent.click(await screen.findByRole("button", { name: "ask" }));
    expect(await screen.findByRole("dialog", { name: "Sure?" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Sure?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "First sheet" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ask" }));
    await screen.findByRole("dialog", { name: "Sure?" });
    window.history.back();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Sure?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "First sheet" })).toBeInTheDocument();

    window.history.back();
    await gone();
  });
});

describe("Sheet guardClose", () => {
  function Guarded({ block, onClosed }: { block: () => boolean; onClosed: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <div className="app-shell">
        <Sheet
          open={open}
          guardClose={block}
          onClose={() => {
            setOpen(false);
            onClosed();
          }}
          title="Guarded"
        >
          <p>body</p>
        </Sheet>
      </div>
    );
  }

  it("keeps the sheet open on Escape, Done and a scrim tap while the guard says so", async () => {
    const block = vi.fn(() => true);
    const onClosed = vi.fn();
    render(<Guarded block={block} onClosed={onClosed} />);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    expect(block).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("dialog", { name: "Guarded" })).toBeInTheDocument();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("closes normally when the guard lets it through", async () => {
    const block = vi.fn(() => false);
    render(<Guarded block={block} onClosed={() => {}} />);
    await userEvent.keyboard("{Escape}");
    await gone();
    expect(block).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet open on phone Back while the guard says so, then closes once it lets go", async () => {
    let hold = true;
    const block = vi.fn(() => hold);
    const onClosed = vi.fn();
    render(<Guarded block={block} onClosed={onClosed} />);
    const depth = window.history.length;
    window.history.back();
    await waitFor(() => expect(block).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog", { name: "Guarded" })).toBeInTheDocument();
    expect(onClosed).not.toHaveBeenCalled();
    expect(window.history.state?.sdhSheet).toBeDefined();
    expect(window.history.length).toBe(depth);

    hold = false;
    window.history.back();
    await gone();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("puts the sheet's own address back when a reused entry sat above another page", async () => {
    window.history.pushState(null, "", "/elsewhere");
    window.history.pushState({ sdhSheet: "left-over" }, "", "/here");
    const block = vi.fn(() => true);
    render(<Guarded block={block} onClosed={() => {}} />);
    expect(window.location.pathname).toBe("/here");
    window.history.back();
    await waitFor(() => expect(block).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog", { name: "Guarded" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/here");
  });
});
