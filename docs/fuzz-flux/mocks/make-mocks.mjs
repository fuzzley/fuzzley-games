/**
 * Makes the design's mocks by playing the feel sketch in a headless Chrome:
 * a storyboard of every scene in `scenes.mjs`, a clip with sound of the ones
 * marked for it, every level as it opens, and the screens.
 *
 * Run it with nothing to make them all, or with scenes' names, `levels` or
 * `screens` to make only those: `node docs/fuzz-flux/mocks/make-mocks.mjs a-dasher`.
 */

/** @import { Page } from '../sketch/feel/chrome.mjs' */
/** @import { Plan } from './scenes.mjs' */

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { DARK } from "../art/fuzz.mjs";
import { SETS, allLevels } from "../levels/drafts.mjs";
import { open } from "../sketch/feel/chrome.mjs";
import { SOUNDS, born, chirp, note, pop, puff, zap } from "../sound/sounds.mjs";
import { SR, wav } from "../sound/synth.mjs";
import { SCENES, plan } from "./scenes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  join(here, "..", "..", "..", "frontend", "package.json"),
);
const sharp = require("sharp");

const PAGE = pathToFileURL(join(here, "feel.html")).href;
const FPS = 30;
const FRAME = 1000 / FPS;
const INK = DARK.roles;

/** How long a capture rests before its first move, and between moves, in frames. */
const LEAD = 8;
const PAUSE = 16;

/**
 * Returns text safe to put in SVG.
 * @param {string} text
 * @returns {string}
 */
function safe(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/**
 * Opens the sketch with its clock held, its buttons hidden and touches shown.
 * @param {{ width: number, height: number, scale?: number, mobile?: boolean, reducedMotion?: boolean }} view
 * @param {boolean} [bare] Whether to hide the sketch's own buttons.
 * @returns {Promise<Page>}
 */
async function sketch(view, bare = true) {
  const page = await open(PAGE, view);
  await page.run(
    `fuzzFlux.hold(true); fuzzFlux.showTouches(); document.getElementById("hand").style.display = "none"; ${bare ? 'document.querySelector("nav").style.display = "none"; dispatchEvent(new Event("resize"));' : ""} 0`,
  );
  return page;
}

/**
 * Returns the sound a name the sketch asked for stands for.
 * @param {string} name
 * @returns {Float32Array | null}
 */
function soundOf(name) {
  let m;
  if ((m = /^note-(\d+)-(\d)$/.exec(name)))
    return note(Number(m[1]), Number(m[2]), Number(m[1]) % 3);
  if ((m = /^pop-(\d+)$/.exec(name))) return pop(Number(m[1]));
  if ((m = /^zap-(\d+)$/.exec(name))) return zap(Number(m[1]));
  if ((m = /^born-(dasher|puffer|wisp|frizz)$/.exec(name)))
    return born(/** @type {'dasher'} */ (m[1]));
  if ((m = /^chirp-(\d)$/.exec(name))) return chirp(Number(m[1]));
  if (name === "big-puff") return puff(true);
  return SOUNDS.find((sound) => sound.id === name)?.make() ?? null;
}

/** @type {Map<string, Float32Array | null>} */
const sounds = new Map();

/**
 * Mixes the sounds a capture asked for into one track.
 * @param {{ name: string, when: number, level: number }[]} heard
 * @param {number} from The capture's first moment, in the sketch's ms.
 * @param {number} seconds
 * @returns {Uint8Array} A WAV file.
 */
function mix(heard, from, seconds) {
  const track = new Float32Array(Math.ceil(seconds * SR));
  for (const { name, when, level } of heard) {
    if (!sounds.has(name)) sounds.set(name, soundOf(name));
    const sound = sounds.get(name);
    const start = Math.round(((when - from) / 1000) * SR);
    if (!sound || start < 0) continue;
    for (let i = 0; i < sound.length && start + i < track.length; i++)
      track[start + i] += sound[i] * level;
  }
  let peak = 0;
  for (const v of track) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.89)
    for (let i = 0; i < track.length; i++) track[i] *= 0.89 / peak;
  return wav(track);
}

