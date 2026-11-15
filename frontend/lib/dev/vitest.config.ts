import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    // What only a browser runs: the layout check's waits, and the sound
    // lab's page, whose mix and notes have specs of their own
    // (src/sound_lab_mix.ts, src/sound_lab_notes.ts).
    exclude: ["src/layout_page.ts", "src/sound_lab_page.ts"],
    thresholds: { statements: 96, branches: 95, functions: 97, lines: 96 },
  }),
);
