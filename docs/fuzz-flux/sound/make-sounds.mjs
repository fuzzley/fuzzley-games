/**
 * Renders Fuzz Flux's sound effects from their recipes: a sprite of them all
 * with its offsets, short reels of how they fall together in play, a table of
 * their measures, and a sheet of their spectrograms.
 *
 * `node sound/make-sounds.mjs` writes `sprite.m4a`, `sprite.json`,
 * `reels/*.m4a`, `measures.md` and `sheet.webp` beside it, and the WAV files
 * they were made from into `out/`, which is not kept. It needs `ffmpeg`.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { born, chirp, note, pop, puff, SOUNDS, zap } from "./sounds.mjs";
import { add, silence, SR, wav } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  join(here, "..", "..", "..", "frontend", "package.json"),
);

/** @type {Map<string, Float32Array>} */
const made = new Map();
for (const sound of SOUNDS) made.set(sound.id, sound.make());

/**
 * Returns one of the catalog's sounds.
 * @param {string} id
 * @returns {Float32Array}
 */
function get(id) {
  const buf = made.get(id);
  if (!buf) throw new Error(`No sound called ${id}`);
  return buf;
}

/**
 * Lays sounds out along a timeline, each at its moment in seconds.
 * @param {[buf: Float32Array, at: number, level?: number][]} parts
 * @returns {Float32Array}
 */
function reel(parts) {
  let seconds = 0;
  for (const [buf, at] of parts)
    seconds = Math.max(seconds, at + buf.length / SR);
  const out = silence(seconds + 0.25);
  for (const [buf, at, level = 1] of parts) add(out, buf, at, level);
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.89) for (let i = 0; i < out.length; i++) out[i] *= 0.89 / peak;
  return out;
}

/**
 * Returns the sounds of one bunch hopping off: its note, and a pop for each
 * fuzzball, 30 ms apart.
 * @param {number} at
 * @param {number} step The wave, from 0.
 * @param {number} size
 * @returns {[Float32Array, number, number?][]}
 */
function bunch(at, step, size) {
  /** @type {[Float32Array, number, number?][]} */
  const parts = [[note(step, size), at]];
  for (let n = 0; n < size; n++)
    parts.push([pop(step + n), at + 0.05 + n * 0.03, 0.8]);
  return parts;
}

