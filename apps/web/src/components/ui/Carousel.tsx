import { useCallback, useRef, useState, type ReactNode } from "react";

export type CarouselProps = {
  // One node per slide, shown one at a time.
  slides: ReactNode[];
  // Accessible name for the carousel region.
  ariaLabel: string;
};

// Moving further than this counts as a drag, so a trailing click does not fire.
const DRAG_CLICK_THRESHOLD_PX = 8;

// Manual-only carousel matching the elderly home's condition carousel (same
// markup and class names, styled by the ported CSS in app.css). Unlike the
// elderly one it never auto-advances: the user drives it with swipe/drag, the
// dots, or the arrow keys. Dependency-free (no elderly accessibility context).
export function Carousel({ slides, ariaLabel }: CarouselProps) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [dragPct, setDragPct] = useState(0);
  const [dragging, setDragging] = useState(false);

  const goTo = useCallback(
    (next: number) => setIndex(Math.max(0, Math.min(count - 1, next))),
    [count],
  );

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    didDrag.current = false;
    setDragging(true);
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
    if (dragPct <= -18) goTo(index + 1);
    else if (dragPct >= 18) goTo(index - 1);
    setDragPct(0);
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
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
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
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
