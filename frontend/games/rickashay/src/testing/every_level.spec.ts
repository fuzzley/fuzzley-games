import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Aim } from "@fz/brick-wall/rules/aims";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS, LEVEL_SETS } from "../rules/levels/levels";
import {
  CERTIFICATES,
  CHECK_SPECS,
  FLOOR_SPECS,
  MARKS,
  RALLY_LINES,
  type RallyFiles,
  blindProblem,
  certificateOf,
  rallyLineProblem,
  rallyMarkProblem,
  sweetSpotProblem,
} from "./every_level";
import {
  CARELESS_FLOORS,
  type RoundPlay,
  levelPlayOf,
  linePlayOf,
} from "./line_play";

/** Returns the files in a folder of `src/rules/levels/`. */
function filesIn(folder: string): Set<string> {
  return new Set(
    readdirSync(join(import.meta.dirname, "../rules/levels", folder)),
  );
}

/** Returns the spec files of every set on some depths, `<set>_<depth>.spec.ts`. */
function setFilesOn(depths: readonly number[]): Set<string> {
  return new Set(
    LEVEL_SETS.flatMap(({ id }) =>
      depths.map((depth) => `${id}_${String(depth)}.spec.ts`),
    ),
  );
}

/** Returns how the game plays a level of a wall drawn as a picture on a field 11 deep. */
function playOf(picture: readonly string[]): RoundPlay {
  return linePlayOf(wallFrom(picture, WALL_LEGEND), 11);
}

/**
 * A level of a row of plain bricks: its first round rallies 1 whatever
 * the aim, and after aim 0 its second rallies 1 at aim 0, 3 at 206, 4 at
 * 230 and 5 at 210; aims drawn blind clear it 15 times in 100 from seed
 * 1000.
 */
const A_ROW = playOf(["ooooooooo"]);

/** A level of steel alone, which needs nothing broken, so every aim drawn blind clears it. */
const STEEL = playOf(["#........"]);

/** A level of a plain brick, which no flight rallies 8 against. */
const ONE_BRICK = playOf(["o........"]);

/** A made-up level of the first set, number 1, as the checks name it. */
const MADE_UP = {
  number: 1,
  set: { id: "warm-up" },
  data: { id: "a-row", name: "A row" },
};

/** Returns the made-up level's rally mark and its line on a field 11 deep, as their files keep them. */
function rallyFiles(mark: number, line: readonly Aim[]): RallyFiles {
  return {
    marks: { rally: { "a-row": { "11": mark } } },
    lines: { "warm-up": { "a-row": { "11": line } } },
  };
}

/** Games of {@link A_ROW} as their lines alone, whose best rallies are 1, 3, 4 and 5: they set a mark of 4, reached by aims 0 and 230. */
const GAMES = [
  { line: [0, 0] },
  { line: [0, 206] },
  { line: [0, 230] },
  { line: [0, 210] },
];

/** What a failed check of a line or a mark says to do. */
const AGAIN = "run `yarn certify:levels` to find them again.";

// Vitest plays the specs of a file one after another, so the specs that
// replay the certificates, hold the floors and run the checks keep a file
// for each depth, and for each set and depth, which it plays side by side.
describe("the sim specs of the levels", () => {
  it("keep a file in every_level for each depth, and only those", () => {
    expect(filesIn("every_level")).toEqual(
      new Set(DEPTHS.map((depth) => `${String(depth)}.spec.ts`)),
    );
  });

  it("keep a file in every_floor for each set on 11, 13 and 22 deep, and only those", () => {
    expect(filesIn("every_floor")).toEqual(setFilesOn([11, 13, 22]));
  });

  it("keep a file in every_check for each set on the depth it is checked on, and only those", () => {
    expect(filesIn("every_check")).toEqual(
      new Set(CHECK_SPECS.map(({ name }) => `${name}.spec.ts`)),
    );
  });

  it("check every set the game plays, each once", () => {
    expect(CHECK_SPECS.map(({ setId }) => setId)).toEqual(
      LEVEL_SETS.map(({ id }) => id),
    );
  });

  it("name each floor's and each check's spec for its set and depth", () => {
    expect([FLOOR_SPECS[1], CHECK_SPECS[0]]).toEqual([
      { name: "warm-up_13", setId: "warm-up", depth: 13 },
      { name: "warm-up_18", setId: "warm-up", depth: 18 },
    ]);
  });
});

describe("what the sim specs hold the levels to", () => {
  it("holds every set's certificates and rally lines, by its id", () => {
    const sets = LEVEL_SETS.map(({ id }) => id);

    expect([Object.keys(CERTIFICATES), Object.keys(RALLY_LINES)]).toEqual([
      sets,
      sets,
    ]);
  });

  it("holds every level's par and rally mark", () => {
    const ids = LEVELS.map(({ data }) => data.id).sort();

    expect([
      Object.keys(MARKS.par).sort(),
      Object.keys(MARKS.rally).sort(),
    ]).toEqual([ids, ids]);
  });

  it("holds every set the game plays to its floor, as the design sets them", () => {
    expect([
      LEVEL_SETS.every(({ id }) => Object.hasOwn(CARELESS_FLOORS, id)),
      CARELESS_FLOORS,
    ]).toEqual([
      true,
      { "warm-up": 90, angles: 85, tricks: 80, "long-rallies": 50 },
    ]);
  });
});

