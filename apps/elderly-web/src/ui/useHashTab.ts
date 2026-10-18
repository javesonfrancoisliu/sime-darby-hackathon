import { useState } from "react";
import { useLocation } from "react-router-dom";

// Start on the tab named in the URL hash (for example /safety#temp), else the fallback.
export function useHashTab<T extends string>(valid: readonly T[], fallback: T) {
  const { hash } = useLocation();
  return useState<T>(() => valid.find((tab) => `#${tab}` === hash) ?? fallback);
}
