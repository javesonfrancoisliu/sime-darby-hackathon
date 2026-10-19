// Jump to the top of the page. Always instant, so it never animates for people who prefer less motion.
export function scrollToTop(): void {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
