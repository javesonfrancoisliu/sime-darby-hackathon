import { useRef, useState, type ReactNode } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { IconChevronLeft, IconChevronRight } from "./Icons";

interface CarouselProps {
  // One node per slide, shown one at a time.
  slides: ReactNode[];
  // Accessible name for the carousel region.
  ariaLabel: string;
}

// Never moves on its own. People change slide with Previous and Next, the arrow keys or a swipe.
// Slides that are not showing are inert, so their buttons cannot be tabbed to or read out.
export function Carousel({ slides, ariaLabel }: CarouselProps) {
  const { triggerHaptic } = useAccessibility();
  const count = slides.length;
  const [index, setIndex] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const [dragPct, setDragPct] = useState(0);
  const [dragging, setDragging] = useState(false);

  function goTo(next: number) {
    setIndex(((next % count) + count) % count);
  }

  function step(delta: number) {
    triggerHaptic(10);
    goTo(index + delta);
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const width = viewportRef.current?.offsetWidth || 1;
    setDragPct(((e.clientX - startX.current) / width) * 100);
  }

  function onPointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    // A drag past about a fifth of the width changes slide.
    if (dragPct <= -18) step(1);
    else if (dragPct >= 18) step(-1);
    setDragPct(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  }

  return (
    <div
      className="carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <div
        ref={viewportRef}
        className="carousel__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={`carousel__track${dragging ? " carousel__track--dragging" : ""}`}
          style={{ transform: `translate3d(${-index * 100 + dragPct}%, 0, 0)` }}
        >
          {slides.map((slide, i) => (
            <div
              className="carousel__slide"
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              {...(i === index ? {} : ({ inert: "" } as object))}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="carousel__controls">
          <button
            type="button"
            className="carousel__step"
            onClick={() => step(-1)}
            aria-label="Previous item"
          >
            <IconChevronLeft size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <span className="carousel__count" aria-live="polite">
            {index + 1} of {count}
          </span>
          <button
            type="button"
            className="carousel__step"
            onClick={() => step(1)}
            aria-label="Next item"
          >
            <IconChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
