import { useEffect } from "react";

/** Opens every <details> for printing and restores their state afterwards. */
export const usePrintExpandedDetails = (): void => {
  useEffect(() => {
    let closed: HTMLDetailsElement[] = [];
    const expand = (): void => {
      closed = [...document.querySelectorAll("details")].filter((details) => !details.open);
      closed.forEach((details) => {
        details.open = true;
      });
    };
    const restore = (): void => {
      closed.forEach((details) => {
        details.open = false;
      });
      closed = [];
    };
    window.addEventListener("beforeprint", expand);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", expand);
      window.removeEventListener("afterprint", restore);
    };
  }, []);
};
