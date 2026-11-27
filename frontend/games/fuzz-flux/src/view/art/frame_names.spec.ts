import { keysOf } from "@fz/core/records";
import { FUZZBALL_FACES } from "@fz/style/fuzzball";
import { BRICK_LAYERS } from "../../rules/catalog/elements";
import { KIND_IDS } from "../../rules/catalog/kinds";
import { FRAMES, FRAME_NAMES, FURS, LIFTS, TIMES } from "./frame_names";

/**
 * Each of `FRAMES`' names, by the pattern its frames' names keep, with how
 * many it has: a family's one for each of its builder's arguments, and a
 * frame alone one.
 */
const FAMILIES = {
  body: [/^body-/, KIND_IDS.length * FURS.length * LIFTS.length],
  frizzball: [/^frizzball$/, 1],
  frizzballSparks: [/^frizzball-sparks$/, 1],
  sleepyhead: [/^sleepyhead$/, 1],
  eyes: [/^eyes-/, FUZZBALL_FACES.length],
  frizzballEyes: [/^frizzball-eyes-/, FUZZBALL_FACES.length],
  square: [/^square$/, 1],
  // The dust a square shows, its 1 layer and its 2.
  dust: [/^dust-\d$/, 2],
  brick: [/^brick-\d$/, BRICK_LAYERS.length],
  cushion: [/^cushion-\d$/, BRICK_LAYERS.length],
  cushionTuft: [/^cushion-tuft-\d$/, BRICK_LAYERS.length],
  button: [/^button$/, 1],
  cage: [/^cage$/, 1],
  cageBar: [/^cage-bar$/, 1],
  burr: [/^burr$/, 1],
  tuft: [/^tuft-/, KIND_IDS.length],
  ring: [/^ring$/, 1],
  streak: [/^streak$/, 1],
  bolt: [/^bolt$/, 1],
  hand: [/^hand$/, 1],
  gustLine: [/^gust-line$/, 1],
  times: [/^times-\d$/, TIMES.length],
} as const satisfies Readonly<
  Record<keyof typeof FRAMES, readonly [RegExp, number]>
>;

describe("FRAME_NAMES", () => {
  it("names each frame once", () => {
    expect(new Set(FRAME_NAMES).size).toBe(FRAME_NAMES.length);
  });

  it.each(FRAME_NAMES)(
    "names %s in lower case, its words joined by hyphens",
    (name) => {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    },
  );

  it.each(keysOf(FAMILIES))("bakes each frame %s names", (family) => {
    const [pattern, count] = FAMILIES[family];

    expect(FRAME_NAMES.filter((name) => pattern.test(name))).toHaveLength(
      count,
    );
  });

  it("bakes the frames FRAMES names, and nothing else", () => {
    const named = Object.values(FAMILIES).reduce(
      (sum, [, count]) => sum + count,
      0,
    );

    expect(FRAME_NAMES).toHaveLength(named);
  });

  it("bakes the eyes in each of the house fuzzball's faces", () => {
    expect(FRAME_NAMES).toEqual(
      expect.arrayContaining(FUZZBALL_FACES.map((face) => FRAMES.eyes(face))),
    );
  });

  it("bakes a wave's mark for each count from 2 to 9", () => {
    expect(TIMES.map((times) => FRAMES.times(times))).toEqual([
      "times-2",
      "times-3",
      "times-4",
      "times-5",
      "times-6",
      "times-7",
      "times-8",
      "times-9",
    ]);
  });
});