/**
 * Writes frames and their sound as a clip.
 * @param {Buffer[]} frames PNGs.
 * @param {Uint8Array} sound A WAV file.
 * @param {string} out
 * @returns {Promise<void>}
 */
async function clip(frames, sound, out) {
  const dir = mkdtempSync(join(tmpdir(), "fuzz-flux-clip-"));
  const track = join(dir, "sound.wav");
  writeFileSync(track, sound);
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      String(FPS),
      "-c:v",
      "png",
      "-i",
      "-",
      "-i",
      track,
      "-vf",
      "scale=480:-2:flags=lanczos",
      "-c:v",
      "libx264",
      "-preset",
      "veryslow",
      "-crf",
      "29",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "80k",
      "-ac",
      "1",
      "-shortest",
      "-movflags",
      "+faststart",
      out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  for (const frame of frames) {
    if (!ffmpeg.stdin.write(frame))
      await new Promise((done) => ffmpeg.stdin.once("drain", done));
  }
  ffmpeg.stdin.end();
  await new Promise((done, fail) =>
    ffmpeg.on("exit", (code) =>
      code === 0 ? done(null) : fail(new Error(`ffmpeg left with ${code}`)),
    ),
  );
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Lays pictures out in rows under a title, each with a line or two beneath.
 * @param {{ picture: Buffer, lines: string[] }[]} tiles
 * @param {{ title: string, across: number, width: number, out: string, quality?: number }} o
 * @returns {Promise<void>}
 */
async function sheet(tiles, o) {
  const gap = 10;
  const head = o.title ? 44 : gap;
  const foot =
    Math.max(0, ...tiles.map((tile) => tile.lines.length)) * 17 +
    (tiles.some((tile) => tile.lines.length) ? 8 : 0);
  const sized = await Promise.all(
    tiles.map((tile) =>
      sharp(tile.picture)
        .resize({ width: o.width })
        .png()
        .toBuffer({ resolveWithObject: true }),
    ),
  );
  const tall = Math.max(...sized.map((s) => s.info.height));
  const down = Math.ceil(tiles.length / o.across);
  const W = gap + o.across * (o.width + gap);
  const H = head + down * (tall + foot + gap);
  let words = o.title
    ? `<text x="${gap}" y="29" font-size="19" font-weight="600" fill="${INK.text}">${safe(o.title)}</text>`
    : "";
  /** @type {{ input: Buffer, left: number, top: number }[]} */
  const parts = [];
  sized.forEach((s, n) => {
    const left = gap + (n % o.across) * (o.width + gap);
    const top = head + Math.floor(n / o.across) * (tall + foot + gap);
    parts.push({ input: s.data, left, top });
    tiles[n].lines.forEach((line, row) => {
      words += `<text x="${left + 2}" y="${top + tall + 18 + row * 17}" font-size="12.5" fill="${row === 0 ? INK.text : INK.muted}"${row === 0 ? ' font-weight="600"' : ""}>${safe(line)}</text>`;
    });
  });
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter, DejaVu Sans, sans-serif">${words}</svg>`,
  );
  await sharp({
    create: { width: W, height: H, channels: 3, background: INK.page },
  })
    .composite([...parts, { input: text, left: 0, top: 0 }])
    .webp({ quality: o.quality ?? 78, effort: 6 })
    .toFile(o.out);
}

/**
 * Captures one scene: plays its moves with the pointer, a picture a frame.
 * @param {Page} page
 * @param {Plan} p
 * @param {number} scale The page's pixels to a CSS pixel.
 * @returns {Promise<{ frames: Buffer[], starts: number[], heard: { name: string, when: number, level: number }[], from: number, board: { left: number, top: number, size: number, cols: number, rows: number } }>}
 */
