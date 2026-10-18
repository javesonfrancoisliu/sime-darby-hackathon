import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../ui/AppShell";
import { AccessibilityProvider, useAccessibility } from "./AccessibilityContext";

/** A tiny harness that opens the accessibility sheet on mount. */
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
    await userEvent.click(screen.getByRole("switch", { name: /High Contrast/i }));
    expect(el).toHaveClass("high-contrast");
  });

  it("toggles reduced motion on the root", async () => {
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "open-settings" }));
    const el = root(container);
    const before = el.classList.contains("reduced-motion");
    await userEvent.click(screen.getByRole("switch", { name: /Gentle Transitions/i }));
    expect(el.classList.contains("reduced-motion")).toBe(!before);
  });
});
