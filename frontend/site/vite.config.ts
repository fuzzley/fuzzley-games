import angular from "@analogjs/vite-plugin-angular";
import { fuzzleyStyle } from "@fz/style/vite";
import { defineConfig } from "vitest/config";
import {
  checkGameImages,
  readBuildInfo,
  servePlayPages,
  versionJson,
} from "./tools/vite-plugins.ts";

// Read once, so the footer and version.json name the same commit and time.
const buildInfo = readBuildInfo();

export default defineConfig({
  plugins: [
    angular(),
    fuzzleyStyle(),
    versionJson(buildInfo),
    servePlayPages(),
    checkGameImages(),
  ],
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  server: {
    port: 4200,
    host: true,
  },
  test: {
    // Not optional: TestBed and Testing Library register their teardown on
    // the global afterEach.
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "tools/**/*.{ts,mjs}"],
      exclude: ["src/app/main.ts", "src/test-setup.ts", "src/app/testing/**"],
      thresholds: {
        // Floors a little under the suite's real figures; raise them as they
        // rise. `yarn test` fails below them. The tools' sit far lower, since
        // what they download and write runs only in a real build.
        "src/**": {
          statements: 99,
          branches: 92,
          functions: 100,
          lines: 99,
        },
        "tools/**": {
          statements: 46,
          branches: 57,
          functions: 55,
          lines: 46,
        },
      },
    },
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
