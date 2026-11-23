import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import {
  FLIGHT_FIXTURES,
  type FixtureName,
} from "../../testing/flight_fixtures";
import type { FlightEvent, RoundStart } from "../flight/events";
import { WALL_LEGEND } from "../levels/legend";
import { LEVELS, levelEntryOf } from "../levels/levels";
import { FLIGHT_RULES } from "../tuning";
import {
  describeAim,
  describeCleared,
  describeDanger,
  describeEarned,
  describeEnd,
  describeGuide,
  describeJump,
  describeLevel,
  describePause,
  describeResume,
  describeRound,
  describeRows,
  describeTakenUp,
  starLabel,
} from "./describe";

/** A level of par 9 cleared in 5 rounds, 1,640 points into its run. */
const RUN = { level: 2, rounds: 5, par: 9, score: 1640 } as const;

/** Returns where a round starts on a field 11 deep, its wall pictured, its lowest row standing in a field row. */
function startOf(picture: readonly string[], lowestRow = 1): RoundStart {
  return {
    wall: wallFrom(picture, WALL_LEGEND, { lowestRow }),
    depth: 11,
    x: 4.5,
    hot: false,
  };
}

/** Returns a round made by hand's first turns, as the guide would show them. */
function turnsOf(name: FixtureName, turns: number): FlightEvent[] {
  return FLIGHT_FIXTURES[name].round.flight.events
    .filter((event) => event.kind === "turn")
    .slice(0, turns);
}

/** Returns what G reads of a round made by hand's first turns, from where it starts. */
function guideOf(name: FixtureName, turns: number): string {
  const { shot, start } = FLIGHT_FIXTURES[name];
  return describeGuide(shot.aim, turnsOf(name, turns), start);
}

/** Returns a turn off a brick, made up, meeting the cells given. */
function turnMeeting(cells: readonly number[]): FlightEvent {
  return {
    at: 1,
    kind: "turn",
    x: 4,
    y: 3,
    dx: 1,
    dy: -1,
    off: "brick",
    cells,
  };
}

describe("describeAim", () => {
  it.each([
    [216, "62 degrees"],
    [0, "8 degrees"],
    [1, "8.25 degrees"],
    [330, "90.5 degrees"],
    [656, "172 degrees"],
  ])("says aim %i as %s", (aim, words) => {
    expect(describeAim(aim)).toBe(words);
  });
});

describe("describeGuide", () => {
  it("says the aim, then each turn the guide shows, a brick by its kind and its row with its hits", () => {
    expect(guideOf("plain", 3)).toBe(
      "45 degrees. The right wall, a tough brick in row 5, 2 hits.",
    );
  });

  it("names the floor a hot shot's floor bounce turns it off, and the left wall", () => {
    expect(guideOf("hot", 4)).toBe(
      "45 degrees. The right wall, a tough brick in row 5, 2 hits, the floor, the left wall.",
    );
  });

  it("names the ceiling, and a hatch's bar by its hatch", () => {
    expect(guideOf("hatch", 4)).toBe(
      "45 degrees. The right wall, the ceiling, the left wall, a hatch in row 7.",
    );
  });

  it("says a brick of one hit by its kind alone", () => {
    expect(guideOf("cleared", 2)).toBe(
      "45 degrees. The right wall, a brick in row 5.",
    );
  });

  it("reads only the turns among the events of the guide's flight", () => {
    const { shot, start, round } = FLIGHT_FIXTURES.plain;

    expect(describeGuide(shot.aim, round.flight.events, start)).toBe(
      "45 degrees. The right wall, a tough brick in row 5, 2 hits.",
    );
  });

  it("says the aim alone for a guide that shows no turn", () => {
    expect(describeGuide(216, [], FLIGHT_FIXTURES.plain.start)).toBe(
      "62 degrees.",
    );
  });

  it("names the brick a turn off a brick met past a hatch's bar beside it", () => {
    const start = startOf(["=o......."]);

    expect(describeGuide(216, [turnMeeting([0, 1])], start)).toBe(
      "62 degrees. A brick in row 1.",
    );
  });

  it("throws for a turn off a brick that met none", () => {
    const start = startOf(["=........"]);

    expect(() => describeGuide(216, [turnMeeting([0])], start)).toThrow(
      "A turn off a brick met no brick of the wall.",
    );
  });
});

describe("describeEarned", () => {
  it("says a floor bounce the rally earned, at its rally", () => {
    const bounce = { by: "rally", rally: 10, kept: true } as const;

    expect(describeEarned(bounce, FLIGHT_RULES)).toBe(
      "Rally 10: a floor bounce.",
    );
  });

  it("says a floor bounce a spring brick gave", () => {
    const bounce = { by: "spring", rally: 4, kept: true } as const;

    expect(describeEarned(bounce, FLIGHT_RULES)).toBe(
      "Spring brick: a floor bounce.",
    );
  });

  it("says a floor bounce lost to the most a fuzzball holds", () => {
    const bounce = { by: "rally", rally: 70, kept: false } as const;

    expect(describeEarned(bounce, FLIGHT_RULES)).toBe(
      "Rally 70: a floor bounce, but you already have 3.",
    );
  });
});

