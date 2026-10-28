import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    thresholds: { statements: 100, branches: 95, functions: 100, lines: 100 },
  }),
);
