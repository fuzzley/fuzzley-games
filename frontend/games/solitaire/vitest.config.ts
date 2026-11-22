import { defineConfig } from "vitest/config";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";
import { coverage, phaserFromCommonJs } from "@fz/dev/vitest";

export default defineConfig({
  plugins: [angular(), phaserFromCommonJs()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["test/test-setup.ts"],
    include: ["test/**/*.spec.ts", "tools/**/*.spec.ts"],
    coverage: coverage({
      thresholds: {
        // A floor a little under the suite's real figures; raise it as they
        // rise.
        statements: 95,
        branches: 88,
        functions: 96,
        lines: 96,
      },
    }),
  },
  resolve: {
    alias: [
      {
        find: /^@test\//,
        replacement: path.resolve(import.meta.dirname, "./test") + "/",
      },
      {
        find: /^@\//,
        replacement: path.resolve(import.meta.dirname, "./src") + "/",
      },
    ],
  },
});
