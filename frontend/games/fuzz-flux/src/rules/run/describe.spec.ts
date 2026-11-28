import type { DustLayers } from "../catalog/elements";
import type { Goal } from "../catalog/goals";
import type { KindId } from "../catalog/kinds";
import type { Fuzzball, Piece } from "../catalog/pieces";
import type { BlastId, MadeId } from "../catalog/specials";
import type { NewThing } from "../levels/level";
import type { Blast, Bunch, Hit, MoveRecord, Wave } from "../move/record";
import {
  type GoalSaid,
  describeCleared,
  describeLevelBegun,
  describeMove,
  describeOver,
  describeSquare,
  goalName,
  newThingLine,
} from "./describe";

/** A goal of 20 blue. */
const BLUE: Goal = { what: "gather", kind: "blue", count: 20 };

/** Returns goals as they are said, each with what it still asks for. */
function goalsLeft(
  goals: readonly Goal[],
  left: readonly number[],
): readonly GoalSaid[] {
  return goals.map((goal, place) => ({ goal, left: left[place] ?? 0 }));
}

/** Returns a wave of a move, gathering, setting off and hitting nothing unless given. */
function waveOf(wave: Partial<Wave> = {}): Wave {
  return {
    number: 1,
    bunches: [],
    blasts: [],
    hits: [],
    falls: [],
    goalsLeft: [],
    ...wave,
  };
}

/** Returns a bunch of a kind, so many fuzzballs big, leaving what is given behind. */
function bunchOf(
  kind: KindId,
  size: number,
  made: MadeId | null = null,
): Bunch {
  return {
    squares: Array.from({ length: size }, (_, square) => square),
    kind,
    makes: made === null ? null : { what: made, square: 0, piece: 0 },
  };
}

/** Returns a blast going off, set off by the move or a bunch unless by another blast. */
function blastOf(what: BlastId, setOffBy: number | null = null): Blast {
  return {
    what,
    square: 0,
    piece: 0,
    kind: null,
    setOffBy,
    wait: 0,
    strikes: [],
  };
}

/** Returns a hit on a piece, struck by a bunch. */
function hitOf(
  what: "uncaged" | "unburred" | "broken" | "ruffled",
  piece: number,
): Hit {
  return { what, square: piece, step: 0, blast: null, piece };
}

/** Returns a knock on a brick, leaving it so many layers. */
function knockOf(piece: number, layersLeft: 1 | 2 | 3): Hit {
  return {
    what: "knocked",
    square: piece,
    step: 1,
    blast: null,
    piece,
    layersLeft,
  };
}

/**
 * Returns what is said of a move, its first wave and what else is given,
 * on a level whose goals are given or else 20 blue, 10 of them left before
 * it, and the moves it brought low, if any.
 */
function said(
  record: Partial<MoveRecord>,
  {
    goals = [BLUE],
    from = [10],
    to = from,
    low = null,
  }: {
    goals?: readonly Goal[];
    from?: readonly number[];
    to?: readonly number[];
    low?: number | null;
  } = {},
): string {
  return describeMove(
    {
      swap: { from: 12, to: 13, refused: false },
      waves: [waveOf()],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
      ...record,
    },
    goalsLeft(goals, from),
    goalsLeft(goals, to),
    low,
  );
}

/** Returns a fuzzball of a kind, plain, uncaged and unburred unless given. */
function fuzzballOf(kind: KindId, wears: Partial<Fuzzball> = {}): Fuzzball {
  return {
    what: "fuzzball",
    id: 1,
    kind,
    special: null,
    caged: false,
    burred: false,
    ...wears,
  };
}

describe("goalName", () => {
  it.each<[Goal, string]>([
    [{ what: "gather", kind: "violet", count: 12 }, "violet"],
    [{ what: "dust" }, "dust"],
    [{ what: "brick" }, "bricks"],
    [{ what: "cage" }, "cages"],
    [{ what: "sleepyhead" }, "sleepyheads"],
  ])("names %j %s", (goal, name) => {
    expect(goalName(goal)).toBe(name);
  });
});

