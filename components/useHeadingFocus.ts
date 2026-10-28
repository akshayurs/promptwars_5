"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Moves focus to the page heading once on mount so route changes are announced. */
export const useHeadingFocus = (): RefObject<HTMLHeadingElement | null> => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return headingRef;
};
