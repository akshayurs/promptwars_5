"use client";

import { useEffect, useRef, type RefObject } from "react";

// Pathname of the document the browser loaded (direct visit or reload), if the browser reports it.
const landingPath = (): string | null => {
  const [entry] = performance.getEntriesByType("navigation");
  return entry ? new URL(entry.name).pathname : null;
};

let navigatedInApp = false;

/**
 * Moves focus to the page heading once on mount after a client-side route change, so the new
 * page is announced. On the route the browser loaded directly focus stays at the document start,
 * keeping the skip link the first Tab stop.
 */
export const useHeadingFocus = (): RefObject<HTMLHeadingElement | null> => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    navigatedInApp ||= window.location.pathname !== landingPath();
    if (navigatedInApp) {
      headingRef.current?.focus();
    }
  }, []);
  return headingRef;
};
