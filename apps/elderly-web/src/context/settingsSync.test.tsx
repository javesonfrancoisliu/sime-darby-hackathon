import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_SETTINGS } from "@sdh/contracts";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER } from "../test/fixtures";
import { ACCESSIBILITY_STORAGE_KEY } from "./AccessibilityContext";
import { SETTINGS_SAVE_DELAY_MS } from "./AccessibilitySync";

beforeEach(() => {
  window.localStorage.clear();
  signInAs();
});
afterEach(() => vi.useRealTimers());

const saved = {
  ...DEFAULT_SETTINGS,
  fontSize: "xlarge",
  highContrast: true,
  updatedAt: "2026-10-18T09:00:00Z",
};

describe("settings follow the person", () => {
  it("applies the saved settings after sign-in", async () => {
    installFakeApi({ "GET /api/me/settings": { body: saved } });
    const { container } = await renderApp("/me");
    await waitFor(() => {
      const root = container.querySelector(".app-root");
      expect(root).toHaveClass("text-size-xlarge", "high-contrast");
    });
  });

  it("previews every saved setting on the Me page", async () => {
    installFakeApi({
      "GET /api/me/settings": { body: { ...saved, reducedMotion: true, voiceAssist: true } },
    });
    await renderApp("/me");
    const row = await screen.findByRole("button", { name: "Open text and sound settings" });
    await waitFor(() => expect(row).toHaveTextContent("Less movement: On"));
    expect(row).toHaveTextContent("Text size: X-Large");
    expect(row).toHaveTextContent("Strong contrast: On");
    expect(row).toHaveTextContent("Read aloud: On");
  });

  it("starts a new person from the defaults and uploads nothing", async () => {
    window.localStorage.setItem(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, fontSize: "xlarge", highContrast: true }),
    );
    const { calls } = installFakeApi({
      "GET /api/me/settings": { body: { ...DEFAULT_SETTINGS, updatedAt: ELDER.createdAt } },
      "PUT /api/me/settings": (call) => ({ body: { ...(call.body as object), updatedAt: "x" } }),
    });
    const { container } = await renderApp("/me");
    await waitFor(() => {
      expect(container.querySelector(".app-root")).toHaveClass("text-size-normal");
    });
    expect(container.querySelector(".app-root")).not.toHaveClass("high-contrast");
    await new Promise((resolve) => setTimeout(resolve, SETTINGS_SAVE_DELAY_MS + 300));
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
    expect(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)).not.toContain("xlarge");
  });

  it("saves a change once after a pause and keeps the local copy", async () => {
    const { calls } = installFakeApi({
      "GET /api/me/settings": { body: { ...saved, fontSize: "large", highContrast: false } },
      "PUT /api/me/settings": (call) => ({ body: { ...(call.body as object), updatedAt: "x" } }),
    });
    await renderApp("/me");
    await waitFor(() => expect(calls.some((c) => c.path === "/api/me/settings")).toBe(true));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.click(screen.getByRole("button", { name: "Open text and sound settings" }));
    await userEvent.click(screen.getByRole("radio", { name: /X-Large/i }));
    await userEvent.click(screen.getByRole("switch", { name: "Strong contrast" }));
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SETTINGS_SAVE_DELAY_MS + 50);
    });
    const puts = calls.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0]?.body).toMatchObject({ fontSize: "xlarge", highContrast: true });
    expect(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)).toContain("xlarge");
  });

  it("keeps working from the local copy when the server cannot be reached", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    installFakeApi({ "GET /api/me/settings": { status: 500, body: {} } });
    const { container } = await renderApp("/me");
    expect(container.querySelector(".app-root")).toHaveClass("text-size-normal");
  });
});
