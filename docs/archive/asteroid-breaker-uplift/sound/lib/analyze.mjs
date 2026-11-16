// Instruments for sounds nobody here can listen to: how loud a sound is,
// where its energy lies, how long it lasts, whether it clicks or loops with
// a seam, and a picture of it over time. They stand in for an ear while the
// sounds are built; the page in ../audition/ is where a person hears them.

import { SR, filter, shelf } from "./synth.mjs";
import { sharp } from "../../art/lib/raster.mjs";

/** @import { Signal } from "./synth.mjs" */

/**
 * Returns the spectrum of a stretch of samples, a power of two long: the
 * magnitude at each frequency up to half the sample rate.
 *
 * @param {Float64Array} frame
 * @returns {Float64Array}
 */
export function spectrum(frame) {
  const n = frame.length;
  const re = Float64Array.from(frame);
  const im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const t = re[i] ?? 0;
      re[i] = re[j] ?? 0;
      re[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const c = Math.cos(step * k);
        const s = Math.sin(step * k);
        const a = start + k;
        const b = a + half;
        const tr = (re[b] ?? 0) * c - (im[b] ?? 0) * s;
        const ti = (re[b] ?? 0) * s + (im[b] ?? 0) * c;
        re[b] = (re[a] ?? 0) - tr;
        im[b] = (im[a] ?? 0) - ti;
        re[a] = (re[a] ?? 0) + tr;
        im[a] = (im[a] ?? 0) + ti;
      }
    }
  }
  const out = new Float64Array(n / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = Math.hypot(re[i] ?? 0, im[i] ?? 0) / (n / 2);
  return out;
}

/**
 * Returns a sound's frames of spectrum: a window of `size` samples every
 * `hop`, each shaped by a Hann window.
 *
 * @param {Signal} x
 * @param {number} [size]
 * @param {number} [hop]
 * @returns {Float64Array[]}
 */
export function frames(x, size = 2048, hop = 256) {
  /** @type {Float64Array[]} */
  const out = [];
  const frame = new Float64Array(size);
  for (let start = -size / 2; start < x.length; start += hop) {
    for (let i = 0; i < size; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
      frame[i] = (x[start + i] ?? 0) * w * 2;
    }
    out.push(spectrum(frame));
  }
  return out;
}

/** The bands a sound's energy is reported in, by their upper edges in Hz. */
export const BANDS = [
  { name: "sub", to: 120 },
  { name: "low", to: 300 },
  { name: "mid", to: 2000 },
  { name: "high", to: 8000 },
  { name: "air", to: SR / 2 },
];

/**
 * @typedef {object} Measured
 * @property {number} seconds Its length.
 * @property {number} active Seconds until it last passes 60 dB under its peak.
 * @property {number} peak Its loudest sample, in dB below full scale.
 * @property {number} rms50 The level of its loudest 50 ms, in dB.
 * @property {number} lufs Its loudness as an ear weighs it, over its active stretch.
 * @property {number} crest Its peak over its loudest 50 ms, in dB: high for a sharp hit, low for a dense one.
 * @property {number} centroid Where its energy centers, in Hz.
 * @property {Record<string, number>} bands The share of its energy in each of `BANDS`, 0 to 1.
 * @property {number} phone The share of its energy above 300 Hz, which a phone's speaker keeps.
 * @property {number} dc How far its mean sits off zero.
 * @property {number} edge The larger of its first and last samples, which should be near zero.
 */

/**
 * Returns what the instruments read of a sound.
 *
 * @param {Signal} x
 * @returns {Measured}
 */
