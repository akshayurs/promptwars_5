import type { Instrumentation } from "next";

/** Validates the environment once when the Node.js server starts. */
export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { readEnv } = await import("@/lib/env");
  readEnv();
};

/** Logs unhandled request errors by digest, method, path and route type, never the message. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ logger }, { errorDigest }] = await Promise.all([
    import("@/lib/logger"),
    import("@/lib/errors"),
  ]);
  logger.error("request error", {
    digest: errorDigest(error) ?? "none",
    method: request.method,
    path: request.path.split("?")[0] ?? "",
    routeType: context.routeType,
  });
};
