import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    exclude: ["src/layout_page.ts"],
    thresholds: { statements: 93, branches: 95, functions: 95, lines: 93 },
  }),
);
