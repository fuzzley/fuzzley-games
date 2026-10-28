import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    thresholds: { statements: 98, branches: 93, functions: 98, lines: 98 },
  }),
);
