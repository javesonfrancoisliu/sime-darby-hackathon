import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TOAST_DISMISS_MS, useToast } from "./Toast";

function Harness() {
  const { notify, toast } = useToast();
  return (
    <>
      <button type="button" onClick={() => notify("Saved")}>
        save
      </button>
      {toast}
    </>
  );
}

afterEach(() => vi.useRealTimers());

describe("toast", () => {
  it("announces the message politely and clears it after about three seconds", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();

    act(() => screen.getByRole("button", { name: "save" }).click());
    expect(region).toHaveTextContent("Saved");

    act(() => vi.advanceTimersByTime(TOAST_DISMISS_MS - 1));
    expect(region).toHaveTextContent("Saved");
    act(() => vi.advanceTimersByTime(1));
    expect(region).toBeEmptyDOMElement();
  });
});
