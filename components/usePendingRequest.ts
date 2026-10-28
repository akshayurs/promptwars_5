"use client";

import { useEffect, useRef, useState } from "react";

import { LONG_WAIT_NOTICE_MS } from "@/lib/constants";

/** Status texts for a long-running request: while pending, after the delay, once cancelled. */
export type PendingTexts = { pending: string; longWait: string; cancelled: string };

export type PendingRequest = {
  busy: boolean;
  /** Progress or cancellation text for a status region; empty when there is nothing to say. */
  statusText: string;
  /** Starts a request, aborting any earlier one, and returns the new request's signal. */
  begin: () => AbortSignal;
  /** Marks the request settled; false when it was cancelled and its result must be ignored. */
  settle: (signal: AbortSignal) => boolean;
  cancel: () => void;
};

/** True once a pending request has outlasted the reassurance delay; resets when it settles. */
const useLongWait = (pending: boolean): boolean => {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setTimeout(() => {
      setElapsed(true);
    }, LONG_WAIT_NOTICE_MS);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [pending]);
  return pending && elapsed;
};

type Progress = { busy: boolean; longWait: boolean; cancelled: boolean };

const statusTextFor = (texts: PendingTexts, { busy, longWait, cancelled }: Progress): string => {
  if (busy) return longWait ? texts.longWait : texts.pending;
  return cancelled ? texts.cancelled : "";
};

/**
 * Lifecycle of one cancellable request at a time: an AbortController per request, aborted on
 * cancel, on a newer request and on unmount, plus the matching status text.
 */
export const usePendingRequest = (texts: PendingTexts): PendingRequest => {
  const controllerRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const longWait = useLongWait(busy);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const begin = (): AbortSignal => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setCancelled(false);
    return controller.signal;
  };

  const settle = (signal: AbortSignal): boolean => {
    if (signal.aborted) return false;
    controllerRef.current = null;
    setBusy(false);
    return true;
  };

  const cancel = (): void => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
    setCancelled(true);
  };

  const statusText = statusTextFor(texts, { busy, longWait, cancelled });
  return { busy, statusText, begin, settle, cancel };
};
