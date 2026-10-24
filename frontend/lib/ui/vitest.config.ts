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
  },
});
