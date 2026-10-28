import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequestError, register } from "@/instrumentation";
import { logger } from "@/lib/logger";

type ErrorArgs = Parameters<typeof onRequestError>;

const request = (path: string): ErrorArgs[1] => ({ path, method: "POST", headers: {} });
const context: ErrorArgs[2] = {
  routerKind: "App Router",
  routePath: "/api/plan",
  routeType: "route",
  revalidateReason: undefined,
};

const withDigest = (digest: string): Error => Object.assign(new Error("secret detail"), { digest });

describe("register", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing outside the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(register()).resolves.toBeUndefined();
  });

  it("fails fast on the Node.js runtime when the API key is missing", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(register()).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("accepts a configured environment on the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("GEMINI_API_KEY", "configured");
    await expect(register()).resolves.toBeUndefined();
  });
});

describe("onRequestError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("logs nothing outside the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const spy = vi.spyOn(logger, "error").mockReturnValue(undefined);
    await onRequestError(withDigest("d-1"), request("/api/plan"), context);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs the digest, method, route type and a path without its query string", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const spy = vi.spyOn(logger, "error").mockReturnValue(undefined);
    await onRequestError(withDigest("d-1"), request("/api/plan?token=secret"), context);
    expect(spy).toHaveBeenCalledExactlyOnceWith("request error", {
      digest: "d-1",
      method: "POST",
      path: "/api/plan",
      routeType: "route",
      revalidateReason: undefined,
    });
  });

  it("falls back to 'none' when the error has no digest and never logs the message", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const spy = vi.spyOn(logger, "error").mockReturnValue(undefined);
    await onRequestError(new Error("secret detail"), request("/plan"), context);
    expect(spy).toHaveBeenCalledExactlyOnceWith("request error", {
      digest: "none",
      method: "POST",
      path: "/plan",
      routeType: "route",
      revalidateReason: undefined,
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret detail");
  });
});