/** How the sounds fall together in play, at the design's timings. */
const REELS = {
  "a-move-of-five-waves": reel([
    [get("pick"), 0],
    [get("swap"), 0.12],
    ...bunch(0.3, 0, 3),
    [get("land"), 0.66],
    ...bunch(0.82, 1, 3),
    [get("land"), 1.18],
    ...bunch(1.34, 2, 4),
    [born("dasher"), 1.4, 0.8],
    [chirp(1), 1.52],
    [get("land"), 1.78],
    ...bunch(1.94, 3, 3),
    [get("land"), 2.3],
    ...bunch(2.46, 4, 3),
    [chirp(2), 2.6],
    [get("land"), 2.84],
  ]),
  "a-dasher-made-and-set-off": reel([
    [get("pick"), 0],
    [get("swap"), 0.12],
    ...bunch(0.3, 0, 4),
    [get("born-dasher"), 0.36],
    [get("land"), 0.8],
    [get("pick"), 1.5],
    [get("swap"), 1.62],
    [get("dash"), 1.78],
    ...[0, 1, 2, 3, 4, 5, 6].map(
      (n) =>
        /** @type {[Float32Array, number, number]} */ ([
          pop(n),
          1.84 + n * 0.028,
          0.8,
        ]),
    ),
    [get("land"), 2.36],
    ...bunch(2.52, 1, 3),
    [get("land"), 2.9],
  ]),
  "a-puffer-made-and-set-off": reel([
    [get("swap"), 0],
    ...bunch(0.18, 0, 5),
    [get("born-puffer"), 0.24],
    [get("land"), 0.72],
    [get("swap"), 1.4],
    [get("puff"), 1.56],
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(
      (n) =>
        /** @type {[Float32Array, number, number]} */ ([
          pop(n % 6),
          1.72 + Math.floor(n / 4) * 0.04 + (n % 4) * 0.012,
          0.6,
        ]),
    ),
    [get("land"), 2.3],
    [get("land"), 2.36, 0.8],
  ]),
  "a-frizzball-made-and-set-off": reel([
    [get("swap"), 0],
    ...bunch(0.18, 0, 5),
    [get("born-frizz"), 0.24],
    [get("land"), 0.9],
    [get("swap"), 1.6],
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (n) =>
        /** @type {[Float32Array, number, number]} */ ([
          zap(n),
          1.8 + n * 0.04,
        ]),
    ),
    [get("frizz"), 2.36],
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (n) =>
        /** @type {[Float32Array, number, number]} */ ([
          pop(n % 7),
          2.38 + n * 0.012,
          0.5,
        ]),
    ),
    [get("land"), 3.0],
    ...bunch(3.16, 1, 3),
    [get("land"), 3.54],
  ]),
  "two-puffers-together": reel([
    [get("swap"), 0],
    [get("pair"), 0.14],
    [puff(true), 0.44],
    [chirp(3), 0.7, 0.7],
    [get("land"), 1.5],
    [get("land"), 1.56, 0.8],
  ]),
  "bricks-a-cage-and-dust": reel([
    [get("swap"), 0],
    ...bunch(0.18, 0, 3),
    [get("knock-1"), 0.24],
    [get("dust"), 0.26],
    [get("land"), 0.56],
    [get("swap"), 1.1],
    ...bunch(1.28, 0, 3),
    [get("break"), 1.34],
    [get("cage"), 1.36],
    [get("yip"), 1.5],
    [get("land"), 1.7],
    [get("burr-off"), 2.2],
    [get("burr-spread"), 2.7],
  ]),
  "a-brick-of-4-layers": reel([
    ...bunch(0, 0, 3),
    [get("knock-3"), 0.06],
    [get("land"), 0.42],
    ...bunch(0.8, 0, 3),
    [get("knock-2"), 0.86],
    [get("land"), 1.22],
    ...bunch(1.6, 0, 3),
    [get("knock-1"), 1.66],
    [get("land"), 2.02],
    ...bunch(2.4, 0, 3),
    [get("break"), 2.46],
    [get("land"), 2.9],
  ]),
  "a-level-cleared": reel([
    ...bunch(0, 2, 3),
    [get("tick"), 0.42],
    [get("tick"), 0.47],
    [get("tick"), 0.52],
    [get("goal"), 0.6],
    [get("win"), 1.0],
    [get("encore"), 2.7],
    [get("dash"), 2.8, 0.7],
    [get("encore"), 3.05],
    [get("puff"), 3.15, 0.7],
    [get("encore"), 3.4],
    [get("dash"), 3.5, 0.7],
    [get("star-1"), 4.3],
    [get("star-2"), 4.65],
    [get("star-3"), 5.0],
  ]),
  "the-ladder": reel(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
      (n) =>
        /** @type {[Float32Array, number]} */ ([note(n, 3, n % 3), n * 0.36]),
    ),
  ),
  "out-of-moves-a-sleepyhead-the-wind": reel([
    [get("low"), 0],
    [get("lose"), 0.9],
    [get("bed"), 2.2],
    [get("gust"), 4.0],
    [get("shuffle"), 5.2],
    [get("hint"), 6.1],
    [get("refuse"), 6.7],
  ]),
};

/**
 * Returns a sound's measures: its length, its peak, its average level and
 * where the middle of its energy lies.
 * @param {Float32Array} buf
 * @returns {{ ms: number, peak: number, rms: number, centroid: number }}
 */
function measure(buf) {
  let peak = 0;
  let sum = 0;
  for (const v of buf) {
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  const frames = spectrum(buf);
  let weighted = 0;
  let total = 0;
  for (const frame of frames) {
    frame.forEach((m, bin) => {
      weighted += m * m * ((bin * SR) / 1024);
      total += m * m;
    });
  }
  return {
    ms: Math.round((buf.length / SR) * 1000),
    peak: 20 * Math.log10(peak),
    rms: 10 * Math.log10(sum / buf.length),
    centroid: total > 0 ? weighted / total : 0,
  };
}

/**
 * Returns a sound's spectrum over time: frames of 1024 samples, 256 apart,
 * each the magnitudes of its lower half.
 * @param {Float32Array} buf
 * @returns {Float32Array[]}
 */
function spectrum(buf) {
  const size = 1024;
  const hop = 256;
  const frames = [];
  for (let start = 0; start + 64 < buf.length; start += hop) {
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const v = start + i < buf.length ? buf[start + i] : 0;
      re[i] = v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
      }
    }
    for (let len = 2; len <= size; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      for (let i = 0; i < size; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const wr = Math.cos(ang * k);
          const wi = Math.sin(ang * k);
          const a = i + k;
          const b = a + len / 2;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    const mags = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++)
      mags[i] = Math.hypot(re[i], im[i]) / (size / 4);
    frames.push(mags);
  }
  return frames;
}

/**
 * Writes a sound as a WAV file and as an M4A beside the script.
 * @param {Float32Array} buf
 * @param {string} name Without its extension.
 * @param {string} folder Where the M4A goes, under this folder.
 */
