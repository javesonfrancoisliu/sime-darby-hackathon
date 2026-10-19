import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carousel } from "./Carousel";

const slides = [
  <button key="a">Air</button>,
  <button key="b">Heat</button>,
  <button key="c">Repairs</button>,
];

afterEach(() => vi.useRealTimers());

// jsdom has no PointerEvent, so a MouseEvent with the pointer event name carries the position.
function pointer(target: Element, type: string, clientX: number) {
  fireEvent(target, new MouseEvent(type, { bubbles: true, clientX }));
}

function activeDot() {
  return screen.getAllByRole("tab").findIndex((d) => d.getAttribute("aria-selected") === "true");
}

describe("Carousel", () => {
  it("auto-advances on a timer when motion is allowed", () => {
    vi.useFakeTimers();
    render(<Carousel ariaLabel="Conditions" intervalMs={5000} slides={slides} />);
    expect(activeDot()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(activeDot()).toBe(1);
  });

  it("jumps to a slide when its dot is tapped", async () => {
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    const dots = screen.getAllByRole("tab");
    await userEvent.click(dots[2]!);
    expect(activeDot()).toBe(2);
  });

  it("makes slides that are not showing inert instead of aria-hidden", async () => {
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    const [first, second] = screen.getAllByRole("group", { name: /of 3/ });
    expect(first).not.toHaveAttribute("inert");
    expect(second).toHaveAttribute("inert");
    expect(second).not.toHaveAttribute("aria-hidden");
    await userEvent.click(screen.getAllByRole("tab")[1]!);
    expect(first).toHaveAttribute("inert");
    expect(second).not.toHaveAttribute("inert");
  });

  it("changes slide with the arrow keys", async () => {
    render(<Carousel ariaLabel="Conditions" slides={slides} />);
    screen.getByRole("button", { name: "Air" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(activeDot()).toBe(1);
  });

  it("does not click the card under a mouse drag", () => {
    const onOpen = vi.fn();
    render(
      <Carousel
        ariaLabel="Conditions"
        slides={[
          <button key="a" onClick={onOpen}>
            Air
          </button>,
          <button key="b">Heat</button>,
        ]}
      />,
    );
    const card = screen.getByRole("button", { name: "Air" });
    pointer(card, "pointerdown", 200);
    pointer(card, "pointermove", 20);
    pointer(card, "pointerup", 20);
    fireEvent.click(card);
    expect(onOpen).not.toHaveBeenCalled();

    pointer(card, "pointerdown", 100);
    pointer(card, "pointerup", 100);
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
