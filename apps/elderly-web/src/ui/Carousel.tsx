import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccessibility } from "../context/AccessibilityContext";

interface CarouselProps {
  /** One ReactNode per slide (shown one at a time). */
  slides: ReactNode[];
  /** Auto-advance interval in ms. */
  intervalMs?: number;
  /** Accessible name for the carousel region. */
  ariaLabel: string;
}

/**
 * Carousel — shows one slide at a time and gently auto-rolls.
 *
 * apple-design notes: §14 warns against auto-advancing carousels, so this is
 * built conservatively for an elderly-first app:
 *  - auto-play is DISABLED under reduced motion (OS or in-app toggle);
 *  - auto-play PAUSES on hover, touch, and keyboard focus;
 *  - a slow interval (default 5s) so nothing disappears too quickly;
 *  - fully swipeable with 1:1 drag tracking (§2) and velocity-aware commit
 *    (§5/§6), plus dots and arrow-key control so the user is always in charge.
 */
export function Carousel({ slides, intervalMs = 5000, ariaLabel }: CarouselProps) {
  const { reducedMotion, triggerHaptic } = useAccessibility();
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Drag state
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; dx: number; dragging: boolean; width: number }>({
    startX: 0,
    dx: 0,
    dragging: false,
    width: 0,
  });
  const [dragDx, setDragDx] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // Auto-advance, respecting reduced motion and pause.
  useEffect(() => {
    if (reducedMotion || paused || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused, count, intervalMs]);

  // Pointer drag (1:1 tracking with velocity-aware commit).
  function onPointerDown(e: React.PointerEvent) {
    const width = trackRef.current?.offsetWidth ?? 1;
    dragRef.current = { startX: e.clientX, dx: 0, dragging: true, width };
    setPaused(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    dragRef.current.dx = dx;
    setDragDx(dx);
  }
  function onPointerUp() {
    const { dx, width, dragging } = dragRef.current;
    if (!dragging) return;
    dragRef.current.dragging = false;
    setDragDx(0);
    // Commit if dragged more than ~18% of the width.
    const threshold = width * 0.18;
    if (dx <= -threshold) {
      triggerHaptic(10);
      goTo(index + 1);
    } else if (dx >= threshold) {
      triggerHaptic(10);
      goTo(index - 1);
    }
    // keep paused briefly, then resume
    window.setTimeout(() => setPaused(false), 600);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  const dragging = dragRef.current.dragging;
  const basePct = -index * 100;
  const dragPct = dragRef.current.width ? (dragDx / dragRef.current.width) * 100 : 0;

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
        className="carousel__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={trackRef}
          className={`carousel__track${dragging ? " carousel__track--dragging" : ""}`}
          style={{ transform: `translate3d(${basePct + dragPct}%, 0, 0)` }}
        >
          {slides.map((slide, i) => (
            <div
              className="carousel__slide"
              key={i}
              aria-hidden={i !== index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
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
              aria-label={`Go to item ${i + 1}`}
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