export function measure(x) {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    peak = Math.max(peak, Math.abs(x[i] ?? 0));
    sum += x[i] ?? 0;
  }
  const floor = peak / 1000;
  let last = 0;
  for (let i = x.length - 1; i >= 0; i--) {
    if (Math.abs(x[i] ?? 0) > floor) {
      last = i;
      break;
    }
  }
  const window = Math.min(x.length, Math.round(0.05 * SR));
  let energy = 0;
  let most = 0;
  for (let i = 0; i < x.length; i++) {
    energy += (x[i] ?? 0) ** 2;
    if (i >= window) energy -= (x[i - window] ?? 0) ** 2;
    most = Math.max(most, energy);
  }
  const rms50 = Math.sqrt(most / window);
  // As an ear weighs it: highs lifted by a shelf, rumble cut by a high-pass.
  const weighed = filter(shelf(x, "high", 1682, 4), "hp", 38, 0.5);
  let square = 0;
  for (let i = 0; i <= last; i++) square += (weighed[i] ?? 0) ** 2;
  const lufs = -0.691 + 10 * Math.log10(Math.max(1e-12, square / (last + 1)));
  const total = new Float64Array(1025);
  for (const frame of frames(x, 2048, 512)) {
    for (let i = 0; i < total.length; i++)
      total[i] = (total[i] ?? 0) + (frame[i] ?? 0) ** 2;
  }
  let all = 0;
  let weighted = 0;
  /** @type {Record<string, number>} */
  const bands = Object.fromEntries(BANDS.map(({ name }) => [name, 0]));
  for (let i = 1; i < total.length; i++) {
    const freq = (i * SR) / 2048;
    const power = total[i] ?? 0;
    all += power;
    weighted += power * freq;
    const band = BANDS.find(({ to }) => freq <= to) ?? BANDS[BANDS.length - 1];
    if (band) bands[band.name] = (bands[band.name] ?? 0) + power;
  }
  for (const name of Object.keys(bands))
    bands[name] = (bands[name] ?? 0) / Math.max(1e-20, all);
  const toDb = (/** @type {number} */ v) => 20 * Math.log10(Math.max(1e-9, v));
  return {
    seconds: x.length / SR,
    active: (last + 1) / SR,
    peak: toDb(peak),
    rms50: toDb(rms50),
    lufs,
    crest: toDb(peak) - toDb(rms50),
    centroid: weighted / Math.max(1e-20, all),
    bands,
    phone: 1 - (bands.sub ?? 0) - (bands.low ?? 0),
    dc: sum / x.length,
    edge: Math.max(Math.abs(x[0] ?? 0), Math.abs(x[x.length - 1] ?? 0)),
  };
}

/**
 * Returns how badly a loop's end fails to meet its start: the jump between
 * its last sample and its first, against the largest jump between any two
 * neighbours inside it. Under 1 the seam is no worse than the sound itself.
 *
 * @param {Signal} x
 * @returns {number}
 */
export function seam(x) {
  let most = 1e-9;
  for (let i = 1; i < x.length; i++)
    most = Math.max(most, Math.abs((x[i] ?? 0) - (x[i - 1] ?? 0)));
  return Math.abs((x[0] ?? 0) - (x[x.length - 1] ?? 0)) / most;
}

/** The colors a spectrogram runs through, from silence to full: black, violet, red, orange, pale yellow. */
const HEAT = [
  [8, 8, 16],
  [44, 18, 92],
  [128, 30, 108],
  [205, 62, 72],
  [248, 142, 40],
  [252, 232, 150],
];

/**
 * Returns a picture of a sound as pixels: time across, pitch up on a
 * logarithmic scale from 40 Hz to 20 kHz, brightness for level over a range
 * of 80 dB.
 *
 * @param {Signal} x
 * @param {number} width
 * @param {number} height
 * @param {number} [seconds] The time the width spans, the sound's own unless given.
 * @returns {Buffer} Its pixels, red, green and blue.
 */
