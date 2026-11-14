// Serves the page the uplift's sounds are heard on:
//
//   node docs/asteroid-breaker-uplift/sound/audition/serve.mjs
//
// then open http://localhost:9120/. It serves this folder's page, the
// uplift's sounds and their sheets beside it, and, under /today/, the
// sprite the game ships now, to hear one against the other. `--port <n>`
// moves it.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const here = import.meta.dirname;
const uplift = join(here, "../..");
const today = join(
  uplift,
  "../../frontend/games/asteroid-breaker/src/scene/sounds",
);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * Returns the file a request's path names, or null for one that leads out
 * of the folders this serves.
 *
 * @param {string} path The request's path, decoded.
 * @returns {string | null}
 */
function fileFor(path) {
  const [root, rest] = path.startsWith("/today/")
    ? [today, path.slice("/today/".length)]
    : path.startsWith("/assets/") || path.startsWith("/sound/")
      ? [uplift, path.slice(1)]
      : [here, path === "/" ? "index.html" : path.slice(1)];
  const file = normalize(join(root, rest));
  return file === root || file.startsWith(root + sep) ? file : null;
}

const portAt = process.argv.indexOf("--port");
const port = portAt > 0 ? Number(process.argv[portAt + 1]) : 9120;

createServer(async (request, response) => {
  const path = decodeURIComponent(
    new URL(request.url ?? "/", "http://localhost").pathname,
  );
  const file = fileFor(path);
  try {
    if (!file || !(await stat(file)).isFile()) throw new Error("no file");
    response.writeHead(200, {
      "content-type":
        TYPES[/** @type {keyof typeof TYPES} */ (extname(file))] ??
        "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Nothing at ${path}\n`);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`The sounds are at http://localhost:${port}/`);
});
