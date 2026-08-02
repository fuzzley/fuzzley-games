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
        // A floor a little under where the suite currently stands, so a
        // change that drops coverage fails rather than relying on a reviewer
        // noticing. Raise these when the real figures move up; they are meant
        // to ratchet, which is why they are not set to the current numbers
        // exactly.
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@test\//,
        replacement: path.resolve(__dirname, "./test") + "/",
      },
      { find: /^@\//, replacement: path.resolve(__dirname, "./src") + "/" },
    ],
  },
});
