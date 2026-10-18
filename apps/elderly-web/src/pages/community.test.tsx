import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CommunityPage } from "./CommunityPage";
import { AccessibilityProvider } from "../context/AccessibilityContext";

function renderCommunity() {
  return render(
    <MemoryRouter>
      <AccessibilityProvider>
        <CommunityPage />
      </AccessibilityProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Community page stateful actions", () => {
  it("registers for an event and toggles back (Register → Registered)", async () => {
    renderCommunity();
    const register = screen.getAllByRole("button", { name: /^Register$/i })[0]!;
    await userEvent.click(register);
    // Button now shows the confirmed state and is pressed.
    const done = screen.getAllByRole("button", { name: /Registered/i })[0]!;
    expect(done).toHaveAttribute("aria-pressed", "true");
    // Toggle back.
    await userEvent.click(done);
    expect(screen.getAllByRole("button", { name: /^Register$/i })[0]).toBeInTheDocument();
  });

  it("signs up to volunteer and advances the count", async () => {
    renderCommunity();
    // Switch to the Volunteer tab.
    await userEvent.click(screen.getByRole("tab", { name: /Volunteer/i }));
    const firstCard = screen.getByText("Grocery Delivery for Seniors").closest(".safety-card") as HTMLElement;
    const btn = within(firstCard).getByRole("button", { name: /I can help/i });
    // Baseline count "7 / 10".
    expect(within(firstCard).getByText(/7 \/ 10/)).toBeInTheDocument();
    await userEvent.click(btn);
    // Count advances to 8 / 10 and the button is confirmed.
    expect(within(firstCard).getByText(/8 \/ 10/)).toBeInTheDocument();
    expect(within(firstCard).getByRole("button", { name: /signed up/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
