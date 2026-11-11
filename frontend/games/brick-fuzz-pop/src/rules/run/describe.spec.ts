import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { wallFrom } from "../../testing/wall_picture";
import { LEVELS, levelEntryOf } from "../levels/levels";
import type { RoundOutcome, RoundStart } from "../round/round";
import {
  boonName,
  describeBoon,
  describeCleared,
  describeEnd,
  describeLevel,
  describePause,
  describeResume,
  describeRound,
  describeRows,
  describeShot,
  describeTakenUp,
  endTitle,
} from "./describe";
import type { Run } from "./run";

const { plain, punch, zap, cleared, lost } = FLIGHT_FIXTURES;

/** Zip line, level 6. */
const ZIP_LINE = levelEntryOf(LEVELS, 6);

/** Returns a run of the specs: on level 6, 7 rounds in, against a par of 9. */
function runOf(change: Partial<Run> = {}): Run {
  return {
    id: 1,
    lastLevel: LEVELS.length,
    firstLevel: 1,
    level: 6,
    depth: 11,
    par: 9,
    rounds: 7,
    jumps: 2,
    banked: 3000,
    stars: 10,
    score: 4210,
    ending: null,
    outcome: "playing",
    ...change,
  };
}

/** Returns where a round starts on a field 11 deep, its wall pictured, its lowest row standing in a field row. */
function startOf(picture: readonly string[], lowestRow: number): RoundStart {
  return {
    wall: wallFrom(picture, { lowestRow }),
    depth: 11,
    x: 4.5,
    crew: { friends: [] },
    boon: null,
  };
}

describe("boonName", () => {
  it("names each boon as a player calls it", () => {
    expect([boonName("hot"), boonName("triple")]).toEqual([
      "hot shot",
      "triple shot",
    ]);
  });
});

describe("describeBoon", () => {
  it("says what a jump earns", () => {
    expect(describeBoon("triple")).toBe(
      "Clear to the dashed line and the wall jumps: your next shot is a triple shot.",
    );
  });
});

describe("describeLevel", () => {
  it("says the level's number, its name and its boon", () => {
    expect(describeLevel(ZIP_LINE, "hot")).toBe(
      "Level 6, Zip line. Clear to the dashed line and the wall jumps: your next shot is a hot shot.",
    );
  });
});

describe("describeShot", () => {
  it.each([
    [216, 3, "62 degrees, charge 3"],
    [0, 0, "8 degrees, charge 0"],
    [1, 5, "8.25 degrees, charge 5"],
    [330, 1, "90.5 degrees, charge 1"],
    [656, 2, "172 degrees, charge 2"],
  ] as const)("says aim %i at charge %i as %s", (aim, charge, words) => {
    expect(describeShot({ aim, charge })).toBe(words);
  });

  it("says a hot shot rather than the charge, which it flies at full whatever was charged", () => {
    expect(describeShot({ aim: 216, charge: 0 }, "hot")).toBe(
      "62 degrees, hot shot",
    );
  });

  it("says the charge of a shot carrying a triple shot, whose fuzzballs fly at it", () => {
    expect(describeShot({ aim: 216, charge: 3 }, "triple")).toBe(
      "62 degrees, charge 3",
    );
  });
});

describe("describeRound", () => {
  it("says what a round broke, the wall's step, how far it stands from the floor and how far from a jump", () => {
    expect(describeRound(punch.round.outcome, punch.round.next)).toBe(
      "Broke 1. The wall came down 1 row: 5 rows from the floor, 10 bricks to a jump.",
    );
  });

  it("says a round that broke nothing broke none", () => {
    expect(describeRound(plain.round.outcome, plain.round.next)).toBe(
      "Broke none. The wall came down 1 row: 4 rows from the floor, 2 bricks to a jump.",
    );
  });

  it("says the wall's jump and the boon the next shot carries", () => {
    expect(describeRound(zap.round.outcome, zap.round.next)).toBe(
      "Broke 4. The lower two-thirds are clear. The wall jumped 3 rows. Next shot: hot shot.",
    );
  });

  it.each([
    [1, "Broke 1. Freed a friend. The wall came down"],
    [2, "Broke 1. Freed 2 friends. The wall came down"],
  ])("says %i friends freed", (freed, words) => {
    const outcome = { ...punch.round.outcome, freed };

    expect(describeRound(outcome, punch.round.next)).toMatch(words);
  });

  it("says the danger once a brick the level needs stands in the row over the floor's", () => {
    const next = startOf(["ooooooooo", "#.......o"], 1);
    const outcome: RoundOutcome = { ...punch.round.outcome, broken: 2 };

    expect(describeRound(outcome, next)).toBe(
      "Broke 2. The wall came down 1 row: 1 row from the floor, 10 bricks to a jump. Danger: the next step down loses the level.",
    );
  });

  it("says no danger while the bricks the level needs stand two rows from the floor", () => {
    const next = startOf(["ooooooooo"], 2);

    expect(describeRound(punch.round.outcome, next)).toBe(
      "Broke 1. The wall came down 1 row: 2 rows from the floor, 9 bricks to a jump.",
    );
  });

  it("counts no brick the level doesn't need from the floor or to a jump", () => {
    const next = startOf(["oo.......", ".........", "#########"], 2);

    expect(describeRound(punch.round.outcome, next)).toBe(
      "Broke 1. The wall came down 1 row: 4 rows from the floor, 2 bricks to a jump.",
    );
  });

  it("says only what a round that clears its level broke", () => {
    expect(describeRound(cleared.round.outcome, cleared.round.next)).toBe(
      "Broke 1.",
    );
  });

  it("says a brick reached the floor", () => {
    expect(describeRound(lost.round.outcome, lost.round.next)).toBe(
      "Broke none. A brick reached the floor.",
    );
  });
});

