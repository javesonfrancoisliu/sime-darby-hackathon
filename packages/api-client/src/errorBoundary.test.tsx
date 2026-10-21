import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppErrorBoundary, isStaleBuildError } from "./errorBoundary";

function Boom({ message = "boom" }: { message?: string }): never {
  throw new Error(message);
}

afterEach(cleanup);

describe("AppErrorBoundary", () => {
  it("renders children when nothing fails", () => {
    render(
      <AppErrorBoundary>
        <p>All good</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeTruthy();
  });

  it("replaces a crashed screen with a reload prompt and reports the error", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onError = vi.fn();
    const onReload = vi.fn();
    render(
      <AppErrorBoundary onError={onError} onReload={onReload} homeHref="/volunteer/">
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    expect(onError).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Back to start" }).getAttribute("href")).toBe(
      "/volunteer/",
    );
    vi.restoreAllMocks();
  });

  it("explains a stale build and hides the home link when none is given", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <AppErrorBoundary onError={() => undefined}>
        <Boom message="Failed to fetch dynamically imported module: /x.js" />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain("A new version is ready");
    expect(screen.queryByRole("link")).toBeNull();
    vi.restoreAllMocks();
  });

  it("only treats module-load failures as stale builds", () => {
    expect(isStaleBuildError(new Error("Loading chunk 7 failed"))).toBe(true);
    expect(isStaleBuildError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