describe("newThingLine", () => {
  it("says what you do to make a thing, then what it does", () => {
    expect(newThingLine("dasher")).toBe(
      "Line up 4 to make a dasher. It clears the row or column its fur points along.",
    );
  });

  it.each<[NewThing, string]>([
    [
      "thick-brick",
      "Thick bricks have up to 3 layers. Line up 3 next to one to knock a layer off.",
    ],
    ["cage", "Line up a caged fuzzball to free it."],
  ])("says what a %s asks of you, as the levels lay it", (thing, line) => {
    expect(newThingLine(thing)).toBe(line);
  });
});
describe("describeLevelBegun", () => {
  /** The third of the small levels, Show me, as it begins. */
  const SHOW_ME = {
    level: { number: 3, name: "Show me" },
    goals: goalsLeft(
      [BLUE, { what: "gather", kind: "red", count: 20 }],
      [20, 20],
    ),
    movesLeft: 6,
    wind: null,
  };

  it("says the level's number and name, what its goals ask for and its moves", () => {
    expect(describeLevelBegun(SHOW_ME)).toBe(
      "Level 3, Show me. 20 blue and 20 red. 6 moves.",
    );
  });

  it("says which way the wind blows", () => {
    const wind = { blows: "right", turnsIn: null } as const;

    expect(describeLevelBegun({ ...SHOW_ME, wind })).toBe(
      "Level 3, Show me. 20 blue and 20 red. 6 moves. Wind right.",
    );
  });

  it("says when a wind that turns turns next", () => {
    const wind = { blows: "down", turnsIn: 3 } as const;

    expect(describeLevelBegun({ ...SHOW_ME, wind })).toBe(
      "Level 3, Show me. 20 blue and 20 red. 6 moves. Wind down, turns in 3.",
    );
  });
});

describe("describeMove", () => {
  it("says a swap refused", () => {
    expect(said({ swap: { from: 0, to: 1, refused: true }, waves: [] })).toBe(
      "That swap makes no bunch.",
    );
  });

  it("says the bunch the swap gathered, what it made and the goal left", () => {
    const wave = waveOf({ bunches: [bunchOf("blue", 4, "dasher-across")] });

    expect(said({ waves: [wave] }, { to: [6] })).toBe(
      "Bunch of 4, blue. Dasher made. 6 blue left.",
    );
  });

  it("says how many bunches the swap gathered, and of what kinds", () => {
    const bunches = [bunchOf("blue", 3), bunchOf("red", 3), bunchOf("blue", 3)];

    expect(said({ waves: [waveOf({ bunches })] })).toBe(
      "3 bunches, blue and red.",
    );
  });

  it.each<[BlastId, string]>([
    ["puffer", "Puffer set off."],
    ["two-dashers", "2 dashers set off."],
    ["wisp-and-dasher-down", "Wisp and dasher set off."],
  ])(
    "says the %s the swap set off, not what it set off in turn",
    (what, words) => {
      const blasts = [blastOf(what), blastOf("dasher-across", 0)];

      expect(said({ waves: [waveOf({ blasts })] })).toBe(words);
    },
  );

  it("says how many specials the swap set off where it set off more than one", () => {
    const blasts = [blastOf("puffer"), blastOf("wisp")];

    expect(said({ waves: [waveOf({ blasts })] })).toBe("2 specials set off.");
  });

  it("says every special the move's bunches made, wave after wave", () => {
    const waves = [
      waveOf({ bunches: [bunchOf("blue", 4, "dasher-down")] }),
      waveOf({
        bunches: [
          bunchOf("red", 4, "dasher-across"),
          bunchOf("red", 4, "wisp"),
        ],
      }),
    ];

    expect(said({ waves })).toBe("Bunch of 4, blue. 2 dashers and wisp made.");
  });

  it("says the goals met, then those left", () => {
    const goals: Goal[] = [BLUE, { what: "dust" }, { what: "cage" }];

    expect(said({}, { goals, from: [3, 9, 2], to: [0, 4, 1] })).toBe(
      "Blue done. 4 dust and 1 cage left.",
    );
  });

  it.each<[Hit, string]>([
    [hitOf("uncaged", 1), "Cage opened."],
    [hitOf("unburred", 1), "Burr brushed off."],
    [knockOf(1, 2), "Brick hit."],
    [hitOf("broken", 1), "Brick broken."],
    [
      { what: "dusted", square: 1, step: 0, blast: null, layersLeft: 0 },
      "Square dusted off.",
    ],
    [{ what: "bedded", square: 1, piece: 1 }, "Sleepyhead put to bed."],
  ])("says the hit %j as %j", (hit, words) => {
    expect(said({ waves: [waveOf({ hits: [hit] })] })).toBe(words);
  });

  it("says each element's hits by the pieces hit", () => {
    const hits: Hit[] = [
      hitOf("uncaged", 1),
      hitOf("uncaged", 2),
      knockOf(4, 2),
      knockOf(4, 1),
    ];

    expect(said({ waves: [waveOf({ hits })] })).toBe(
      "2 cages opened. Brick hit.",
    );
  });

  it("says a brick hit and broken in one move as broken", () => {
    const hits: Hit[] = [knockOf(3, 1), hitOf("broken", 3)];

    expect(said({ waves: [waveOf({ hits })] })).toBe("Brick broken.");
  });

  it("says nothing of a layer of dust off a square still dusty", () => {
    const hits: Hit[] = [
      { what: "dusted", square: 1, step: 0, blast: null, layersLeft: 1 },
    ];

    expect(said({ waves: [waveOf({ hits })] })).toBe("");
  });

  it("leaves a hit to the goal that counts it", () => {
    const goals: Goal[] = [{ what: "cage" }];
    const hits = [hitOf("uncaged", 1)];

    expect(
      said({ waves: [waveOf({ hits })] }, { goals, from: [3], to: [2] }),
    ).toBe("2 cages left.");
  });

  it("says nothing of a fuzzball gathered, a special born or a sleepyhead ruffled", () => {
    const hits: Hit[] = [
      {
        what: "gathered",
        square: 1,
        step: 0,
        blast: null,
        piece: 1,
        kind: "blue",
      },
      hitOf("ruffled", 2),
      { what: "born", square: 3, piece: 3, made: "wisp", kind: "blue" },
    ];

    expect(said({ waves: [waveOf({ hits })] })).toBe("");
  });

  it("says a burr spread, the wind's turn and the fuzzballs shuffled after the move", () => {
    const record: Partial<MoveRecord> = {
      burrSpread: { from: 1, to: 2, piece: 2 },
      gust: { turns: 1, waves: [waveOf({ number: 0 })] },
      shuffle: { moves: [] },
    };

    expect(said(record)).toBe("A burr spread. Wind right. Fuzzballs shuffled.");
  });

  it("says the moves left where the move brought them low", () => {
    expect(said({}, { low: 5 })).toBe("5 moves left.");
  });

  it("says what the player needs most of a busy move, in 12 words", () => {
    const wave = waveOf({
      bunches: [bunchOf("blue", 3, "puffer")],
      blasts: [blastOf("dasher-across")],
      hits: [hitOf("uncaged", 1), hitOf("uncaged", 2), knockOf(3, 1)],
    });
    const record = { waves: [wave], burrSpread: { from: 4, to: 5, piece: 5 } };

    expect(said(record, { to: [6], low: 5 })).toBe(
      "Bunch of 3, blue. Puffer made. 6 blue left. 5 moves left.",
    );
  });
});

