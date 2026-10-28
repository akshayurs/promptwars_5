import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const DOM_TESTS = [
  "tests/components/**/*.test.tsx",
  "tests/unit/storage.test.ts",
  "tests/unit/workspaceStore.test.ts",
  "tests/unit/zod.test.ts",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/unit/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    expect: { requireAssertions: true },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          setupFiles: ["./tests/setup.ts", "./tests/setup.clock.ts"],
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
          exclude: DOM_TESTS,
        },
      },
      {
        extends: true,
        test: { name: "dom", environment: "jsdom", include: DOM_TESTS },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**", "app/api/**", "proxy.ts"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      reporter: ["text", "html", "lcov", "json-summary"],
    },
  },
});
