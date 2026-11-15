import { ART_PALETTE } from "../../testing/art_frames";
import { ROLES } from "../../testing/roles";
import { energyOf } from "../art/energy";
import { beltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import {
  BLAST_EMBERS,
  BLAST_LINES,
  type BlastLine,
  EMBER_SHAPES,
  EMBER_TONES,
  blastBand,
  blastDiscAt,
  blastFlashed,
  blastInks,
  blastLightShare,
  blastLineAlpha,
  blastRingAt,
  blastShows,
  blastSwept,
  emberAt,
  embersOf,
  sweptAlpha,
} from "./blast";
import { BLAST_FLASH_MS, BLAST_MS, BLAST_RING_MS } from "./timing";

/** A dark palette. */
const DARK = beltPalette(ROLES, "dark");

/** Returns a record an ember is written into. */
function shown(): {
  head: number;
  tail: number;
  size: number;
  alpha: number;
  tone: number;
} {
  return { head: 0, tail: 0, size: 0, alpha: 0, tone: 0 };
}

/** Returns where each of a blast's embers is, a time after it went off, or null for those not flying. */
function embersAt(
  serial: number,
  sinceMs: number,
  radius = 1,
  reach = 4,
): readonly ({ readonly head: number } | null)[] {
  return embersOf(serial).map((ember) => {
    const at = emberAt(ember, sinceMs, radius, reach, shown());
    return at && { head: at.head };
  });
}

describe("blastInks", () => {
  it("draws a blast in a light palette with its ring in the volatile rock's ink, its light the ink, and its hot edge the core toward it", () => {
    const { ink, soft, hot } = blastInks(ART_PALETTE);

    expect({ ink, soft, hot }).toEqual({
      ink: ART_PALETTE.rocks.volatile,
      soft: ART_PALETTE.rocks.volatile,
      hot: mixTone(ART_PALETTE.core, ART_PALETTE.rocks.volatile, 0.3),
    });
  });

  it("draws a blast in a dark palette with its light the ink toward the core, and its hot edge the core toward white", () => {
    const { soft, hot } = blastInks(DARK);

    expect({ soft, hot }).toEqual({
      soft: mixTone(DARK.rocks.volatile, DARK.core, 0.3),
      hot: mixTone(DARK.core, 0xffffff, 0.6),
    });
  });

  it("throws embers in the warning color's energy, their heads from its hot middle to its body", () => {
    const { hot, body } = energyOf(DARK.flame, DARK);

    const { ember, emberHeads } = blastInks(DARK);

    expect({
      ember,
      first: emberHeads[0],
      last: emberHeads.at(-1),
      tones: emberHeads.length,
    }).toEqual({ ember: body, first: hot, last: body, tones: EMBER_TONES });
  });
});

describe("blastRingAt", () => {
  it("starts the ring just inside its rock", () => {
    expect(blastRingAt(0, 2, 6)).toBeCloseTo(1.8, 9);
  });

  it("sweeps the ring out to its reach, and no farther", () => {
    expect([
      blastRingAt(BLAST_RING_MS, 2, 6),
      blastRingAt(BLAST_MS, 2, 6),
    ]).toEqual([6, 6]);
  });

  it("sweeps the ring out fast, then slowing: past halfway a quarter through", () => {
    expect(blastRingAt(BLAST_RING_MS / 4, 0, 6)).toBeGreaterThan(3);
  });
});

describe("blastSwept and blastBand", () => {
  it("draws the ring's band wide as it starts and thin once it has swept out", () => {
    expect([
      blastBand(blastSwept(0)),
      blastBand(blastSwept(BLAST_RING_MS)),
    ]).toEqual([0.75, expect.closeTo(0.16, 9)]);
  });
});

describe("blastFlashed", () => {
  it("fades the flash from all of it to none over its time", () => {
    expect([blastFlashed(0), blastFlashed(BLAST_FLASH_MS)]).toEqual([0, 1]);
  });
});

describe("blastLineAlpha", () => {
  /** Returns the ring's line of a tone, outermost first. */
  function lineOf(tone: BlastLine["tone"]): BlastLine {
    const line = BLAST_LINES.find((each) => each.tone === tone);
    if (line === undefined) throw new Error(`No line in ${tone}`);
    return line;
  }

  it("draws the ring's lines outside in: its soft bands, its middle, then its hot inner edge", () => {
    expect({
      tones: BLAST_LINES.map(({ tone }) => tone),
      outsideIn: BLAST_LINES.every(
        ({ out }, i) => i === 0 || out < (BLAST_LINES[i - 1]?.out ?? 0),
      ),
    }).toEqual({ tones: ["soft", "soft", "ink", "hot"], outsideIn: true });
  });

  it("shows each line whole as the ring starts, its soft bands fainter on a light field", () => {
    expect([
      blastLineAlpha(lineOf("soft"), 0, "dark"),
      blastLineAlpha(lineOf("soft"), 0, "light"),
      blastLineAlpha(lineOf("ink"), 0, "light"),
      blastLineAlpha(lineOf("hot"), 0, "light"),
    ]).toEqual([
      lineOf("soft").alpha,
      expect.closeTo(0.75 * lineOf("soft").alpha, 9),
      lineOf("ink").alpha,
      lineOf("hot").alpha,
    ]);
  });

  it("holds the ring's middle longer than its soft bands and its hot edge, which fade evenly", () => {
    expect([
      blastLineAlpha(lineOf("soft"), 0.5, "dark") / lineOf("soft").alpha,
      blastLineAlpha(lineOf("ink"), 0.5, "dark") / lineOf("ink").alpha,
      blastLineAlpha(lineOf("hot"), 0.5, "dark") / lineOf("hot").alpha,
    ]).toEqual([0.5, 0.75, 0.5]);
  });

  it("shows none of them once the ring has swept out", () => {
    expect(BLAST_LINES.map((line) => blastLineAlpha(line, 1, "dark"))).toEqual([
      0, 0, 0, 0,
    ]);
  });
});

describe("sweptAlpha", () => {
  it("lights the ground the ring has swept faintly, fading to nothing as it sweeps out", () => {
    expect([sweptAlpha(0), sweptAlpha(1)]).toEqual([0.08, 0]);
  });
});

describe("blastDiscAt", () => {
  it("shows the flash's disc a little past its rock, nearly opaque, as the blast goes off", () => {
    expect(blastDiscAt(0, { reach: 0, alpha: 0 })).toEqual({
      reach: 1.25,
      alpha: 0.95,
    });
  });

  it("grows the disc and fades it as the flash fades", () => {
    const disc = blastDiscAt(BLAST_FLASH_MS / 2, { reach: 0, alpha: 0 });

    expect([disc?.reach, disc?.alpha]).toEqual([
      expect.closeTo(1.675, 9),
      expect.closeTo(0.95 * 0.5 ** 1.5, 9),
    ]);
  });

  it("shows no disc once the flash has faded", () => {
    expect(blastDiscAt(BLAST_FLASH_MS, { reach: 0, alpha: 0 })).toBeNull();
  });

  it("writes the disc into the record it is given", () => {
    const into = { reach: 0, alpha: 0 };

    expect(blastDiscAt(0, into)).toBe(into);
  });
});

describe("blastShows", () => {
  it.each([
    [-1, false],
    [0, true],
    [BLAST_MS - 1, true],
    [BLAST_MS, false],
  ])("shows a blast %d ms after it went off: %s", (sinceMs, shows) => {
    expect(blastShows(sinceMs)).toBe(shows);
  });
});

describe("blastLightShare", () => {
  it("lights the rocks wholly as the blast goes off, and not at all once its ring has swept out", () => {
    expect([blastLightShare(0), blastLightShare(1)]).toEqual([1, 0]);
  });
});

describe("embersOf", () => {
  it("throws a dozen embers", () => {
    expect(embersOf(1)).toHaveLength(BLAST_EMBERS);
  });

  it("throws the shape its serial picks, so blasts in a row throw theirs apart", () => {
    expect({
      apart: embersOf(1) !== embersOf(2),
      again: embersOf(1) === embersOf(1 + EMBER_SHAPES),
    }).toEqual({ apart: true, again: true });
  });

  it("throws them all round, one in each twelfth of a turn", () => {
    const twelfths = embersOf(3).map(({ angle }) =>
      Math.round((angle / (2 * Math.PI)) * BLAST_EMBERS),
    );

    expect(twelfths).toEqual([...Array(BLAST_EMBERS).keys()]);
  });
});

describe("emberAt", () => {
  it("throws no ember before it starts", () => {
    expect(embersAt(1, -1).every((at) => at === null)).toBe(true);
  });

  it("throws each from inside its rock, out to near its blast's reach and a little past it at most", () => {
    const heads = [10, 200, BLAST_MS - 50].flatMap((sinceMs) =>
      embersAt(1, sinceMs).flatMap((at) => (at ? [at.head] : [])),
    );

    expect({
      inside: Math.min(...heads) >= 0.5,
      within: Math.max(...heads) <= 1.05 * 4,
    }).toEqual({ inside: true, within: true });
  });

  it("puts every ember out within the blast's time", () => {
    expect(embersAt(1, BLAST_MS).every((at) => at === null)).toBe(true);
  });

  it("fades and shrinks an ember as it flies, through its tones", () => {
    const [ember] = embersOf(1);
    const early = ember && emberAt(ember, ember.delayMs, 1, 4, shown());
    const late =
      ember &&
      emberAt(ember, ember.delayMs + 0.9 * ember.lifeMs, 1, 4, shown());

    expect({
      early: early && [early.alpha, early.size, early.tone],
      fainter: late !== undefined && late !== null && late.alpha < 0.25,
      smaller: late !== undefined && late !== null && late.size < 0.08,
      tone: late?.tone,
    }).toEqual({
      early: [1, 0.13, 0],
      fainter: true,
      smaller: true,
      tone: EMBER_TONES - 1,
    });
  });

  it("writes the ember into the record it is given", () => {
    const [ember] = embersOf(1);
    const into = shown();

    expect(ember && emberAt(ember, ember.delayMs, 1, 4, into)).toBe(into);
  });
});
