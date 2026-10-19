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

  it("uploads this phone's settings when nothing was ever saved", async () => {
    const { calls } = installFakeApi({
      "GET /api/me/settings": { body: { ...DEFAULT_SETTINGS, updatedAt: ELDER.createdAt } },
      "PUT /api/me/settings": (call) => ({ body: { ...(call.body as object), updatedAt: "x" } }),
    });
    await renderApp("/me");
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true), {
      timeout: SETTINGS_SAVE_DELAY_MS * 4,
    });
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.body).toMatchObject({ fontSize: "normal", highContrast: false });
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