async function capture(page, p, scale) {
  const level =
    typeof p.scene.level === "number"
      ? `fuzzFlux.levels[${p.scene.level - 1}]`
      : JSON.stringify(p.level);
  await page.run(`fuzzFlux.begin(${level}, ${p.seed}); fuzzFlux.step(1400); 0`);
  for (const m of p.before) await page.run(`fuzzFlux.skip(${m.a}, ${m.b}); 0`);
  await page.run(`fuzzFlux.step(400); fuzzFlux.listen(); 0`);
  const from = await page.run(`fuzzFlux.now()`);
  const board = await page.run(`fuzzFlux.where(0, 0)`);
  /** @type {Buffer[]} */
  const frames = [];
  /** @type {number[]} */
  const starts = [];
  const frame = async () => {
    await page.run(`fuzzFlux.step(${FRAME}); 0`);
    frames.push(await page.shot());
  };
  const over = () =>
    page.run(`!fuzzFlux.busy() || !document.getElementById("veil").hidden`);
  for (let n = 0; n < LEAD; n++) await frame();
  for (const move of p.shown) {
    const a = await page.run(`fuzzFlux.where(${move.from.x}, ${move.from.y})`);
    const b = await page.run(`fuzzFlux.where(${move.to.x}, ${move.to.y})`);
    starts.push(frames.length);
    // A swipe: down on one fuzzball, across toward the other, and up.
    await page.pointer("mousePressed", a.x, a.y);
    await frame();
    await frame();
    await page.pointer(
      "mouseMoved",
      a.x + (b.x - a.x) * 0.3,
      a.y + (b.y - a.y) * 0.3,
    );
    await frame();
    await page.pointer(
      "mouseMoved",
      a.x + (b.x - a.x) * 0.62,
      a.y + (b.y - a.y) * 0.62,
    );
    // Chrome hands a pointer's moves on in its own time, so a swipe it was slow with is made for it.
    await new Promise((done) => setTimeout(done, 80));
    if (!(await page.run(`fuzzFlux.busy()`)))
      await page.run(`fuzzFlux.trySwap(${move.a}, ${move.b}); 0`);
    await page.pointer(
      "mouseReleased",
      a.x + (b.x - a.x) * 0.62,
      a.y + (b.y - a.y) * 0.62,
    );
    for (let n = 0; n < 600 && !(await over()); n++) await frame();
    for (let n = 0; n < PAUSE; n++) await frame();
  }
  for (let n = 0; n < (p.scene.tail ?? 0) / FRAME; n++) await frame();
  const heard = await page.run(`fuzzFlux.heard()`);
  void scale;
  return { frames, starts, heard, from, board };
}

/**
 * Makes a scene's storyboard, and its clip where it has one.
 * @param {Page} page
 * @param {Plan} p
 * @param {number} scale
 * @returns {Promise<void>}
 */
async function scene(page, p, scale) {
  const { frames, starts, heard, from, board } = await capture(page, p, scale);
  const first = starts[0];
  const last = frames.length - 1;
  /** @type {{ index: number, ms: number }[]} */
  const moments = p.scene.at
    ? p.scene.at.flatMap((list, move) =>
        list.map((ms) => ({
          index: starts[move] + Math.round(ms / FRAME),
          ms,
        })),
      )
    : Array.from({ length: 8 }, (_, n) =>
        Math.round((((last - first) * FRAME - 300) * n) / 7),
      ).map((ms) => ({ index: first + Math.round(ms / FRAME), ms }));
  const top = p.scene.bar
    ? 0
    : Math.max(0, Math.round((board.top - 10) * scale));
  const meta = await sharp(frames[0]).metadata();
  const bottom = Math.min(
    meta.height,
    Math.round((board.top + board.size * (board.rows + 0.45)) * scale),
  );
  const tiles = await Promise.all(
    moments.map(async ({ index, ms }, n) => {
      const picture = await sharp(frames[Math.min(last, index)])
        .extract({ left: 0, top, width: meta.width, height: bottom - top })
        .toBuffer();
      const says = p.scene.says?.[n];
      return { picture, lines: [`${ms} ms`, ...(says ? [says] : [])] };
    }),
  );
  await sheet(tiles, {
    title: p.scene.title,
    across: 4,
    width: 264,
    quality: 72,
    out: join(here, "storyboards", `${p.scene.id}.webp`),
  });
  if (p.scene.clip) {
    const seconds = frames.length / FPS;
    await clip(
      frames,
      mix(heard, from, seconds),
      join(here, "clips", `${p.scene.id}.mp4`),
    );
  }
  console.log(
    `${p.scene.id}: ${frames.length} frames${p.scene.clip ? ", a clip" : ""}`,
  );
}

