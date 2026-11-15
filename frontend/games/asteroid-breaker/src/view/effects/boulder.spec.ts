import { ART_PALETTE } from "../../testing/art_frames";
import { ROLES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { ROCK_OUTLINES } from "../../rules/rocks/rocks";
import { rockShape } from "../art/rock_art";
import { reachAt } from "../art/rocks/space";
import {
  BOULDER_CRACKS,
  CRACK_LINES,
  CRACK_REACH,
  type CrackLine,
  boulderGlowAt,
  boulderInks,
  boulderShows,
  crackFade,
  crackFlare,
  crackLineAlpha,
  cracksOf,
  thrownReach,
  thrownShare,
} from "./boulder";
import { BOULDER_HOLD_MS, BOULDER_THROW_MS } from "./timing";

/** A dark palette. */
const DARK = beltPalette(ROLES, "dark");

/** Returns the line of a boulder's cracks in a tone. */
function lineOf(tone: CrackLine["tone"]): CrackLine {
  const line = CRACK_LINES.find((each) => each.tone === tone);
  if (line === undefined) throw new Error(`No line in ${tone}`);
  return line;
}

/** Returns a record a boulder's glow is written into. */
function glow(): { reach: number; strength: number } {
  return { reach: 0, strength: 0 };
}

describe("boulderInks", () => {
  it("glows in the warning color on a light field, its hot line the core toward the volatile rock's ink", () => {
    expect(boulderInks(ART_PALETTE)).toEqual({
      glow: ART_PALETTE.flame,
      core: ART_PALETTE.core,
      hot: mixTone(ART_PALETTE.core, ART_PALETTE.rocks.volatile, 0.35),
    });
  });

  it("glows in the core on a dark field, its hot line the core toward white", () => {
    expect(boulderInks(DARK)).toEqual({
      glow: DARK.core,
      core: DARK.core,
      hot: mixTone(DARK.core, 0xffffff, 0.55),
    });
  });
});

describe("cracksOf", () => {
  it("splits a boulder along three cracks, one for each large rock it breaks into", () => {
    expect(cracksOf(1)).toHaveLength(BOULDER_CRACKS);
  });

  it("runs each crack from near its middle to its reach", () => {
    const ends = cracksOf(5).map((crack) => [crack[0], crack.at(-1)]);

    expect(
      ends.map(([start, end]) => [
        start !== undefined && Math.hypot(start.x, start.y) < 0.15,
        end !== undefined && Math.hypot(end.x, end.y),
      ]),
    ).toEqual([
      [true, expect.closeTo(CRACK_REACH, 9)],
      [true, expect.closeTo(CRACK_REACH, 9)],
      [true, expect.closeTo(CRACK_REACH, 9)],
    ]);
  });

  it.each([...Array(ROCK_OUTLINES).keys()])(
    "runs no crack past the rim of a boulder of outline %d, every way",
    (outline) => {
      const shape = rockShape({ kind: "boulder", size: "boulder", outline });
      const ways = Array.from({ length: 72 }, (_, i) => (i / 72) * 2 * Math.PI);

      expect(
        Math.min(...ways.map((way) => reachAt(shape.outline, way))),
      ).toBeGreaterThanOrEqual(CRACK_REACH);
    },
  );

  it("runs the cracks most of the way to the rim", () => {
    expect(CRACK_REACH).toBeGreaterThan(0.6);
  });

  it("splits boulders in a row apart, the shapes coming round again", () => {
    expect({
      apart: cracksOf(1) !== cracksOf(2),
      again: cracksOf(1) === cracksOf(9),
    }).toEqual({ apart: true, again: true });
  });
});

describe("crackFlare and crackFade", () => {
  it("runs the cracks out to the rim while the field holds still, fast then slowing", () => {
    expect([
      crackFlare(0),
      crackFlare(BOULDER_HOLD_MS / 4) > 0.5,
      crackFlare(BOULDER_HOLD_MS),
    ]).toEqual([0, true, 1]);
  });

  it("shows the cracks whole while the field holds still, and fades them once it moves on", () => {
    expect([
      crackFade(BOULDER_HOLD_MS),
      crackFade(BOULDER_HOLD_MS + 1000),
    ]).toEqual([1, 0]);
  });
});

describe("crackLineAlpha", () => {
  it("shows no line before the boulder breaks", () => {
    expect(CRACK_LINES.map((line) => crackLineAlpha(line, -1))).toEqual([
      0, 0, 0,
    ]);
  });

  it("flares the soft line in as the cracks run, and shows the others whole", () => {
    expect([
      crackLineAlpha(lineOf("glow"), 0),
      crackLineAlpha(lineOf("core"), 0),
      crackLineAlpha(lineOf("hot"), 0),
    ]).toEqual([0, lineOf("core").alpha, lineOf("hot").alpha]);
  });

  it("shows the soft line whole once the cracks reach the rim", () => {
    expect(crackLineAlpha(lineOf("glow"), BOULDER_HOLD_MS)).toBe(
      lineOf("glow").alpha,
    );
  });
});

describe("boulderGlowAt", () => {
  it("grows the glow from nothing as the cracks run", () => {
    expect([
      boulderGlowAt(0, glow()),
      boulderGlowAt(BOULDER_HOLD_MS - 1, glow()).strength > 0.7,
    ]).toEqual([{ reach: 0.5, strength: 0 }, true]);
  });

  it("widens the glow as the boulder comes apart, and fades it", () => {
    expect([
      boulderGlowAt(BOULDER_HOLD_MS, glow()),
      boulderGlowAt(BOULDER_HOLD_MS + 1000, glow()),
    ]).toEqual([
      { reach: 1.6, strength: 0.9 },
      { reach: 1.6, strength: 0 },
    ]);
  });

  it("writes the glow into the record it is given", () => {
    const into = glow();

    expect(boulderGlowAt(0, into)).toBe(into);
  });
});

describe("thrownShare and thrownReach", () => {
  it.each([
    [BOULDER_HOLD_MS - 1, null],
    [BOULDER_HOLD_MS, 0],
    [BOULDER_HOLD_MS + BOULDER_THROW_MS / 2, 0.5],
    [BOULDER_HOLD_MS + BOULDER_THROW_MS, null],
  ])("throws the ring %d ms after the break: %s", (sinceMs, share) => {
    expect(thrownShare(sinceMs)).toBe(share);
  });

  it("throws the ring from the boulder's rim out past twice its radius", () => {
    expect([thrownReach(0), thrownReach(1)]).toEqual([
      1,
      expect.closeTo(2.1, 9),
    ]);
  });
});

describe("boulderShows", () => {
  it.each([
    [-1, false],
    [0, true],
    [BOULDER_HOLD_MS + BOULDER_THROW_MS - 1, true],
    [BOULDER_HOLD_MS + BOULDER_THROW_MS, false],
  ])("shows a boulder's break %d ms after it: %s", (sinceMs, shows) => {
    expect(boulderShows(sinceMs)).toBe(shows);
  });
});