describe("describeRound", () => {
  it.each<[FixtureName, string]>([
    ["plain", "A rally of 1. Broke none. 4 rows to the floor."],
    ["rally", "A rally of 11. Broke none. 3 rows to the floor."],
    ["spring", "A rally of 2. Broke 2. 5 rows to the floor."],
    ["jumped", "A rally of 1. Broke 1. 5 rows to the floor."],
  ])(
    "says the %s round's rally, what it broke and how far the wall stands from the floor",
    (name, words) => {
      const { outcome, next } = FLIGHT_FIXTURES[name].round;

      expect(describeRound(outcome, next)).toBe(words);
    },
  );

  it("says no rally for a flight that struck nothing", () => {
    const { outcome, next } = FLIGHT_FIXTURES.shielded.round;

    expect(describeRound(outcome, next)).toMatch(/^No rally\. Broke none\./);
  });

  it("says a brick reached the floor, for a round that lost the level", () => {
    const { outcome, next } = FLIGHT_FIXTURES.lost.round;

    expect(describeRound(outcome, next)).toBe(
      "A rally of 1. Broke none. A brick reached the floor.",
    );
  });

  it("says only the rally and what broke, for a round that cleared the level", () => {
    const { outcome, next } = FLIGHT_FIXTURES.cleared.round;

    expect(describeRound(outcome, next)).toBe("A rally of 1. Broke 1.");
  });

  it("says 1 row to the floor in the singular", () => {
    const { outcome } = FLIGHT_FIXTURES.plain.round;
    const next = startOf(["ooooooooo", "#.......o"]);

    expect(describeRound(outcome, next)).toBe(
      "A rally of 1. Broke none. 1 row to the floor.",
    );
  });

  it("counts to the floor from the lowest brick the level needs, past steel", () => {
    const { outcome } = FLIGHT_FIXTURES.plain.round;
    const next = startOf(["ooooooooo", "#########"]);

    expect(describeRound(outcome, next)).toBe(
      "A rally of 1. Broke none. 2 rows to the floor.",
    );
  });
});

describe("describeJump", () => {
  it("says the wall's jump and the hot shot it earns", () => {
    const { outcome } = FLIGHT_FIXTURES.jumped.round;

    expect(describeJump(outcome)).toBe(
      "The wall jumped 3 rows. Your next shot is a hot shot.",
    );
  });

  it("says nothing for a round the wall stepped after", () => {
    expect(describeJump(FLIGHT_FIXTURES.plain.round.outcome)).toBeNull();
  });
});

describe("describeDanger", () => {
  /** Where a round starts with a brick the level needs in the row over the floor's. */
  const DANGER = startOf(["ooooooooo", "#.......o"]);

  it("says the danger once a brick the level needs stands in the row over the floor's", () => {
    const { outcome } = FLIGHT_FIXTURES.plain.round;

    expect(describeDanger(outcome, DANGER)).toBe(
      "Danger. Break the bottom bricks this shot, or you lose the level.",
    );
  });

  it("says no danger for steel in the row over the floor's, which the level doesn't need", () => {
    const { outcome } = FLIGHT_FIXTURES.plain.round;

    expect(
      describeDanger(outcome, startOf(["ooooooooo", "#########"])),
    ).toBeNull();
  });

  it("says no danger after a round that lost the level", () => {
    const { outcome } = FLIGHT_FIXTURES.lost.round;

    expect(describeDanger(outcome, DANGER)).toBeNull();
  });
});

describe("describeLevel", () => {
  it("says the level's number, its name, its par and its rally mark", () => {
    expect(describeLevel(levelEntryOf(LEVELS, 2), 9, 10)).toBe(
      "Level 2, Side door. Par 9. Rally mark 10.",
    );
  });
});

describe("starLabel", () => {
  it("names each star as the Cleared card does", () => {
    expect([
      starLabel("cleared", 9, 24),
      starLabel("par", 9, 24),
      starLabel("mark", 9, 24),
    ]).toEqual(["Cleared", "Within 9 shots", "A rally of 24"]);
  });

  it("names the star for a par of 1 in the singular", () => {
    expect(starLabel("par", 1, 24)).toBe("Within 1 shot");
  });
});

describe("describeCleared", () => {
  it("says the level cleared, its shots, the stars it earned by name and the score", () => {
    const stars = { cleared: true, par: true, mark: false };

    expect(describeCleared(RUN, stars, 10)).toBe(
      "Level 2 cleared in 5 shots. 2 stars: cleared and within 9 shots. Score 1,640.",
    );
  });

  it("names all three stars, the rally mark's last", () => {
    const stars = { cleared: true, par: true, mark: true };

    expect(describeCleared(RUN, stars, 10)).toBe(
      "Level 2 cleared in 5 shots. 3 stars: cleared, within 9 shots and a rally of 10. Score 1,640.",
    );
  });

  it("says a level cleared in 1 shot with 1 star in the singular", () => {
    const stars = { cleared: true, par: false, mark: false };

    expect(describeCleared({ ...RUN, rounds: 1 }, stars, 10)).toBe(
      "Level 2 cleared in 1 shot. 1 star: cleared. Score 1,640.",
    );
  });
});

