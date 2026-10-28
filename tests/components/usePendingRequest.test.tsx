import { act, renderHook } from "@testing-library/react";

import { usePendingRequest } from "@/components/usePendingRequest";
import { LONG_WAIT_NOTICE_MS } from "@/lib/constants";

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const TEXTS = { pending: "Working.", longWait: "Still working.", cancelled: "Stopped." };

describe("usePendingRequest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const renderRequest = () => renderHook(() => usePendingRequest(TEXTS));

  it("stays idle and silent, scheduling nothing", () => {
    const { result } = renderRequest();
    advance(LONG_WAIT_NOTICE_MS * 2);
    expect(result.current.busy).toBe(false);
    expect(result.current.statusText).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reassures only after the delay and resets when the request settles", () => {
    const { result } = renderRequest();
    let signal = new AbortController().signal;
    act(() => {
      signal = result.current.begin();
    });
    expect(result.current.statusText).toBe("Working.");
    advance(LONG_WAIT_NOTICE_MS - 1);
    expect(result.current.statusText).toBe("Working.");
    advance(1);
    expect(result.current.statusText).toBe("Still working.");
    act(() => {
      expect(result.current.settle(signal)).toBe(true);
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.statusText).toBe("");
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      result.current.begin();
    });
    expect(result.current.statusText).toBe("Working.");
  });

  it("cancel aborts the signal, announces it and makes settle report the cancellation", () => {
    const { result } = renderRequest();
    let signal = new AbortController().signal;
    act(() => {
      signal = result.current.begin();
    });
    act(() => {
      result.current.cancel();
    });
    expect(signal.aborted).toBe(true);
    expect(result.current.busy).toBe(false);
    expect(result.current.statusText).toBe("Stopped.");
    expect(result.current.settle(signal)).toBe(false);
    act(() => {
      result.current.begin();
    });
    expect(result.current.statusText).toBe("Working.");
  });

  it("aborts an earlier request when a newer one begins", () => {
    const { result } = renderRequest();
    const signals: AbortSignal[] = [];
    act(() => {
      signals.push(result.current.begin());
      signals.push(result.current.begin());
    });
    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
  });

  it("aborts the request and clears its timer on unmount", () => {
    const { result, unmount } = renderRequest();
    let signal = new AbortController().signal;
    act(() => {
      signal = result.current.begin();
    });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
