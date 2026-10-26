import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    thresholds: { statements: 71, branches: 88, functions: 83, lines: 70 },
  }),
);