export function spectrogram(x, width, height, seconds = x.length / SR) {
  const hop = 256;
  const size = 2048;
  const all = frames(x, size, hop);
  const pixels = Buffer.alloc(width * height * 3);
  const low = Math.log(40);
  const high = Math.log(20000);
  for (let px = 0; px < width; px++) {
    const t = (px / width) * seconds;
    const frame = all[Math.round((t * SR) / hop)];
    for (let py = 0; py < height; py++) {
      const freq = Math.exp(high - ((py + 0.5) / height) * (high - low));
      const bin = (freq * size) / SR;
      const k = Math.floor(bin);
      const f = bin - k;
      const magnitude = frame
        ? (frame[k] ?? 0) * (1 - f) + (frame[k + 1] ?? 0) * f
        : 0;
      const db = 20 * Math.log10(Math.max(1e-9, magnitude));
      const level =
        Math.min(1, Math.max(0, (db + 84) / 80)) * (HEAT.length - 1);
      const i = Math.min(Math.floor(level), HEAT.length - 2);
      const a = HEAT[i] ?? [0, 0, 0];
      const b = HEAT[i + 1] ?? [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        pixels[(py * width + px) * 3 + c] = Math.round(
          (a[c] ?? 0) + ((b[c] ?? 0) - (a[c] ?? 0)) * (level - i),
        );
      }
    }
  }
  return pixels;
}

/**
 * Writes a sheet of spectrograms, a tile a sound, each labeled with its
 * name and what was measured of it, so many sounds can be checked at once.
 *
 * @param {readonly { name: string, x: Signal, note?: string }[]} sounds
 * @param {string} file A PNG's path.
 * @param {{ columns?: number, tile?: [number, number], seconds?: number }} [how] The tiles across, a tile's size, and the time every tile spans (each sound's own unless given).
 * @returns {Promise<void>}
 */
export async function contactSheet(
  sounds,
  file,
  { columns = 6, tile = [260, 130], seconds } = {},
) {
  const [tw, th] = tile;
  const label = 34;
  const gap = 8;
  const rows = Math.ceil(sounds.length / columns);
  const width = columns * (tw + gap) + gap;
  const height = rows * (th + label + gap) + gap;
  /** @type {import("sharp").OverlayOptions[]} */
  const layers = [];
  const words = [];
  sounds.forEach(({ name, x, note }, i) => {
    const left = gap + (i % columns) * (tw + gap);
    const top = gap + Math.floor(i / columns) * (th + label + gap);
    layers.push({
      input: spectrogram(x, tw, th, seconds),
      raw: { width: tw, height: th, channels: 3 },
      left,
      top,
    });
    const m = measure(x);
    const escaped = (/** @type {string} */ s) =>
      s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
    words.push(
      `<text x="${left}" y="${top + th + 13}" font-family="Consolas, monospace" font-size="12" fill="#e8e8f0">${escaped(name)}</text>`,
      `<text x="${left}" y="${top + th + 27}" font-family="Consolas, monospace" font-size="10" fill="#9a9ab0">${escaped(
        note ??
          `${(m.active * 1000).toFixed(0)}ms pk${m.peak.toFixed(0)} L${m.lufs.toFixed(0)} c${(m.centroid / 1000).toFixed(1)}k ph${(m.phone * 100).toFixed(0)}%`,
      )}</text>`,
    );
  });
  layers.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${words.join("")}</svg>`,
    ),
    left: 0,
    top: 0,
  });
  await sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 20, b: 28 } },
  })
    .composite(layers)
    .png()
    .toFile(file);
}

/**
 * Returns a line of a report on a sound, for a table in markdown.
 *
 * @param {string} name
 * @param {Signal} x
 * @returns {string}
 */
export function reportLine(name, x) {
  const m = measure(x);
  const share = (/** @type {number | undefined} */ v) =>
    `${Math.round((v ?? 0) * 100)}`;
  return `| \`${name}\` | ${(m.active * 1000).toFixed(0)} | ${m.peak.toFixed(1)} | ${m.rms50.toFixed(1)} | ${m.lufs.toFixed(1)} | ${m.crest.toFixed(1)} | ${m.centroid.toFixed(0)} | ${share(m.bands.sub)}/${share(m.bands.low)}/${share(m.bands.mid)}/${share(m.bands.high)}/${share(m.bands.air)} | ${share(m.phone)} |`;
}

/** The heading of a report's table, to go with `reportLine()`. */
export const REPORT_HEAD = [
  "| Sound | ms | Peak dB | RMS 50 ms | LUFS | Crest | Centroid Hz | sub/low/mid/high/air % | Phone % |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |",
].join("\n");
