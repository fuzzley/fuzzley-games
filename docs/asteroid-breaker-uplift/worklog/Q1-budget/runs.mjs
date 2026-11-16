// Writes three init scripts from the game's tools in this checkout (or the one given): the run the screenshot script keeps on wave 9 on the widest field (pics-kept.js), the run the layout check clears, its last rock a volatile one broken, about to go off (pics-clearing.js), and a run kept as the screenshot script keeps wave 9's, on wave 17, Foundry, which sends burrs (pics-foundry.js), each stored as the game stores it, with the haptics off, for pics.mjs to set a palette over.
// Usage: node runs.mjs <out folder> [the game's tools folder in a checkout]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const tools = process.argv[3]
  ? pathToFileURL(`${process.argv[3]}/`)
  : new URL(
      "../../../../frontend/games/asteroid-breaker/tools/",
      import.meta.url,
    );
const capture = await import(new URL("capture-screenshots.mjs", tools).href);
const stored = await import(new URL("stored_run.mjs", tools).href);
const api = await stored.loadScreenshotApi();
const settings = JSON.stringify({ version: 1, haptics: false });
const init = (run) =>
  `localStorage.setItem("asteroid-breaker-game", ${JSON.stringify(run)}); localStorage.setItem("asteroid-breaker-settings", ${JSON.stringify(settings)});`;
const kept = capture.shownRun(api, { width: 88, height: 40 }).stored;
const clearing = stored.storedRun(api, api.clearingRun(stored.CLEARING_RUN));
writeFileSync(join(process.argv[2], "pics-kept.js"), init(kept));
writeFileSync(join(process.argv[2], "pics-clearing.js"), init(clearing));
const foundry = stored.storedRun(
  api,
  api.keptRun({ ...capture.RUN, wave: 17, torus: { width: 88, height: 40 } }),
);
writeFileSync(join(process.argv[2], "pics-foundry.js"), init(foundry));
console.log(kept.length, clearing.length, foundry.length);
process.exit(0);