describe("certificateOf", () => {
  const [entry] = LEVELS;
  const id = entry!.data.id;

  it("reads a level's line on a depth as aims", () => {
    const certificates = { "warm-up": { [id]: { "11": [212, 4] } } };

    expect(certificateOf(entry!, 11, certificates)).toEqual([212, 4]);
  });

  it("gives none for a depth its set's file lacks", () => {
    const certificates = { "warm-up": { [id]: { "11": [212] } } };

    expect(certificateOf(entry!, 12, certificates)).toBeNull();
  });

  it("reads the game's certificates by default", () => {
    expect(certificateOf(entry!, 11)).toEqual(
      CERTIFICATES["warm-up"]?.[id]?.["11"],
    );
  });

  it.each([[657], [-1], [1.5], ["3"], [[3, 0]]])(
    "throws for a shot of %j, which isn't an aim's index",
    (shot) => {
      const certificates = { "warm-up": { [id]: { "11": [shot] } } };

      expect(() => certificateOf(entry!, 11, certificates)).toThrow(
        `A line's shot is an aim's index, from 0 to 656, not ${JSON.stringify(shot)}.`,
      );
    },
  );
});

describe("rallyLineProblem", () => {
  it("finds none in a line whose last round rallies the mark or more", () => {
    expect([
      rallyLineProblem(rallyFiles(5, [0, 210]), MADE_UP, A_ROW),
      rallyLineProblem(rallyFiles(4, [0, 210]), MADE_UP, A_ROW),
    ]).toEqual([null, null]);
  });

  it("says a line's last round falls short of its mark", () => {
    expect(rallyLineProblem(rallyFiles(6, [0, 210]), MADE_UP, A_ROW)).toBe(
      `The rally line of level "a-row" on a field 11 deep, of 2 shots, rallied 5 at its last round, short of its mark of 6: ${AGAIN}`,
    );
  });

  it("says a line's level ended before its last shot", () => {
    expect(
      rallyLineProblem(rallyFiles(3, [0, 212, 24, 4]), MADE_UP, A_ROW),
    ).toBe(
      `The rally line of level "a-row" on a field 11 deep, of 4 shots, ended the level after 3 rounds, before its last shot: ${AGAIN}`,
    );
  });

  it("says a level has no rally line, or no rally mark, on the depth", () => {
    const noLine = { ...rallyFiles(5, [0]), lines: {} };
    const noMark = { ...rallyFiles(5, [0]), marks: { rally: {} } };

    expect([
      rallyLineProblem(noLine, MADE_UP, A_ROW),
      rallyLineProblem(noMark, MADE_UP, A_ROW),
    ]).toEqual([
      `The level "a-row" on a field 11 deep has no rally line: ${AGAIN}`,
      `The level "a-row" on a field 11 deep has no rally mark: ${AGAIN}`,
    ]);
  });
});

describe("rallyMarkProblem", () => {
  it("finds none where the mark and its line are those the games set", () => {
    expect(
      rallyMarkProblem(rallyFiles(4, [0, 230]), MADE_UP, A_ROW, GAMES),
    ).toBeNull();
  });

  it.each([
    [5, [0, 230], "5 reached by [0,230]"],
    [4, [0, 210], "4 reached by [0,210]"],
    [4, [0, 230, 0], "4 reached by [0,230,0]"],
  ])(
    "says a kept mark of %i reached by %j isn't the one the games set",
    (mark, line, kept) => {
      expect(
        rallyMarkProblem(rallyFiles(mark, line), MADE_UP, A_ROW, GAMES),
      ).toBe(
        `The level "a-row" on a field 11 deep keeps a rally mark of ${kept}, where its floor games set 4 reached by [0,230]: ${AGAIN}`,
      );
    },
  );

  it("says a level keeps no mark and no line where the games set one", () => {
    const none: RallyFiles = { marks: { rally: {} }, lines: {} };

    expect(rallyMarkProblem(none, MADE_UP, A_ROW, GAMES)).toBe(
      `The level "a-row" on a field 11 deep keeps no rally mark and line, where its floor games set 4 reached by [0,230]: ${AGAIN}`,
    );
  });
});

describe("blindProblem", () => {
  it("finds none in a level aims drawn blind clear 75 times in 100 or fewer, from its own seeds", () => {
    expect(blindProblem(MADE_UP, A_ROW)).toBeNull();
  });

  it("says a level aims drawn blind clear more often plays itself", () => {
    expect(blindProblem(MADE_UP, STEEL)).toBe(
      'Aims drawn blind cleared level "a-row" on a field 11 deep 100 times in 100, more than 75: redraw it, and `yarn report:levels` shows it on every depth.',
    );
  });
});

describe("sweetSpotProblem", () => {
  it("finds none in a level whose sweet spot is 0.75° or more", () => {
    const [entry] = LEVELS;

    expect(sweetSpotProblem(entry!, levelPlayOf(entry!, 11))).toBeNull();
  });

  it("says a level's sweet spot is too narrow", () => {
    expect(sweetSpotProblem(MADE_UP, ONE_BRICK)).toBe(
      'The sweet spot of level "a-row" on a field 11 deep is 0.00°, under 0.75°: redraw it, and `yarn report:levels` shows it on every depth.',
    );
  });
});
