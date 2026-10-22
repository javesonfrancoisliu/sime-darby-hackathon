import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAccessibility } from "../context/AccessibilityContext";

interface CarouselProps {
  // One node per slide, shown one at a time.
  slides: ReactNode[];
  // Auto-advance interval in ms.
  intervalMs?: number;
  // Accessible name for the carousel region.
  ariaLabel: string;
}

// Moving further than this counts as a drag, so the click that follows must not open the card.
const DRAG_CLICK_THRESHOLD_PX = 8;

// Dots-only carousel (no arrow buttons). It gently auto-rolls, but:
//  - auto-play is OFF under reduced motion (apple-design §14);
//  - it PAUSES on hover, focus and while touching/dragging (§3, agency);
//  - drag tracks the finger 1:1 (§2) with a velocity-aware commit;
//  - dots, swipe and arrow keys all drive it, so the user stays in charge (§16 agency).
export function Carousel({ slides, intervalMs = 5000, ariaLabel }: CarouselProps) {
  const { reducedMotion, triggerHaptic } = useAccessibility();
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const didDrag = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);
  const [dragPct, setDragPct] = useState(0);
  const [dragging, setDragging] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // Auto-advance, respecting reduced motion and the paused state.
  useEffect(() => {
    if (reducedMotion || paused || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused, count, intervalMs]);

  // Cancel the pending resume timer on unmount so it cannot fire into a torn-down page.
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  function step(delta: number) {
    triggerHaptic(10);
    goTo(index + delta);
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    didDrag.current = false;
    setDragging(true);
    setPaused(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    if (Math.abs(e.clientX - startX.current) > DRAG_CLICK_THRESHOLD_PX) didDrag.current = true;
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
    // Resume auto-play shortly after the finger lifts.
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 600);
  }

  function onClickCapture(e: React.MouseEvent) {
    if (!didDrag.current) return;
    didDrag.current = false;
    e.preventDefault();
    e.stopPropagation();
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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={viewportRef}
        className="carousel__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
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
        <div className="carousel__dots" role="tablist" aria-label={`${ariaLabel} pages`}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to item ${i + 1} of ${count}`}
              className={`carousel__dot${i === index ? " carousel__dot--active" : ""}`}
              onClick={() => {
                triggerHaptic(10);
                goTo(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
