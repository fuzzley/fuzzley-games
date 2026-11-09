import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    thresholds: { statements: 96, branches: 84, functions: 99, lines: 97 },
  }),
);
