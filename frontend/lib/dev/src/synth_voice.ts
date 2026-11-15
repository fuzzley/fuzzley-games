// The fuzzball's voice as an instrument: a small reed (a narrow pulse and a
// saw, with a little breath) at a pitch that glides, shaped through three
// resonances that move as a mouth does. A recipe says where the pitch and
// the mouth go over a call, and `sing()` sings it.

import {
  SR,
  type Signal,
  TAU,
  filter,
  gain,
  mix,
  noise,
  osc,
  samples,
  seeded,
} from "./synth_signal.ts";

/** Points along a call, each how far through it, from 0 to 1, and a value there. */
export type Path = readonly (readonly [number, number])[];

/**
 * The mouth's shapes, each the pitches of its three resonances in Hz: a
 * child's vowels, raised for a throat a few centimetres long, and `mm` for a
 * mouth kept shut.
 */
export const MOUTHS = {
  oo: [620, 1150, 2800],
  oh: [820, 1350, 2900],
  ah: [1200, 1950, 3200],
  eh: [900, 2500, 3400],
  ee: [640, 2950, 3800],
  mm: [560, 1250, 2400],
} as const satisfies Readonly<
  Record<string, readonly [number, number, number]>
>;

/** A shape of the mouth, by its vowel. */
export type Mouth = keyof typeof MOUTHS;

/** Describes a call of the voice, as a recipe gives it. */
export interface Call {
  /** How long it is voiced, in seconds. */
  readonly seconds: number;
  /** Where its pitch goes, in Hz. */
  readonly pitch: Path;
  /** The shapes its mouth passes through, and when. */
  readonly mouth: readonly (readonly [number, Mouth])[];
  /** How loud it is along the way, 1 throughout unless given. */
  readonly loud?: Path;
  /** The seconds its onset takes. */
  readonly attack?: number;
  /** The seconds its end takes. */
  readonly release?: number;
  /** A vibrato that grows from a point of the call: its rate in Hz and its depth either way, in cents. */
  readonly wobble?: {
    readonly from: number;
    readonly rate: number;
    readonly cents: number;
  };
  /** How much breath is in it, 0 for none. */
  readonly breath?: number;
  /** The throat's size against the stock one: under 1 is a larger fuzzball, its resonances lower. */
  readonly size?: number;
  /** How much of the two upper resonances is heard, 1 unless given. */
  readonly bright?: number;
  readonly seed: number;
}

/** The slow wanderings a living pitch drifts by, none in step with another: each one's rate in Hz and its depth, a share of the pitch. */
const DRIFTS = [
  { rate: 6, depth: 0.004 },
  { rate: 13, depth: 0.003 },
  { rate: 29, depth: 0.0015 },
];

/**
 * Returns a smooth curve through a path's points, a sample at a time over
 * `seconds`: it passes through each without overshooting, and turns only
 * where the points do; with `log`, it moves as pitch does, by ratio.
 */
export function along(path: Path, seconds: number, log = false): Signal {
  const out = new Float64Array(samples(seconds));
  const xs = path.map(([share]) => share);
  const ys = path.map(([, value]) => (log ? Math.log(value) : value));
  const last = path.length - 1;
  const secant = (i: number): number =>
    (ys[i + 1]! - ys[i]!) / Math.max(1e-9, xs[i + 1]! - xs[i]!);
  const slopes = ys.map((_, i) => {
    if (last === 0) return 0;
    if (i === 0) return secant(0);
    if (i === last) return secant(last - 1);
    const before = secant(i - 1);
    const after = secant(i);
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  let k = 0;
  for (let i = 0; i < out.length; i++) {
    const share = i / out.length;
    while (k < last - 1 && share >= xs[k + 1]!) k++;
    let v = ys[0] ?? 0;
    if (share >= (xs[last] ?? 1)) {
      v = ys[last]!;
    } else if (share > (xs[0] ?? 0)) {
      const width = (xs[k + 1] ?? 1) - (xs[k] ?? 0);
      const u = (share - (xs[k] ?? 0)) / Math.max(1e-9, width);
      const u2 = u * u;
      const u3 = u2 * u;
      v =
        (2 * u3 - 3 * u2 + 1) * (ys[k] ?? 0) +
        (u3 - 2 * u2 + u) * width * (slopes[k] ?? 0) +
        (3 * u2 - 2 * u3) * (ys[k + 1] ?? 0) +
        (u3 - u2) * width * (slopes[k + 1] ?? 0);
    }
    out[i] = log ? Math.exp(v) : v;
  }
  return out;
}

/**
 * Returns a call sung: the reed at the call's pitch, never quite steady,
 * through the mouth's three resonances as they move, under a soft onset and
 * a quick end.
 *
 * The lowest resonance never sits under the pitch, as a small animal's
 * doesn't when it calls high, so the note itself stays round and full
 * however high the call climbs.
 */
export function sing({
  seconds,
  pitch,
  mouth,
  loud = [
    [0, 1],
    [1, 1],
  ],
  attack = 0.016,
  release = 0.05,
  wobble,
  breath = 0.1,
  size = 1,
  bright = 1,
  seed,
}: Call): Signal {
  const n = samples(seconds);
  const random = seeded(seed);
  const f0 = along(pitch, seconds, true);
  const drifts = DRIFTS.map(({ rate, depth }) => ({
    rate: rate * (0.8 + 0.4 * random()),
    depth,
    phase: random(),
  }));
  const wobbleAt = wobble ? wobble.from * seconds : Infinity;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let bend = 1;
    for (const drift of drifts) {
      bend += drift.depth * Math.sin(TAU * (drift.rate * t + drift.phase));
    }
    if (wobble && t > wobbleAt) {
      const grown = Math.min(
        1,
        (t - wobbleAt) / Math.max(1e-6, (seconds - wobbleAt) * 0.5),
      );
      bend *=
        2 **
        ((wobble.cents * grown * Math.sin(TAU * wobble.rate * (t - wobbleAt))) /
          1200);
    }
    f0[i] = f0[i]! * bend;
  }

  const air = filter(
    noise("white", seconds, seed ^ 0x5bd1e995),
    "bp",
    2400 * size,
    0.6,
  );
  const source = mix([
    { x: osc("pulse", f0, seconds, { width: 0.18 }), gain: 0.75 },
    { x: osc("saw", f0, seconds), gain: 0.25 },
    // Most of the breath comes with the onset, as a puff.
    {
      x: air.map((v, i) => v * (1 + 4 * Math.exp(-i / SR / 0.02))),
      gain: breath,
    },
  ]);

  const [low, middle, high] = ([0, 1, 2] as const).map((k) =>
    along(
      mouth.map(([share, shape]) => [share, MOUTHS[shape][k] * size] as const),
      seconds,
      true,
    ),
  ) as [Signal, Signal, Signal];
  for (let i = 0; i < n; i++) low[i] = Math.max(low[i]!, f0[i]!);
  // A resonance is fainter the higher it sits, as a mouth's are, which is
  // what keeps an "ee" from turning shrill.
  const tilt = middle.map((freq) => 0.85 * (1600 / freq) ** 0.4);
  const voiced = mix([
    { x: filter(source, "bp", low, 2), gain: 1 },
    { x: gain(filter(source, "bp", middle, 4), tilt), gain: bright },
    { x: filter(source, "bp", high, 5), gain: 0.4 * bright },
  ]);

  const level = along(loud, seconds);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const rise = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, t / attack));
    const fall =
      0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, (seconds - t) / release));
    voiced[i] = voiced[i]! * level[i]! * rise * fall;
  }
  return filter(voiced, "lp", 5200, 0.6);
}
