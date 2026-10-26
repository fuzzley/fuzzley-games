import { nodeTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  nodeTests({
    thresholds: { statements: 96, branches: 86, functions: 96, lines: 97 },
  }),
);
