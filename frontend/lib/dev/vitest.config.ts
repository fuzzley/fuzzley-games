import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    thresholds: { statements: 68, branches: 86, functions: 82, lines: 67 },
  }),
);
