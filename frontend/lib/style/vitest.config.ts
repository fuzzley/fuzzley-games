import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      thresholds: {
        // A floor a little under the suite's real figures; raise it as they
        // rise. `yarn test` fails below it.
        statements: 96,
        branches: 86,
        functions: 96,
        lines: 97,
      },
    },
  },
});
