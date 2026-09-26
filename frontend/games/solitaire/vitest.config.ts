import { defineConfig } from "vitest/config";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["test/test-setup.ts"],
    include: ["test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      thresholds: {
        // A floor a little under the suite's real figures; raise it as they
        // rise.
        statements: 94,
        branches: 85,
        functions: 95,
        lines: 95,
      },
    },
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
