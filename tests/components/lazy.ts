import { act } from "@testing-library/react";

/**
 * Transforms the lazily loaded chunks up front so `next/dynamic` resolves them within a few
 * microtasks instead of racing the `findBy*` timeout on a busy machine.
 */
export const preloadLazyChunks = async (): Promise<void> => {
  await Promise.all([
    import("@/components/RefinePanel"),
    import("@/components/budget/AddLineForm"),
    import("@/components/ui/Checkbox"),
  ]);
};

/** next/link marks itself visible from an idle callback in jsdom; let that run inside act. */
export const flushIdleCallbacks = async (): Promise<void> => {
  await act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 1);
      }),
  );
};
