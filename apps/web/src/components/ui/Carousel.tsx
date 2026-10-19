import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type CarouselProps = {
  // One node per slide, shown one at a time with the next peeking in.
  slides: ReactNode[];
  // Accessible name for the carousel region.
  ariaLabel: string;
};

// Minimal, manual-only carousel built on native CSS scroll-snap (no drag maths,
// no auto-advance, no timers). The user swipes/scrolls horizontally; dots mirror
// the current slide and let keyboard/mouse users jump. A sliver of the next card
// peeks so there is a visible "more to the side" affordance. Reduced motion is
// honoured in CSS (smooth scroll is disabled). Dependency-free so it does not
// pull in the elderly app's accessibility context.
export function Carousel({ slides, ariaLabel }: CarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  // Track the most-centred slide as the viewport scrolls, so the dots stay in sync.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    function onScroll() {
      const vp = viewport;
      if (!vp) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = vp.scrollLeft + vp.clientWidth / 2;
        let nearest = 0;
        let best = Infinity;
        slideRefs.current.forEach((el, i) => {
          if (!el) return;
          const centre = el.offsetLeft + el.offsetWidth / 2;
          const dist = Math.abs(centre - mid);
          if (dist < best) {
            best = dist;
            nearest = i;
          }
        });
        setIndex(nearest);
      });
    }
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  const goTo = useCallback((i: number) => {
    const el = slideRefs.current[i];
    const viewport = viewportRef.current;
    if (!el || !viewport) return;
    // Setting scrollLeft works everywhere (incl. jsdom); CSS scroll-behavior
    // makes it smooth, and is disabled under prefers-reduced-motion.
    viewport.scrollLeft = el.offsetLeft;
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" && index < count - 1) {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  return (
    <div
      className="ui-carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <div className="ui-carousel-viewport" ref={viewportRef}>
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="ui-carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="ui-carousel-dots" role="tablist" aria-label={`${ariaLabel} pages`}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to item ${i + 1} of ${count}`}
              className={`ui-carousel-dot${i === index ? " ui-carousel-dot--active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
