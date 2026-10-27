import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    exclude: ["src/testing/**", "src/layout_page.ts"],
    thresholds: { statements: 83, branches: 92, functions: 89, lines: 82 },
  }),
);
