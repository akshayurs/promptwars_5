import { useEffect, useState } from "react";

import { LONG_WAIT_NOTICE_MS } from "@/lib/constants";

/** True once a pending request has outlasted the reassurance delay; resets when it settles. */
export const useLongWait = (pending: boolean): boolean => {
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
