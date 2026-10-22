import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/components/**/*.test.tsx",
      "tests/api/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**", "app/api/**", "proxy.ts"],
      thresholds: { lines: 95, branches: 90, functions: 95, statements: 95 },
      reporter: ["text", "html"],
    },
  },
});
