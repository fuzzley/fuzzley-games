import angular from "@analogjs/vite-plugin-angular";
import { defineConfig } from "vitest/config";
import {
  checkGameImages,
  servePlayPages,
  themeBootstrap,
  versionJson,
} from "./tools/vite-plugins.ts";

export default defineConfig({
  plugins: [
    angular(),
    themeBootstrap(),
    versionJson(),
    servePlayPages(),
    checkGameImages(),
  ],
  server: {
    port: 4200,
    host: true,
  },
  test: {
    // Not optional: TestBed and Testing Library register their teardown on
    // the global afterEach.
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "app",
          environment: "jsdom",
          setupFiles: ["src/test-setup.ts"],
          include: ["src/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "tools",
          environment: "node",
          globals: true,
          include: ["tools/**/*.spec.ts"],
        },
      },
    ],
  },
});