describe("describePause", () => {
  it("says the run paused, its score and the key that resumes it", () => {
    expect(describePause({ score: 1640 })).toBe(
      "Paused. Score 1,640. Press Enter to resume.",
    );
  });
});

describe("describeResume", () => {
  it("says the run goes on", () => {
    expect(describeResume()).toBe("Resumed.");
  });
});

describe("describeTakenUp", () => {
  it("says the level, the shots taken there, the score and the key that resumes it", () => {
    expect(
      describeTakenUp({ rounds: 3, score: 1640 }, levelEntryOf(LEVELS, 2)),
    ).toBe(
      "Paused on level 2, Side door. 3 shots taken. Score 1,640. Press Enter to resume.",
    );
  });

  it("says no shots for a level not yet begun", () => {
    expect(
      describeTakenUp({ rounds: 0, score: 0 }, levelEntryOf(LEVELS, 1)),
    ).toBe("Paused on level 1, First bounce. Score 0. Press Enter to resume.");
  });
});

describe("describeEnd", () => {
  it("says a lost run's end, where it was lost and its score", () => {
    expect(
      describeEnd(
        { outcome: "over", score: 1240 },
        levelEntryOf(LEVELS, 3),
        false,
      ),
    ).toBe("Game over. Lost on level 3, Columns. Score 1,240.");
  });

  it("says a won run's end without an exclamation, and a new best", () => {
    expect(
      describeEnd(
        { outcome: "won", score: 9120 },
        levelEntryOf(LEVELS, 9),
        true,
      ),
    ).toBe("Every level cleared. Score 9,120. New best.");
  });
});

describe("describeRows", () => {
  it("reads the lowest 3 rows that hold a brick, from the floor, a gap where none stands", () => {
    const start = startOf([
      "oooo.....",
      "...o.....",
      ".........",
      "..o......",
      "o........",
    ]);

    expect(describeRows(start)).toBe(
      "Row 1: brick, gap, gap, gap, gap, gap, gap, gap, gap. Row 2: gap, gap, brick, gap, gap, gap, gap, gap, gap. Row 4: gap, gap, gap, brick, gap, gap, gap, gap, gap.",
    );
  });

  it("says a brick's hits left where it takes more than one", () => {
    const start = startOf(["o2M......"]);
    const worn = start.wall.bricks.map((brick) =>
      brick?.kind === "moss" ? { ...brick, hits: 1 } : brick,
    );

    expect(
      describeRows({ ...start, wall: { ...start.wall, bricks: worn } }),
    ).toBe(
      "Row 1: brick, tough brick, 2 hits, moss brick, 1 hit, gap, gap, gap, gap, gap, gap.",
    );
  });

  it("says the faces a plated brick is plated on", () => {
    expect(describeRows(startOf(["vU......."]))).toBe(
      "Row 1: plated brick, 2 hits, plated toward the floor, plated brick, 2 hits, plated toward the floor and both sides, gap, gap, gap, gap, gap, gap, gap.",
    );
  });

  it("says the way each ramp's long face looks", () => {
    expect(describeRows(startOf(["LJF7....."]))).toBe(
      "Row 1: ramp, facing up and right, ramp, facing up and left, ramp, facing down and right, ramp, facing down and left, gap, gap, gap, gap, gap.",
    );
  });

  it("says a lock's bolts", () => {
    expect(describeRows(startOf(["xyz......"]))).toBe(
      "Row 1: lock, 1 bolt, lock, 2 bolts, lock, 3 bolts, gap, gap, gap, gap, gap, gap.",
    );
  });

  it("says a portal by its pair's mark", () => {
    expect(describeRows(startOf(["@&@&....."]))).toBe(
      "Row 1: portal with a dot, portal with a diamond, portal with a dot, portal with a diamond, gap, gap, gap, gap, gap.",
    );
  });

  it("says a portal is shut while its twin waits over the ceiling", () => {
    const picture = [
      "&........",
      ...Array<string>(9).fill("........."),
      "@&@......",
    ];

    expect(describeRows(startOf(picture))).toBe(
      "Row 1: portal with a dot, portal with a diamond, shut, portal with a dot, gap, gap, gap, gap, gap, gap.",
    );
  });

  it("says each other kind by its name", () => {
    expect(describeRows(startOf(["#=SG....."]))).toBe(
      "Row 1: steel brick, hatch, spring brick, gem, gap, gap, gap, gap, gap.",
    );
  });

  it("says there are no bricks on the screen for a wall still over the ceiling", () => {
    expect(describeRows(startOf(["ooooooooo"], 11))).toBe(
      "No bricks on the screen.",
    );
  });
});