describe("describeCleared", () => {
  it("says the level cleared, its stars and the moves to spare", () => {
    expect(describeCleared(12, 3, 4)).toBe(
      "Level 12 cleared. 3 stars. 4 moves to spare.",
    );
  });

  it("says no moves to spare where there are none", () => {
    expect(describeCleared(2, 1, 0)).toBe("Level 2 cleared. 1 star.");
  });
});

describe("describeOver", () => {
  it.each<[Goal, number, string]>([
    [{ what: "brick" }, 1, "1 brick"],
    [{ what: "brick" }, 3, "3 bricks"],
    [{ what: "sleepyhead" }, 1, "1 sleepyhead"],
    [{ what: "sleepyhead" }, 2, "2 sleepyheads"],
  ])("says the goal %j left at %i as %j", (goal, left, words) => {
    expect(describeOver(goalsLeft([goal], [left]))).toBe(
      `Out of moves. ${words} left.`,
    );
  });

  it("says what each goal not met still asks for", () => {
    const goals: Goal[] = [BLUE, { what: "dust" }, { what: "cage" }];

    expect(describeOver(goalsLeft(goals, [6, 0, 2]))).toBe(
      "Out of moves. 6 blue and 2 cages left.",
    );
  });
});

describe("describeSquare", () => {
  it.each<[string, Piece | null, string]>([
    ["a plain fuzzball", fuzzballOf("red"), "Red"],
    ["a caged one", fuzzballOf("red", { caged: true }), "Red, caged"],
    [
      "a burred one",
      fuzzballOf("amber", { burred: true }),
      "Amber, with a burr",
    ],
    [
      "one caged and burred",
      fuzzballOf("green", { caged: true, burred: true }),
      "Green, caged, with a burr",
    ],
    [
      "a dasher across",
      fuzzballOf("blue", { special: "dasher-across" }),
      "Blue dasher, across",
    ],
    [
      "a dasher down",
      fuzzballOf("blue", { special: "dasher-down" }),
      "Blue dasher, down",
    ],
    ["a puffer", fuzzballOf("violet", { special: "puffer" }), "Violet puffer"],
    ["a wisp", fuzzballOf("pink", { special: "wisp" }), "Pink wisp"],
    ["the frizzball", { what: "frizzball", id: 1 }, "Frizzball"],
    [
      "a brick of 1 layer",
      { what: "brick", id: 1, layers: 1 },
      "Brick, 1 layer",
    ],
    [
      "a brick of 3 layers",
      { what: "brick", id: 1, layers: 3 },
      "Brick, 3 layers",
    ],
    ["a sleepyhead", { what: "sleepyhead", id: 1 }, "Sleepyhead"],
    ["nothing", null, "Empty"],
  ])("names a square holding %s for it", (_, piece, name) => {
    expect(describeSquare({ piece, dust: 0 })).toBe(name);
  });

  it.each<[DustLayers, string]>([
    [1, "Red, on dust"],
    [2, "Red, on thick dust"],
  ])(
    "names %i layers of dust on a square after what it holds",
    (dust, name) => {
      expect(describeSquare({ piece: fuzzballOf("red"), dust })).toBe(name);
    },
  );
});
