import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    thresholds: { statements: 94, branches: 79, functions: 98, lines: 97 },
  }),
);
