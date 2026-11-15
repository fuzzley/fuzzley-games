// Instruments for sounds nobody building them can listen to: how loud a
// sound is, where its energy lies, how long it lasts, and whether it clicks
// or loops with a seam. They stand in for an ear while the sounds are built,
// and catch what is broken, thin, dull or too quiet for a phone; a person's
// ear decides the rest.

import { SR, type Signal, filter, shelf } from "./synth_signal.ts";

/** A band a sound's energy is reported in, by its upper edge in Hz. */
export interface Band {
  readonly name: BandName;
  readonly to: number;
}

/** The bands' names, from the lowest. */
export type BandName = "sub" | "low" | "mid" | "high" | "air";

/** The bands a sound's energy is reported in, from the lowest. */
export const BANDS: readonly Band[] = [
  { name: "sub", to: 120 },
  { name: "low", to: 300 },
  { name: "mid", to: 2000 },
  { name: "high", to: 8000 },
  { name: "air", to: SR / 2 },
];

/** Describes what the instruments read of a sound. */
export interface Measured {
  /** Its length, in seconds. */
  readonly seconds: number;
  /** The seconds until it last passes 60 dB under its peak. */
  readonly active: number;
  /** Its loudest sample, in dB below full scale. */
  readonly peak: number;
  /** The level of its loudest 50 ms, in dB. */
  readonly rms50: number;
  /** Its loudness as an ear weighs it, over its active stretch. */
  readonly lufs: number;
  /** Its peak over its loudest 50 ms, in dB: high for a sharp hit, low for a dense one. */
  readonly crest: number;
  /** Where its energy centers, in Hz. */
  readonly centroid: number;
  /** The share of its energy in each of {@link BANDS}, from 0 to 1. */
  readonly bands: Readonly<Record<BandName, number>>;
  /** The share of its energy above 300 Hz, which a phone's speaker keeps. */
  readonly phone: number;
  /** How far its mean sits off zero. */
  readonly dc: number;
  /** The larger of its first and last samples, which should be near zero. */
  readonly edge: number;
}

/**
 * Returns the spectrum of a stretch of samples a power of two long: the
 * magnitude at each frequency up to half the sample rate.
 */
export function spectrum(frame: Float64Array): Float64Array {
  const n = frame.length;
  const re = Float64Array.from(frame);
  const im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const t = re[i]!;
      re[i] = re[j]!;
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
        const tr = re[b]! * c - im[b]! * s;
        const ti = re[b]! * s + im[b]! * c;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
      }
    }
  }
  const out = new Float64Array(n / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.hypot(re[i]!, im[i]!) / (n / 2);
  }
  return out;
}

/**
 * Returns a sound's frames of spectrum: a window of `size` samples, a power
 * of two, every `hop`, each shaped by a Hann window.
 */
export function frames(x: Signal, size = 2048, hop = 256): Float64Array[] {
  const out: Float64Array[] = [];
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

/**
 * Returns the amplitude of a sound's partial at a pitch, in Hz, read through
 * a Hann window over the whole of it, so a steady sine of amplitude 1 reads 1
 * at its own pitch, and a pitch between a sound's partials reads how much
 * lies there.
 */
export function amplitudeAt(x: Signal, freq: number): number {
  let re = 0;
  let im = 0;
  let weights = 0;
  x.forEach((v, i) => {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (x.length - 1));
    re += v * w * Math.cos((2 * Math.PI * freq * i) / SR);
    im -= v * w * Math.sin((2 * Math.PI * freq * i) / SR);
    weights += w;
  });
  return (2 * Math.hypot(re, im)) / weights;
}

/** Returns a level in dB, a billionth's for silence. */
function decibels(level: number): number {
  return 20 * Math.log10(Math.max(1e-9, level));
}

/** Returns a sound's loudest sample. */
function peakOf(x: Signal): number {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  return peak;
}

/** Returns the RMS of a sound's loudest 50 ms, or of it all where it is shorter. */
function rms50Of(x: Signal): number {
  const window = Math.min(x.length, Math.round(0.05 * SR));
  let energy = 0;
  let most = 0;
  for (let i = 0; i < x.length; i++) {
    energy += x[i]! ** 2;
    if (i >= window) energy -= x[i - window]! ** 2;
    most = Math.max(most, energy);
  }
  return Math.sqrt(most / window);
}

/**
 * Returns how loud a sound is, in dB, as a game's build levels it: its
 * loudest sample and the level of its loudest 50 ms, as {@link measure}
 * reads them, without the rest, which takes far longer to read.
 */
export function loudness(x: Signal): Pick<Measured, "peak" | "rms50"> {
  return { peak: decibels(peakOf(x)), rms50: decibels(rms50Of(x)) };
}

/** Returns what the instruments read of a sound. */
export function measure(x: Signal): Measured {
  const peak = peakOf(x);
  let sum = 0;
  for (const v of x) sum += v;
  const floor = peak / 1000;
  let last = 0;
  for (let i = x.length - 1; i >= 0; i--) {
    if (Math.abs(x[i]!) > floor) {
      last = i;
      break;
    }
  }
  const rms50 = rms50Of(x);
  // As an ear weighs it: highs lifted by a shelf, rumble cut by a high-pass.
  const weighed = filter(shelf(x, "high", 1682, 4), "hp", 38, 0.5);
  let square = 0;
  for (let i = 0; i <= last; i++) square += weighed[i]! ** 2;
  const lufs = -0.691 + 10 * Math.log10(Math.max(1e-12, square / (last + 1)));
  const total = new Float64Array(1025);
  for (const frame of frames(x, 2048, 512)) {
    for (let i = 0; i < total.length; i++) {
      total[i] = total[i]! + (frame[i] ?? 0) ** 2;
    }
  }
  let all = 0;
  let weighted = 0;
  const bands: Record<BandName, number> = {
    sub: 0,
    low: 0,
    mid: 0,
    high: 0,
    air: 0,
  };
  for (let i = 1; i < total.length; i++) {
    const freq = (i * SR) / 2048;
    const power = total[i]!;
    all += power;
    weighted += power * freq;
    for (const band of BANDS) {
      if (freq <= band.to) {
        bands[band.name] += power;
        break;
      }
    }
  }
  for (const { name } of BANDS)
    bands[name] = bands[name] / Math.max(1e-20, all);
  return {
    seconds: x.length / SR,
    active: (last + 1) / SR,
    peak: decibels(peak),
    rms50: decibels(rms50),
    lufs,
    crest: decibels(peak) - decibels(rms50),
    centroid: weighted / Math.max(1e-20, all),
    bands,
    phone: 1 - bands.sub - bands.low,
    dc: sum / x.length,
    edge: Math.max(Math.abs(x[0]!), Math.abs(x[x.length - 1]!)),
  };
}

/**
 * Returns how badly a loop's end fails to meet its start: the jump between
 * its last sample and its first, against the largest jump between any two
 * neighbours inside it. Under 1 the seam is no worse than the sound itself.
 */
export function seam(x: Signal): number {
  let most = 1e-9;
  for (let i = 1; i < x.length; i++) {
    most = Math.max(most, Math.abs(x[i]! - x[i - 1]!));
  }
  return Math.abs(x[0]! - x[x.length - 1]!) / most;
}
