#!/usr/bin/env node
/**
 * Runs a game's own screenshot capture several times into a temporary
 * folder, timing each run, and says whether the runs wrote the same bytes
 * and the same pixels as each other and as the images committed at HEAD.
 *
 *   node docs/repo-size/scripts/screenshots/capture-twice.mjs <game> [runs] [game id ...]
 *
 * It builds the game (timed), deleting the checkout's own
 * `frontend/games/<game>/dist/` first, and serves it with `vite preview`, or
 * with `SERVE=dev` serves it from its Vite dev server, as the Solitaire
 * Collection needs, since its page shows the capture its game only in
 * development, on a port of its own, and runs a copy of the game's
 * `tools/capture-screenshots.mjs` whose only change is the folder it writes
 * to, so no tracked file is touched. The copy sits beside the original, so
 * its imports resolve the same, and is deleted afterwards. The Solitaire
 * Collection writes only its lossless `overview.png`; the others write the
 * site's `thumb.webp` and `preview.webp`.
 *
 * Writes `docs/repo-size/data/screenshots/capture-<game>.txt`, or with
 * `LABEL` set, `capture-<game>-<label>.txt`. The images go
 * to `$SCRATCH` (default: a folder under the system's temporary folder).
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const FRONTEND = join(REPO, "frontend");
const DATA = join(REPO, "docs/repo-size/data/screenshots");
/** @type {typeof import("sharp")} */
const sharp = createRequire(join(FRONTEND, "package.json"))("sharp");

const [game = "minesweeper", runsArg = "2", ...ids] = process.argv.slice(2);
const RUNS = Number(runsArg);
const GAME_DIR = join(FRONTEND, "games", game);
const SCRATCH = process.env.SCRATCH ?? join(tmpdir(), "repo-size-screenshots");
/** What the run's folder and report are named after, past the game: `$LABEL`, if set. */
const SUFFIX = process.env.LABEL ? `-${process.env.LABEL}` : "";
const OUT = join(SCRATCH, `capture-${game}${SUFFIX}`);
const PORT = 9100 + Number(process.env.PORT_OFFSET ?? 7);
const URL_ = `http://127.0.0.1:${PORT}/`;
const COPY = join(GAME_DIR, "tools/.capture-to-temp.mjs");
/** How the game is served: `preview`, its build, or `dev`, its dev server. */
const SERVE = process.env.SERVE ?? "preview";

/** @type {string[]} */
const report = [];
/**
 * Prints a line and keeps it for the report.
 *
 * @param {string} line
 */
function say(line) {
  report.push(line);
  console.log(line);
}

/**
 * Returns the seconds since a moment, to a tenth.
 *
 * @param {bigint} start
 * @returns {string}
 */
function since(start) {
  return (Number(process.hrtime.bigint() - start) / 1e9).toFixed(1);
}

/**
 * Lists every file under a folder, relative to it.
 *
 * @param {string} folder
 * @returns {string[]}
 */
function filesUnder(folder) {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)))
    .sort();
}

/**
 * Returns a file's SHA-256, shortened.
 *
 * @param {Buffer} bytes
 * @returns {string}
 */
function hashOf(bytes) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

/**
 * Compares two images' decoded pixels: how many differ at all, how many by
 * more than 16 of 255 in a channel, and the largest change.
 *
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Promise<string>}
 */
