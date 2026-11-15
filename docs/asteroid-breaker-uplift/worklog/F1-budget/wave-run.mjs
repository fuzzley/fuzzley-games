// Writes an init script that stores a run kept on a wave (29, Tempest, unless given) on the widest field, in a palette, as the game's tools in a checkout keep it (this one's unless given), and prints the wave's rocks by kind.
// Usage: node wave-run.mjs <out.js> [palette] [wave] [the game's tools folder in a checkout]
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [out, palette = "casino", wave = "29", toolsArg] = process.argv.slice(2);
const tools = toolsArg
  ? pathToFileURL(`${toolsArg}/`)
  : new URL(
      "../../../../frontend/games/asteroid-breaker/tools/",
      import.meta.url,
    );
const capture = await import(new URL("capture-screenshots.mjs", tools).href);
// Older checkouts keep the loader in the screenshot script.
const { loadScreenshotApi } = await import(
  new URL("stored_run.mjs", tools).href
).catch(() => capture);
const api = await loadScreenshotApi();
const saved = api.keptRun({
  ...capture.RUN,
  wave: Number(wave),
  torus: { width: 88, height: 40 },
});
const stored = JSON.stringify({ version: api.savedGameVersion, ...saved });
writeFileSync(
  out,
  `localStorage.setItem("fuzzley-theme", "${palette}"); localStorage.setItem("asteroid-breaker-game", ${JSON.stringify(stored)});`,
);
const kinds = {};
for (const rock of saved.field.rocks)
  if (rock.live) kinds[rock.kind] = (kinds[rock.kind] ?? 0) + 1;
console.log(
  saved.waveId,
  JSON.stringify(kinds),
  saved.field.nextCometAt,
  saved.field.steps,
);
process.exit(0);
