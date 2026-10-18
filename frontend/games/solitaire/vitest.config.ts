import { defineConfig } from "vitest/config";
import { searchForWorkspaceRoot } from "vite";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";

export default defineConfig({
  plugins: [angular()],
  server: {
    fs: {
      // Vite reads files only from inside frontend/, but the bug report spec
      // checks the issue form, which GitHub reads from the repository's root.
      allow: [
        searchForWorkspaceRoot(import.meta.dirname),
        path.resolve(import.meta.dirname, "../../../.github/ISSUE_TEMPLATE"),
      ],
    },
  },
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
        statements: 95,
        branches: 88,
        functions: 96,
        lines: 96,
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
