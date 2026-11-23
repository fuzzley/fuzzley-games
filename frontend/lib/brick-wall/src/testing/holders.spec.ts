import { SEED_STRIDE as REPORT_STRIDE } from "@fz/dev/report";
import { playCarelessly } from "./careless";
import {
  type CertifiedLevels,
  type FlooredLevels,
  type HeldLevel,
  SEED_STRIDE,
  certificateOf,
  certificateProblem,
  floorGames,
  floorSpecsOf,
  holdEveryCertificate,
  holdEveryFloor,
} from "./holders";
import {
  type MadeUpKind,
  type MadeUpStart,
  madeUpPlay,
  readMadeUpShot,
} from "./made_up/wall";

/** Describes a level of the made-up game: its wall's picture beside what the holders name. */
interface MadeUpLevel extends HeldLevel {
  readonly picture: readonly string[];
}

/** A made-up level of two bricks of clay, which aims 0 and 4 clear. */
const PAIR: MadeUpLevel = {
  number: 1,
  set: { id: "clay" },
  data: { id: "pair", name: "A pair" },
  picture: ["1...1...."],
};

/** A made-up level of a brick of clay, which aim 0 clears. */
const CORNER: MadeUpLevel = {
  number: 2,
  set: { id: "clay" },
  data: { id: "corner", name: "A corner" },
  picture: ["1........"],
};

/** A made-up level of two bricks of clay under moss, in a set of its own. */
const MOSS_FIRST: MadeUpLevel = {
  number: 3,
  set: { id: "moss" },
  data: { id: "moss-first", name: "Moss first" },
  picture: ["........m", "........m", "1...1...m"],
};

/** A made-up level of a brick of clay that never breaks, which no line clears, in a set of its own. */
const STONE: MadeUpLevel = {
  number: 4,
  set: { id: "stone" },
  data: { id: "stone", name: "Stone" },
  picture: ["#........"],
};

/** The made-up levels with certificates, in the order played: two in a set of clay, and one in a set of moss. */
const LEVELS: readonly MadeUpLevel[] = [PAIR, CORNER, MOSS_FIRST];

/** The made-up game's certificates on a field 11 deep, each shot an aim alone. */
const CERTIFICATES = {
  clay: { pair: { "11": [0, 4] }, corner: { "11": [0] } },
  moss: { "moss-first": { "11": [0, 4] } },
};

/** Returns how a made-up level plays on a field of a depth. */
function linePlayOf(entry: MadeUpLevel, depth: number) {
  return madeUpPlay(entry.picture, depth);
}

/** The made-up levels as their certificates are replayed: each par a round past its certificate's rounds. */
const CERTIFIED: CertifiedLevels<MadeUpLevel, MadeUpKind, MadeUpStart, number> =
  {
    levels: LEVELS,
    certificates: CERTIFICATES,
    readShot: readMadeUpShot,
    linePlayOf,
    parOf: (entry) => (entry === CORNER ? 2 : 3),
    parFrom: (rounds) => rounds + 1,
  };

/**
 * The made-up levels as the careless player is held to their floors, on
 * fields 11 and 22 deep: every game of every level but the stone's, which
 * it clears in 20 games of 20 but for Moss first on 11 deep, in 19.
 */
const FLOORED: FlooredLevels<MadeUpLevel, MadeUpKind, MadeUpStart, number> = {
  levels: [...LEVELS, STONE],
  floors: { clay: 100, moss: 100, stone: 0 },
  depths: [11, 22],
  linePlayOf,
  timeoutMs: 5000,
};

// The holders hold the made-up levels as a game's spec files would have
// them, each test they register passing where the levels hold, and failing
// where they don't.
holdEveryCertificate("/made/up/every_level/11.spec.ts", CERTIFIED);
holdEveryFloor("/made/up/every_floor/moss_22.spec.ts", FLOORED);

describe(
  "where no level has a certificate on the depth",
  { fails: true },
  () => {
    holdEveryCertificate("/made/up/every_level/12.spec.ts", CERTIFIED);
  },
);

describe(
  "where the careless player clears a level under its set's floor",
  { fails: true },
  () => {
    holdEveryFloor("/made/up/every_floor/moss_11.spec.ts", FLOORED);
  },
);

