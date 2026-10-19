import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type CarouselProps = {
  // One node per slide, shown one at a time.
  slides: ReactNode[];
  // Accessible name for the carousel region.
  ariaLabel: string;
};

// Manual-only carousel built on native CSS scroll-snap. The viewport scrolls
// horizontally and never widens its container (no transformed flex track that
// can overflow a nested card), so it fits inside the padded home InfoCard on
// mobile. Dots mirror the scrolled slide and let keyboard/mouse users jump;
// arrow keys also work. No auto-advance. Reduced motion disables smooth scroll
// via CSS.
export function Carousel({ slides, ariaLabel }: CarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  // Keep the active dot in sync with the scrolled position.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    function onScroll() {
      const vp = viewportRef.current;
      if (!vp) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = vp.scrollLeft + vp.clientWidth / 2;
        let nearest = 0;
        let best = Infinity;
        slideRefs.current.forEach((el, i) => {
          if (!el) return;
          const centre = el.offsetLeft - vp.offsetLeft + el.offsetWidth / 2;
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
    viewport.scrollLeft = el.offsetLeft - viewport.offsetLeft;
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
      className="carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <div className="carousel__viewport" ref={viewportRef}>
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="carousel__slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {slide}
          </div>
        ))}
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