function write(buf, name, folder) {
  const wavFile = join(here, "out", `${name}.wav`);
  writeFileSync(wavFile, wav(buf));
  const m4a = join(here, folder, `${name}.m4a`);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    wavFile,
    "-c:a",
    "aac",
    "-b:a",
    "72k",
    "-movflags",
    "+faststart",
    m4a,
  ]);
}

if (import.meta.main) {
  mkdirSync(join(here, "out"), { recursive: true });
  mkdirSync(join(here, "reels"), { recursive: true });

  // The sprite: every sound in the catalog's order, a tenth of a second apart.
  /** @type {Record<string, { start: number, seconds: number }>} */
  const offsets = {};
  let at = 0.1;
  /** @type {[Float32Array, number][]} */
  const parts = [];
  for (const sound of SOUNDS) {
    const buf = get(sound.id);
    writeFileSync(join(here, "out", `${sound.id}.wav`), wav(buf));
    offsets[sound.id] = {
      start: Math.round(at * 1000) / 1000,
      seconds: Math.round((buf.length / SR) * 1000) / 1000,
    };
    parts.push([buf, at]);
    at += buf.length / SR + 0.1;
  }
  const sprite = silence(at);
  for (const [buf, start] of parts) add(sprite, buf, start);
  write(sprite, "sprite", ".");
  writeFileSync(
    join(here, "sprite.json"),
    JSON.stringify(offsets, null, 2) + "\n",
  );
  for (const [name, buf] of Object.entries(REELS)) write(buf, name, "reels");

  const rows = SOUNDS.map((sound) => {
    const m = measure(get(sound.id));
    return `| \`${sound.id}\` | ${sound.when} | ${m.ms} | ${m.peak.toFixed(1)} | ${m.rms.toFixed(1)} | ${Math.round(m.centroid / 10) * 10} |`;
  });
  writeFileSync(
    join(here, "measures.md"),
    [
      "| Sound | When it plays | ms | Peak, dBFS | Average, dBFS | Middle of its energy, Hz |",
      "| ----- | ------------- | -- | ---------- | ------------- | ------------------------ |",
      ...rows,
    ].join("\n") + "\n",
  );

  // The sheet: each sound's spectrogram, 80 Hz to 8 kHz on a log scale.
  const sharp = require("sharp");
  const cols = 6;
  const tileW = 300;
  const tileH = 150;
  const plotW = 280;
  const plotH = 100;
  const sheetRows = Math.ceil(SOUNDS.length / cols);
  const W = cols * tileW + 20;
  const H = sheetRows * tileH + 50;
  const pixels = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) pixels.set([14, 26, 43], i * 3);
  let labels = "";
  SOUNDS.forEach((sound, n) => {
    const buf = get(sound.id);
    const frames = spectrum(buf);
    const x0 = 20 + (n % cols) * tileW;
    const y0 = 46 + Math.floor(n / cols) * tileH;
    const seconds = buf.length / SR;
    const span = Math.max(0.5, Math.ceil(seconds * 2) / 2);
    for (let px = 0; px < plotW; px++) {
      const t = (px / plotW) * span;
      const frame = frames[Math.floor((t * SR) / 256)];
      for (let py = 0; py < plotH; py++) {
        const hzAt = 80 * (8000 / 80) ** (1 - py / plotH);
        const m = frame
          ? frame[Math.min(511, Math.round((hzAt * 1024) / SR))]
          : 0;
        const db = 20 * Math.log10(m + 1e-6);
        const v = Math.max(0, Math.min(1, (db + 66) / 60));
        const at3 = ((y0 + py) * W + x0 + px) * 3;
        pixels[at3] = Math.round(23 + v * v * 232);
        pixels[at3 + 1] = Math.round(39 + v * 170);
        pixels[at3 + 2] = Math.round(65 + v ** 0.5 * 110 - v * v * 110);
      }
    }
    const m = measure(buf);
    labels += `<text x="${x0}" y="${y0 + plotH + 16}" font-size="13" font-weight="700" fill="#e6edf7">${sound.id}</text>`;
    labels += `<text x="${x0 + plotW}" y="${y0 + plotH + 16}" font-size="11" text-anchor="end" fill="#93a4bd">${m.ms} ms of ${span} s · peak ${m.peak.toFixed(0)} dB</text>`;
  });
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="system-ui, sans-serif"><text x="20" y="28" font-size="18" font-weight="700" fill="#e6edf7">Fuzz Flux · the sound effects, 80 Hz to 8 kHz</text>${labels}</svg>`;
  await sharp(pixels, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(overlay) }])
    .webp({ quality: 82 })
    .toFile(join(here, "sheet.webp"));
  console.log(
    `${SOUNDS.length} sounds, ${at.toFixed(1)} s of sprite, ${Object.keys(REELS).length} reels`,
  );
}