describe("describeRows", () => {
  it("reads the field's three lowest rows that hold a brick, from the floor, each brick's hits where it takes more than one", () => {
    const start = startOf(
      ["ooooooooo", "222222222", ".........", "o.......4", ".#......."],
      3,
    );

    expect(describeRows(start)).toBe(
      "Row 3: gap, steel brick, gap, gap, gap, gap, gap, gap, gap. " +
        "Row 4: brick, gap, gap, gap, gap, gap, gap, gap, tough brick, 4 hits. " +
        "Row 6: tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits, tough brick, 2 hits.",
    );
  });

  it("reads a tough brick's hits left", () => {
    expect(describeRows(plain.round.next)).toMatch(
      /^Row 4: brick, gap, gap, gap, gap, gap, gap, gap, tough brick, 1 hit\. /,
    );
  });

  it("reads fewer rows where fewer hold a brick", () => {
    expect(describeRows(cleared.round.next)).toBe(
      "Row 5: steel brick, gap, gap, gap, gap, gap, gap, gap, gap. Row 7: steel brick, steel brick, gap, gap, gap, gap, gap, steel brick, steel brick.",
    );
  });

  it("reads the floor's row, which a level lost leaves bricks in", () => {
    expect(describeRows(lost.round.next)).toMatch(
      /^Row 0: brick, brick, brick, gap, gap, gap, gap, gap, gap\. Row 4: /,
    );
  });

  it("reads no row waiting over the ceiling", () => {
    expect(describeRows(startOf(["ooooooooo"], 11))).toBe(
      "No bricks in the field.",
    );
  });
});

describe("describeCleared", () => {
  it("says the level cleared, its rounds against par, its stars and the score", () => {
    expect(describeCleared(runOf({ outcome: "cleared" }))).toBe(
      "Level 6 cleared in 7 rounds, par 9: 3 stars! Score 4,210.",
    );
  });

  it("says the last level cleared too", () => {
    const run = runOf({ level: 9, rounds: 1, par: 2, outcome: "won" });

    expect(describeCleared(run)).toBe(
      "Level 9 cleared in 1 round, par 2: 3 stars! Score 4,210.",
    );
  });

  it("says a single star", () => {
    expect(describeCleared(runOf({ rounds: 20, outcome: "cleared" }))).toBe(
      "Level 6 cleared in 20 rounds, par 9: 1 star! Score 4,210.",
    );
  });
});

describe("describePause", () => {
  it("says the score and how to go on", () => {
    expect(describePause(runOf({ outcome: "paused" }))).toBe(
      "Paused, with a score of 4,210. Press Enter to go on.",
    );
  });
});

describe("describeResume", () => {
  it("says the run goes on", () => {
    expect(describeResume()).toBe("Going on.");
  });
});

describe("describeTakenUp", () => {
  it("says where the run taken up stands", () => {
    expect(describeTakenUp(runOf({ outcome: "paused" }), ZIP_LINE)).toBe(
      "Your last run is paused on level 6, Zip line, 7 rounds in, with a score of 4,210. Press Enter to go on.",
    );
  });

  it("says nothing of rounds for a level with none played", () => {
    const run = runOf({ rounds: 0, outcome: "paused" });

    expect(describeTakenUp(run, ZIP_LINE)).toBe(
      "Your last run is paused on level 6, Zip line, with a score of 4,210. Press Enter to go on.",
    );
  });
});

describe("endTitle", () => {
  it("calls a run won every level cleared, and any other run over", () => {
    expect([
      endTitle({ outcome: "won" }),
      endTitle({ outcome: "over" }),
    ]).toEqual(["Every level cleared!", "Game over"]);
  });
});

describe("describeEnd", () => {
  it("says a run lost is over, its score and the level it reached", () => {
    expect(describeEnd(runOf({ outcome: "over" }), false)).toBe(
      "Game over. Score 4,210, at level 6.",
    );
  });

  it("says a run won and a new best", () => {
    expect(describeEnd(runOf({ level: 9, outcome: "won" }), true)).toBe(
      "Every level cleared! Score 4,210, at level 9. A new best!",
    );
  });
});
