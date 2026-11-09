import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    thresholds: { statements: 99, branches: 95, functions: 99, lines: 99 },
  }),
);
