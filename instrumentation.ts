import type { Instrumentation } from "next";

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { readEnv } = await import("@/lib/env");
  readEnv();
};

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
