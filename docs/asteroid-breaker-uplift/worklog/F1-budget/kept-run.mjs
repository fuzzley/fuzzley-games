// Writes an init script that stores the run the screenshot script keeps on wave 9 on the widest field, in Casino night, as the game's tools in a checkout keep it (this one's unless given), so each build's traces play the run its own code writes.
// Usage: node kept-run.mjs <out.js> [the game's tools folder in a checkout]
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const tools = process.argv[3]
  ? pathToFileURL(`${process.argv[3]}/`)
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
const run = capture.shownRun(api, { width: 88, height: 40 });
writeFileSync(
  process.argv[2],
  `localStorage.setItem("fuzzley-theme", "casino"); localStorage.setItem("asteroid-breaker-game", ${JSON.stringify(run.stored)});`,
);
console.log(run.score, run.stored.length);
process.exit(0);
