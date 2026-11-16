import { createHash } from "node:crypto";
import {
  adsr,
  biquad,
  centered,
  clank,
  comb,
  compress,
  crack,
  crackle,
  crush,
  drive,
  echo,
  fade,
  filter,
  fit,
  fm,
  fold,
  gain,
  glide,
  grit,
  knock,
  lfo,
  limit,
  looped,
  mix,
  modes,
  noise,
  normalize,
  osc,
  perc,
  pluck,
  points,
  resample,
  resonate,
  reverb,
  reverbStereo,
  reversed,
  rubble,
  scatter,
  seeded,
  shelf,
  sing,
  slivers,
  thump,
  wav,
} from "./synth.ts";

/**
 * Each instrument called as a recipe might call it, and the first 16 hex digits
 * of the SHA-256 of what the kit's own JavaScript
 * (`docs/archive/asteroid-breaker-uplift/sound/lib/`) rendered for the same
 * call when the synth was ported from it, which the port renders byte for byte.
 */
const KIT: readonly (readonly [
  name: string,
  call: () => Float64Array | Buffer,
  digest: string,
])[] = [
  [
    "seeded",
    () => Float64Array.from({ length: 4 }, seeded(7)),
    "07e003d2c96bbc52",
  ],
  [
    "points",
    () =>
      points(
        [
          [0, 0],
          [0.01, 1],
          [0.03, 0.2],
        ],
        0.04,
        2,
      ),
    "c50681f84647f955",
  ],
  [
    "adsr",
    () =>
      adsr(
        { attack: 0.005, decay: 0.01, sustain: 0.5, hold: 0.02, release: 0.01 },
        0.04,
      ),
    "60b7e6e89d8b8a43",
  ],
  ["perc", () => perc(0.002, 0.02, 0.04), "447bbb6e9b9b26c6"],
  ["lfo", () => lfo(500, 100, 7, 0.04), "3cdfa722cbed49cd"],
  [
    "saw",
    () => osc("saw", glide(200, 900, 0.03, 0.05), 0.05),
    "b119c332af1b942e",
  ],
  ["pulse", () => osc("pulse", 330, 0.03, { width: 0.3 }), "b098b9a0aee7455d"],
  ["tri", () => osc("tri", 330, 0.03, { phase: 0.25 }), "9d9e37dff4acae5b"],
  ["fm", () => fm(300, 1.4, 2, 0.04, { feedback: 0.3 }), "48a6ac5842a12cff"],
  ["pink", () => noise("pink", 0.05, 3), "34673648630820ec"],
  ["brown", () => noise("brown", 0.05, 4), "a38d5732915fad20"],
  [
    "modes",
    () =>
      modes(
        [
          { freq: 400, decay: 0.05 },
          { freq: 1130, decay: 0.03, gain: 0.5, bend: 30 },
        ],
        0.05,
      ),
    "bd76bb883dd0d809",
  ],
  ["pluck", () => pluck(330, 0.05, { seed: 2 }), "c0751b33adc596fb"],
  [
    "mixing",
    () =>
      fade(
        mix([
          fit(osc("sine", 300, 0.02), 0.03),
          { x: reversed(osc("saw", 500, 0.02)), at: 0.01, gain: 0.5 },
        ]),
        0.005,
        0.01,
      ),
    "44963888746fa47f",
  ],
  [
    "filter",
    () =>
      filter(noise("white", 0.05, 5), "bp", glide(500, 3000, 0.03, 0.05), 3),
    "86a90cb99cf8e784",
  ],
  [
    "shelf",
    () =>
      biquad(
        shelf(noise("white", 0.03, 8), "high", 2000, 6),
        [0.2, 0.4, 0.2, -0.5, 0.2],
      ),
    "91623df7d3388555",
  ],
  [
    "resonate",
    () =>
      resonate(
        fit(Float64Array.of(1), 0.05),
        [
          { freq: 700, decay: 0.03 },
          { freq: 1900, decay: 0.02, gain: 0.5 },
        ],
        0.01,
      ),
    "23e873c3a0b19982",
  ],
  [
    "comb",
    () =>
      comb(osc("saw", 220, 0.05), 0.004, 0.6, {
        damp: 0.3,
        tail: 0.01,
        mix: 0.5,
      }),
    "50b55d902b02f60e",
  ],
  [
    "shaped",
    () => crush(fold(drive(osc("saw", 220, 0.05), 3), 1.5), 3, 8),
    "95be8212d137e242",
  ],
  [
    "echo",
    () => echo(osc("saw", 220, 0.05), { time: 0.01 }),
    "f8b46d35f82d120f",
  ],
  [
    "reverb",
    () => reverb(osc("saw", 220, 0.05), { decay: 0.2 }),
    "ff1a000a76cd0380",
  ],
  [
    "stereo",
    () => reverbStereo(osc("saw", 220, 0.05), { decay: 0.2 })[1],
    "a4b18a30bb875aa1",
  ],
  [
    "dynamics",
    () =>
      centered(
        normalize(limit(compress(gain(osc("saw", 220, 0.05), 3)), -3), -6),
      ),
    "aeb67f2eb4747ac9",
  ],
  ["resample", () => resample(osc("saw", 220, 0.05), 1.37), "fcc9f4f5f1b6577d"],
  [
    "scatter",
    () =>
      scatter({
        count: 5,
        seconds: 0.05,
        seed: 9,
        grain: (_i, random) => osc("sine", 1000 + 2000 * random(), 0.005),
        level: (share) => 1 - share,
      }),
    "89050e1473bf8e32",
  ],
  [
    "looped",
    () => looped(noise("white", 0.08, 6), 0.05, 0.02),
    "f7ba8db753805493",
  ],
  ["crack", () => crack({ seed: 1 }), "bd535dee0563b2c0"],
  [
    "knock",
    () => knock({ freq: 345, decay: 0.1, seed: 1 }),
    "7f88a19815adc0c5",
  ],
  [
    "thump",
    () => thump({ from: 400, to: 100, over: 0.1, decay: 0.2 }),
    "138a299c0317d9d7",
  ],
  [
    "grit",
    () => grit({ seconds: 0.1, seed: 1, low: 1000, high: 5000 }),
    "9c8bec99ff797702",
  ],
  [
    "rubble",
    () => rubble({ count: 8, seconds: 0.1, seed: 1, low: 1000, high: 5000 }),
    "a0cafcc3acd4f647",
  ],
  [
    "slivers",
    () => slivers({ count: 8, seconds: 0.1, seed: 1, low: 3000, high: 6000 }),
    "c3ba20574b5856b6",
  ],
  [
    "crackle",
    () => crackle({ count: 10, seconds: 0.1, seed: 1 }),
    "ed51967a7d333903",
  ],
  ["clank", () => clank({ freq: 800, ring: 0.1, seed: 1 }), "e3a82b8b9bc8d9b2"],
  [
    "sing",
    () =>
      sing({
        seconds: 0.1,
        pitch: [
          [0, 500],
          [1, 700],
        ],
        mouth: [
          [0, "oo"],
          [1, "ee"],
        ],
        seed: 3,
        wobble: { from: 0.3, rate: 6, cents: 40 },
      }),
    "a298af0f9c20b72b",
  ],
  [
    "wav",
    () => wav([osc("saw", 220, 0.01), osc("sine", 440, 0.01)], 9),
    "4a2bd3dd6670b093",
  ],
];

/** Returns the first 16 hex digits of the SHA-256 of samples' or a file's bytes. */
function digestOf(x: Float64Array | Buffer): string {
  return createHash("sha256")
    .update(new Uint8Array(x.buffer, x.byteOffset, x.byteLength))
    .digest("hex")
    .slice(0, 16);
}

describe("the synth", () => {
  it.each(KIT)(
    "renders %s as the kit did, byte for byte",
    (_name, call, digest) => {
      expect(digestOf(call())).toBe(digest);
    },
  );
});
