import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    thresholds: { statements: 75, branches: 92, functions: 85, lines: 74 },
  }),
);
