import { nodeTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  nodeTests({
    thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  }),
);
