import angular from "@analogjs/vite-plugin-angular";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [angular()],
  test: {
    // Not optional: TestBed and Testing Library register their teardown on
    // the global afterEach.
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/test-setup.ts"],
      thresholds: {
        // A floor a little under the suite's real figures; raise it as they
        // rise. `yarn test` fails below it.
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
    },
  },
});
