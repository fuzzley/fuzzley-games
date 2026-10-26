import angular from "@analogjs/vite-plugin-angular";
import { angularSpecs, coverage, nodeSpecs } from "@fz/dev/vitest";
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
    coverage: coverage({
      include: ["src/**/*.ts", "tools/**/*.{ts,mjs}"],
      exclude: ["src/app/main.ts", "src/test-setup.ts", "src/app/testing/**"],
      thresholds: {
        // The tools' floors sit far lower, since what they download and
        // write runs only in a real build.
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
    }),
    projects: [
      { extends: true, test: { name: "app", ...angularSpecs() } },
      { test: { name: "tools", ...nodeSpecs(["tools/**/*.spec.ts"]) } },
    ],
  },
});