/**
 * Makes a sheet a set of every level as it opens.
 * @param {Page} page
 * @returns {Promise<void>}
 */
async function levels(page) {
  const all = allLevels();
  for (const set of SETS) {
    const tiles = [];
    for (const level of all.filter((l) => l.set === set.id)) {
      await page.run(
        `fuzzFlux.start(${level.id}, true); fuzzFlux.step(1600); 0`,
      );
      // The wind's arrow turns in the page's own time.
      await new Promise((done) => setTimeout(done, 450));
      tiles.push({ picture: await page.shot(), lines: [] });
    }
    await sheet(tiles, {
      title: `${set.name}: ${set.about}`,
      across: 3,
      width: 360,
      out: join(here, "levels", `${set.id}.webp`),
      quality: 76,
    });
    console.log(`levels/${set.id}`);
  }
}

/**
 * Makes the pictures of the screens: a phone, a wide window, the other
 * palette, and the cards.
 * @returns {Promise<void>}
 */
async function screens() {
  const out = (/** @type {string} */ name) =>
    join(here, "screens", `${name}.webp`);
  const save = async (/** @type {Page} */ page, /** @type {string} */ name) => {
    await sharp(await page.shot())
      .webp({ quality: 82, effort: 6 })
      .toFile(out(name));
    console.log(`screens/${name}`);
  };
  const phone = await sketch(
    { width: 390, height: 780, scale: 2, mobile: true },
    false,
  );
  await phone.run(`fuzzFlux.start(16, true); fuzzFlux.step(1600); 0`);
  await save(phone, "phone");
  await phone.run(
    `document.querySelector('[data-do="light"]').click(); fuzzFlux.step(50); 0`,
  );
  await save(phone, "phone-light");
  await phone.run(
    `document.querySelector('[data-do="light"]').click(); document.querySelector('[data-do="levels"]').click(); 0`,
  );
  await new Promise((done) => setTimeout(done, 500));
  await save(phone, "choose-a-level");
  await phone.close();
  const wide = await sketch({ width: 1180, height: 700, scale: 1.5 }, false);
  await wide.run(`fuzzFlux.start(33, true); fuzzFlux.step(1600); 0`);
  await new Promise((done) => setTimeout(done, 450));
  await save(wide, "wide");
  await wide.close();
  // The cards, each at the end of the scene that brings it up.
  for (const [id, name] of [
    ["a-level-cleared", "level-cleared"],
    ["out-of-moves", "out-of-moves"],
  ]) {
    const page = await sketch(
      { width: 390, height: 780, scale: 2, mobile: true },
      false,
    );
    const found = /** @type {(typeof SCENES)[number]} */ (
      SCENES.find((s) => s.id === id)
    );
    const { frames } = await capture(page, plan(found), 2);
    await new Promise((done) => setTimeout(done, 1800));
    void frames;
    await save(page, name);
    await page.close();
  }
}

const asked = process.argv.slice(2);
const wants = (/** @type {string} */ name) =>
  asked.length === 0 || asked.includes(name);
execFileSync("node", [join(here, "..", "sketch", "feel", "bundle.mjs")], {
  stdio: "inherit",
});
for (const dir of ["storyboards", "clips", "levels", "screens"])
  mkdirSync(join(here, dir), { recursive: true });

const scenes = SCENES.filter((s) => wants(s.id));
if (scenes.length > 0 || wants("levels")) {
  const page = await sketch({
    width: 360,
    height: 560,
    scale: 2,
    mobile: true,
  });
  try {
    for (const s of scenes) await scene(page, plan(s), 2);
    if (wants("levels")) await levels(page);
    if (page.errors.length) console.log("The page's errors:", page.errors);
  } finally {
    await page.close();
  }
}
if (wants("screens")) await screens();
