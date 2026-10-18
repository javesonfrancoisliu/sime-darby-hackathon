import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carousel } from "./Carousel";

const slides = [
  <button key="a">Air</button>,
  <button key="b">Heat</button>,
  <button key="c">Repairs</button>,
];

afterEach(() => vi.useRealTimers());

describe("Carousel", () => {
  it("never advances on its own", () => {
    vi.useFakeTimers();
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("moves with Next and Previous and shows the position", async () => {
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    await userEvent.click(screen.getByRole("button", { name: "Next item" }));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous item" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous item" }));
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });

  it("makes slides that are not showing inert instead of aria-hidden", async () => {
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    const [first, second] = screen.getAllByRole("group", { name: /of 3/ });
    expect(first).not.toHaveAttribute("inert");
    expect(second).toHaveAttribute("inert");
    expect(second).not.toHaveAttribute("aria-hidden");
    await userEvent.click(screen.getByRole("button", { name: "Next item" }));
    expect(first).toHaveAttribute("inert");
    expect(second).not.toHaveAttribute("inert");
  });

  it("changes slide with the arrow keys", async () => {
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    screen.getByRole("button", { name: "Air" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });
});
