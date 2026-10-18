import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../ui/AppShell";
import {
  ACCESSIBILITY_STORAGE_KEY,
  AccessibilityProvider,
  useAccessibility,
} from "./AccessibilityContext";

// A tiny harness that opens the accessibility sheet on mount.
function OpenSheet() {
  const { openSheet } = useAccessibility();
  return (
    <button type="button" onClick={openSheet}>
      open-settings
    </button>
  );
}

function renderShell() {
  return render(
    <MemoryRouter>
      <AccessibilityProvider>
        <AppShell>
          <OpenSheet />
        </AppShell>
      </AccessibilityProvider>
    </MemoryRouter>,
  );
}

function root(container: HTMLElement) {
  return container.querySelector(".app-root") as HTMLElement;
}

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("accessibility controls apply to the DOM", () => {
  it("defaults to large text and easy view", () => {
    const { container } = renderShell();
    const el = root(container);
    expect(el).toHaveClass("easy-view");
    expect(el).toHaveClass("text-size-large");
  });

  it("changes the root class when text size is set to X-Large", async () => {
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    await userEvent.click(screen.getByRole("radio", { name: /X-Large/i }));
    expect(root(container)).toHaveClass("text-size-xlarge");
    expect(root(container)).not.toHaveClass("text-size-large");
  });

  it("scales the root <html> font-size so all rem text grows together", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    await userEvent.click(screen.getByRole("radio", { name: /X-Large/i }));
    expect(document.documentElement.style.fontSize).toBe("23px");
    await userEvent.click(screen.getByRole("radio", { name: /Normal/i }));
    expect(document.documentElement.style.fontSize).toBe("16px");
  });

  it("changes the root class back to Normal", async () => {
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    await userEvent.click(screen.getByRole("radio", { name: /Normal/i }));
    expect(root(container)).toHaveClass("text-size-normal");
  });

  it("toggles high contrast on the root", async () => {
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    const el = root(container);
    expect(el).not.toHaveClass("high-contrast");
    await userEvent.click(screen.getByRole("switch", { name: /Strong contrast/i }));
    expect(el).toHaveClass("high-contrast");
  });

  it("toggles reduced motion on the root", async () => {
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    const el = root(container);
    const before = el.classList.contains("reduced-motion");
    await userEvent.click(screen.getByRole("switch", { name: /Less movement/i }));
    expect(el.classList.contains("reduced-motion")).toBe(!before);
  });
});

describe("saved settings", () => {
  it("keeps text size, contrast, voice and motion after a reload", async () => {
    const first = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    await userEvent.click(screen.getByRole("radio", { name: /X-Large/i }));
    await userEvent.click(screen.getByRole("switch", { name: /Strong contrast/i }));
    await userEvent.click(screen.getByRole("switch", { name: /Less movement/i }));
    const motion = root(first.container).classList.contains("reduced-motion");
    first.unmount();

    const second = renderShell();
    const el = root(second.container);
    expect(el).toHaveClass("text-size-xlarge");
    expect(el).toHaveClass("high-contrast");
    expect(el.classList.contains("reduced-motion")).toBe(motion);
    expect(JSON.parse(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) ?? "{}").fontSize).toBe(
      "xlarge",
    );
  });

  it("ignores a damaged saved value", () => {
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, "{not json");
    const { container } = renderShell();
    expect(root(container)).toHaveClass("text-size-large");
  });

  it("still works when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    await userEvent.click(screen.getByRole("radio", { name: /Normal/i }));
    expect(root(container)).toHaveClass("text-size-normal");
  });
});

describe("settings sheet focus", () => {
  it("moves focus to Close, traps Tab, and puts the page behind out of reach", async () => {
    const { container } = renderShell();
    const trigger = screen.getByRole("button", { name: "open-settings" });
    await userEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Reading and sound" });
    const close = screen.getByRole("button", { name: "Close settings" });
    expect(close).toHaveFocus();
    expect(trigger.closest("[inert]")).not.toBeNull();
    expect(dialog.closest("[inert]")).toBeNull();

    const items = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button"));
    items[items.length - 1]?.focus();
    await userEvent.tab();
    expect(items[0]).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(items[items.length - 1]).toHaveFocus();
    expect(root(container)).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the control that opened it", async () => {
    renderShell();
    const trigger = screen.getByRole("button", { name: "open-settings" });
    trigger.focus();
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger.closest("[inert]")).toBeNull();
  });
});
