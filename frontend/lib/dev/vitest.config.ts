import { defineConfig } from "vitest/config";
import { nodeTests } from "./src/vitest.ts";

export default defineConfig(
  nodeTests({
    // What only a browser runs: the layout check's waits, and the sound
    // lab's page and the notes it shows, whose sums and synth have specs of
    // their own (src/sound_lab_mix.ts, src/zzfx.ts).
    exclude: [
      "src/layout_page.ts",
      "src/sound_lab_page.ts",
      "src/sound_lab_notes.ts",
    ],
    thresholds: { statements: 93, branches: 95, functions: 95, lines: 93 },
  }),
);