describe("floorSpecsOf", () => {
  it("names a spec file for each set on each depth, the sets in the order played", () => {
    expect(floorSpecsOf(LEVELS, [11, 22])).toEqual([
      { name: "clay_11", setId: "clay", depth: 11 },
      { name: "clay_22", setId: "clay", depth: 22 },
      { name: "moss_11", setId: "moss", depth: 11 },
      { name: "moss_22", setId: "moss", depth: 22 },
    ]);
  });
});

describe("certificateOf", () => {
  it("reads a level's line on a depth through the certificates' codec", () => {
    expect(certificateOf(CERTIFIED, PAIR, 11)).toEqual([0, 4]);
  });

  it("gives none for a depth its set's certificates lack", () => {
    expect(certificateOf(CERTIFIED, PAIR, 12)).toBeNull();
  });

  it("throws what the codec throws for a shot it can't read", () => {
    const certificates = { clay: { pair: { "11": [[0, 4]] } } };

    expect(() =>
      certificateOf({ ...CERTIFIED, certificates }, PAIR, 11),
    ).toThrow(RangeError);
  });
});

describe("certificateProblem", () => {
  /** Returns the problem of the first made-up level's certificate on 11 deep, its line as given. */
  function problemOf(line: readonly number[]): string | null {
    const certificates = { clay: { pair: { "11": line } } };

    return certificateProblem({ ...CERTIFIED, certificates }, PAIR, 11);
  }

  it("finds none for a line that clears its level in its rounds, with a row to spare, at its par", () => {
    expect(certificateProblem(CERTIFIED, MOSS_FIRST, 11)).toBeNull();
  });

  it("says a level has no certificate on a depth", () => {
    expect(certificateProblem(CERTIFIED, PAIR, 12)).toBe(
      'Level "pair" has no certificate on a field 12 deep: run `yarn certify:levels` to find the lines again.',
    );
  });

  it.each([
    [
      "doesn't clear its level",
      [0, 8],
      "didn't clear it in 2 rounds, its needed bricks down to row 3",
    ],
    [
      "clears it before its last shot",
      [0, 4, 8],
      "cleared it in 2 rounds, its needed bricks down to row 4",
    ],
  ])("says how a line that %s played", (_, line, played) => {
    expect(problemOf(line)).toBe(
      `Level "pair"'s certificate on a field 11 deep, of ${String(line.length)} shots, ${played}: run \`yarn certify:levels\` to find the lines again.`,
    );
  });

  it("says how a line that brings a brick its level needs into the danger row played", () => {
    const certificates = {
      clay: { pair: { "11": [8, 8, 8, 0, 4] } },
    };

    expect(
      certificateProblem({ ...CERTIFIED, certificates }, PAIR, 11),
    ).toContain("cleared it in 5 rounds, its needed bricks down to row 1");
  });

  it("says a level's par isn't the one its certificate earns", () => {
    expect(certificateProblem({ ...CERTIFIED, parOf: () => 4 }, PAIR, 11)).toBe(
      'Level "pair"\'s par on a field 11 deep is 4, where its certificate of 2 shots earns 3: run `yarn certify:levels` to find the lines again.',
    );
  });
});

describe("floorGames", () => {
  it("plays a level's games from seeds of its own a thousand apart, as a report numbers them", () => {
    const play = madeUpPlay(CORNER.picture, 11);

    const games = floorGames(linePlayOf, CORNER, 11);

    expect(games).toEqual(
      Array.from({ length: 20 }, (_, game) =>
        playCarelessly(play, 2000 + game),
      ),
    );
  });
});

describe("SEED_STRIDE", () => {
  it("numbers the floors' games as @fz/dev/report numbers a report's", () => {
    expect(SEED_STRIDE).toBe(REPORT_STRIDE);
  });
});

describe("holdEveryCertificate", () => {
  it("throws for a spec file named for no depth in every_level", () => {
    expect(() => {
      holdEveryCertificate("/made/up/every_level/23.spec.ts", CERTIFIED);
    }).toThrow("Expected a spec named for one of 11, 12");
  });
});

describe("holdEveryFloor", () => {
  it("throws for a spec file named for no set and depth in every_floor", () => {
    expect(() => {
      holdEveryFloor("/made/up/every_floor/clay_13.spec.ts", FLOORED);
    }).toThrow("Expected a spec named for one of clay_11, clay_22");
  });

  it("throws for a set with no floor", () => {
    expect(() => {
      holdEveryFloor("/made/up/every_floor/moss_11.spec.ts", {
        ...FLOORED,
        floors: { clay: 100 },
      });
    }).toThrow('The set "moss" has no floor.');
  });
});
