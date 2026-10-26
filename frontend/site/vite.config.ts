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