async function comparePixels(a, b) {
  const [x, y] = await Promise.all(
    [a, b].map((bytes) =>
      sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  if (!x || !y) return "unreadable";
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    return `sizes differ: ${x.info.width}x${x.info.height} and ${y.info.width}x${y.info.height}`;
  }
  let differ = 0;
  let over16 = 0;
  let largest = 0;
  const box = { left: Infinity, top: Infinity, right: -1, bottom: -1 };
  for (let p = 0; p < x.data.length; p += 4) {
    let most = 0;
    for (let c = 0; c < 4; c++) {
      const d = Math.abs((x.data[p + c] ?? 0) - (y.data[p + c] ?? 0));
      if (d > most) most = d;
    }
    if (most > 0) {
      differ++;
      const pixel = p / 4;
      const px = pixel % x.info.width;
      const py = Math.floor(pixel / x.info.width);
      box.left = Math.min(box.left, px);
      box.top = Math.min(box.top, py);
      box.right = Math.max(box.right, px);
      box.bottom = Math.max(box.bottom, py);
    }
    if (most > 16) over16++;
    if (most > largest) largest = most;
  }
  const pixels = x.info.width * x.info.height;
  return largest === 0
    ? "pixel-identical"
    : `${differ} of ${pixels} pixels differ (${((100 * differ) / pixels).toFixed(3)}%), ${over16} by more than 16, largest change ${largest}, ` +
        `all within x ${box.left}-${box.right}, y ${box.top}-${box.bottom} of ${x.info.width}x${x.info.height}`;
}

/**
 * Waits for a server to answer.
 *
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await fetch(url).then(
      async (r) => {
        await r.body?.cancel();
        return true;
      },
      () => false,
    );
    if (ok) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Nothing answered at ${url}.`);
}

/**
 * Counts the headless Chromes running on a profile named for this game.
 *
 * @returns {number}
 */
function chromesRunning() {
  try {
    return execFileSync("pgrep", ["-f", `${game}-capture-`], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Waits up to ten seconds for the Chromes on this game's profile to exit, and
 * says how many were left and when.
 *
 * @returns {Promise<string>}
 */
async function chromesLeft() {
  const start = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) {
    const running = chromesRunning();
    if (running === 0) return `none after ${since(start)} s`;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return `${chromesRunning()} still running after ${since(start)} s`;
}

// A copy of the capture that writes to the folder the environment names.
const source = readFileSync(
  join(GAME_DIR, "tools/capture-screenshots.mjs"),
  "utf8",
);
const pattern = /^const SCREENSHOT_DIR = .*;$/m;
if (!pattern.test(source)) throw new Error("Found no SCREENSHOT_DIR line.");
writeFileSync(
  COPY,
  source.replace(
    pattern,
    "const SCREENSHOT_DIR = process.env.CAPTURE_OUT ?? '';",
  ),
);

say(`game: ${game}`);
say(`runs: ${RUNS}${ids.length > 0 ? `, game ids: ${ids.join(" ")}` : ""}`);
say(`cpus: ${execFileSync("nproc", { encoding: "utf8" }).trim()}`);

let server;
try {
  if (SERVE === "preview") {
    rmSync(join(GAME_DIR, "dist"), { recursive: true, force: true });
    const buildStart = process.hrtime.bigint();
    execFileSync("npx", ["-y", "corepack", "yarn", "build"], {
      cwd: GAME_DIR,
      stdio: "ignore",
    });
    say(
      `build: ${since(buildStart)} s (yarn build in the workspace, dist/ removed first)`,
    );
  }
  const serveStart = process.hrtime.bigint();
  server = spawn(
    join(FRONTEND, "node_modules/.bin/vite"),
    [
      ...(SERVE === "preview" ? ["preview"] : []),
      "--port",
      String(PORT),
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    { cwd: GAME_DIR, stdio: "ignore" },
  );
  await waitFor(URL_, 60_000);
  say(
    `served: ${URL_} (${SERVE === "preview" ? "vite preview of dist/" : "vite dev server"}), answering after ${since(serveStart)} s`,
  );

  rmSync(OUT, { recursive: true, force: true });
  for (let run = 1; run <= RUNS; run++) {
    const target = join(OUT, `run-${run}`);
    mkdirSync(target, { recursive: true });
    const start = process.hrtime.bigint();
    const printed = execFileSync("node", [COPY, "--url", URL_, ...ids], {
      cwd: GAME_DIR,
      env: { ...process.env, CAPTURE_OUT: target },
      encoding: "utf8",
    });
    const took = since(start);
    say(
      `run ${run}: ${took} s, Chromes left on its profile: ${await chromesLeft()}`,
    );
    for (const line of printed.trim().split("\n")) say(`  ${line}`);
  }
} finally {
  server?.kill();
  rmSync(COPY, { force: true });
}

// The committed images the runs are compared with.
const committedDir =
  game === "solitaire"
    ? join(GAME_DIR, "docs/screenshots")
    : join(GAME_DIR, "public/docs/screenshots", game);
const first = join(OUT, "run-1");
for (const file of filesUnder(first)) {
  const one = readFileSync(join(first, file));
  say("");
  say(`${file}: ${one.length} bytes, sha256 ${hashOf(one)} in run 1`);
  for (let run = 2; run <= RUNS; run++) {
    const other = readFileSync(join(OUT, `run-${run}`, file));
    say(
      `  run ${run}: ${other.length} bytes, sha256 ${hashOf(other)}, ` +
        `${hashOf(one) === hashOf(other) ? "byte-identical" : "bytes differ"}; ` +
        `pixels: ${await comparePixels(one, other)}`,
    );
  }
  const committed = join(committedDir, file);
  if (existsSync(committed)) {
    const head = readFileSync(committed);
    say(
      `  HEAD: ${head.length} bytes, ${hashOf(one) === hashOf(head) ? "byte-identical" : "bytes differ"}; ` +
        `pixels: ${await comparePixels(one, head)}`,
    );
  }
}

mkdirSync(DATA, { recursive: true });
writeFileSync(
  join(DATA, `capture-${game}${SUFFIX}.txt`),
  report.join("\n") + "\n",
);
