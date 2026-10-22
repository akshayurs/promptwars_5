import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "@/lib/logger";

describe("createLogger", () => {
  const fixed = new Date("2030-01-02T03:04:05.000Z");

  it("writes JSON lines with level, time, message and fields", () => {
    const sink = vi.fn<(line: string) => void>();
    const log = createLogger(sink, () => fixed);
    log.info("hello", { correlationId: "abc", count: 2, ok: true });
    log.warn("careful");
    log.error("boom");
    const lines = sink.mock.calls.map(([line]) => JSON.parse(line) as Record<string, unknown>);
    expect(lines[0]).toEqual({
      time: "2030-01-02T03:04:05.000Z",
      level: "info",
      message: "hello",
      correlationId: "abc",
      count: 2,
      ok: true,
    });
    expect(lines[1]).toMatchObject({ level: "warn", message: "careful" });
    expect(lines[2]).toMatchObject({ level: "error", message: "boom" });
  });

  it("emits one line per call", () => {
    const sink = vi.fn<(line: string) => void>();
    createLogger(sink, () => fixed).info("a\nb");
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0]?.[0]).not.toContain("\n");
  });

  describe("default sink", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("writes to stderr", () => {
      const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      createLogger().info("x");
      expect(write).toHaveBeenCalledTimes(1);
      expect(String(write.mock.calls[0]?.[0])).toMatch(/"message":"x"\}\n$/);
    });
  });
});
