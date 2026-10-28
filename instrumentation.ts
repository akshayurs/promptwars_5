import type { Instrumentation } from "next";

/** Validates the environment once when the Node.js server starts. */
export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { readEnv } = await import("@/lib/env");
  readEnv();
};

const withoutQuery = (path: string): string => {
  const queryStart = path.indexOf("?");
  return queryStart === -1 ? path : path.slice(0, queryStart);
};

/** Logs unhandled request errors by digest, method, path and route type, never the message. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const [{ logger }, { errorDigest }] = await Promise.all([
    import("@/lib/logger"),
    import("@/lib/errors"),
  ]);
  logger.error("request error", {
    digest: errorDigest(error) ?? "none",
    method: request.method,
    path: withoutQuery(request.path),
    routeType: context.routeType,
  });
};
