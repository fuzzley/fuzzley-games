import { levelAt } from "@fz/brick-wall/rules/progress";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import { LEVELS } from "../levels/levels";
import {
  RULES,
  type RoundRules,
  type RoundStart,
  playRound,
} from "../round/round";
import type { Shot } from "../shot";
import {
  type PlayedGame,
  type PlayedRound,
  type ReportedGame,
  type ReadGame,
  readReportedGame,
  replayReported,
  reportedGameOf,
} from "./reported_game";
import { RUN_RULES, type Run, levelOf, openingOf } from "./run";
import { saveGame } from "./saved_game";

/** Girder, the level the specs play: its wall's lowest row steel, so a few shots leave it standing. */
const GIRDER = 5;

/** The field's depth the specs' levels open on. */
const DEPTH = 11;

/** A boredom the debug menu might retune a round to. */
const RETUNED: RoundRules = { bored: 300 };

/** The least boredom the debug menu tunes a round to, at which a fuzzball soon tires. */
const BORED_SOON: RoundRules = { bored: 10 };

/** Describes a shot the specs play, and what differs from a plain one. */
interface Aimed {
  readonly shot: Shot;
  /** The moment it is dropped at, if it is. */
  readonly dropped?: number;
  /** The rules it flies by, the rules' own unless given. */
  readonly rules?: RoundRules;
  /** The field's depth it flies on, the last shot's unless given. */
  readonly depth?: number;
}

/** Describes a level played through its rules, as the game plays it. */
interface Played {
  readonly rounds: readonly PlayedRound[];
  /** The run once the last round landed. */
  readonly run: Run;
  /** Where the round after the last starts. */
  readonly start: RoundStart;
}

/** Shots that leave Girder standing, on a field 11 deep, the third dropped. */
const SHOTS: readonly Aimed[] = [
  { shot: { aim: 100, charge: 1 } },
  { shot: { aim: 500, charge: 2 } },
  { shot: { aim: 300, charge: 0 }, dropped: 6.5 },
  { shot: { aim: 200, charge: 3 } },
];

/** Returns a run at Girder's opening, waiting for its first shot, and where that starts. */
function opening(): { readonly run: Run; readonly start: RoundStart } {
  const run = createRun(
    { id: 1, level: GIRDER, depth: DEPTH },
    LEVELS,
    RUN_RULES,
  );
  return { run, start: openingOf(run, levelOf(run, LEVELS)) };
}

/**
 * Returns Girder played through the rules from its opening, a round for
 * each shot as the game releases it, each landed before the next.
 */
function played(shots: readonly Aimed[]): Played {
  const { boon } = levelOf({ level: GIRDER }, LEVELS);
  let { run, start } = opening();
  const rounds: PlayedRound[] = [];
  for (const { shot, dropped, rules = RULES, depth } of shots) {
    const from = depth === undefined ? start : { ...start, depth };
    const started = startLevel(run);
    const round = playRound(
      from,
      shot,
      boon,
      rules,
      dropped === undefined ? undefined : { stop: "drop", at: dropped },
    );
    if (round.outcome.result !== "on")
      throw new Error("A spec's shot ended Girder.");
    rounds.push({
      started,
      start: from,
      shot,
      rules,
      dropped: dropped ?? null,
    });
    run = landRound(takeRound(started, round.outcome, RUN_RULES), RUN_RULES);
    start = round.next;
  }
  return { rounds, run, start };
}

/** Returns the game as a report takes it once Girder has played some shots, the last in play where it says. */
function gameAfter(
  shots: readonly Aimed[],
  inPlay: boolean,
  moment = 0,
): PlayedGame {
  const { rounds, run, start } = played(shots);
  const last = rounds.at(-1);
  return inPlay && last
    ? {
        run: takeRound(
          last.started,
          {
            points: 0,
            jumped: false,
            result: "on",
          },
          RUN_RULES,
        ),
        start: last.start,
        rounds,
        inPlay,
        moment,
        tuned: false,
      }
    : { run, start, rounds, inPlay, moment, tuned: false };
}

/** Girder after the specs' shots, the last in the air at a moment, as a report keeps it, through JSON. */
const REPORTED = JSON.parse(
  JSON.stringify(reportedGameOf(gameAfter(SHOTS, true, 7.25), LEVELS)),
) as ReportedGame;

/** Returns {@link REPORTED} with its parts changed. */
function tampered(parts: Readonly<Record<string, unknown>>): unknown {
  return { ...REPORTED, ...parts };
}

/** Returns {@link REPORTED} with its record's parts changed. */
function withRecord(parts: Readonly<Record<string, unknown>>): unknown {
  return tampered({ record: { ...REPORTED.record, ...parts } });
}

/** Returns {@link REPORTED} with its round's parts changed. */
function withRound(parts: Readonly<Record<string, unknown>>): unknown {
  return tampered({ round: { ...REPORTED.round, ...parts } });
}

/** Returns {@link REPORTED} with its saved game's parts changed. */
function withGame(parts: Readonly<Record<string, unknown>>): unknown {
  return tampered({ game: { ...REPORTED.game, ...parts } });
}

/** Returns what reading a value as a reported game throws, or nothing where it reads. */
function problemOf(value: unknown): string {
  try {
    readReportedGame(value, LEVELS, 7);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("reportedGameOf", () => {
  it("keeps a level waiting for its first shot as its opening, with no record and no round", () => {
    const { run, start } = opening();

    const reported = reportedGameOf(
      { run, start, rounds: [], inPlay: false, moment: 0, tuned: false },
      LEVELS,
    );

    expect(reported).toEqual({
      game: {
        levelId: "girder",
        level: GIRDER,
        firstLevel: GIRDER,
        depth: DEPTH,
        rounds: 0,
        jumps: 0,
        banked: 0,
        stars: 0,
        score: 0,
        tuned: false,
        start: null,
      },
      record: null,
      round: null,
    });
  });

  it("keeps the round in play apart from the shots before it, with the run before it", () => {
    const game = gameAfter(SHOTS, true, 7.25);

    const { game: saved, record, round } = reportedGameOf(game, LEVELS);

    expect({
      rounds: saved.rounds,
      shots: record?.shots.length,
      round,
    }).toEqual({
      rounds: 3,
      shots: 3,
      round: {
        shot: [200, 3],
        boon: levelAt(LEVELS, GIRDER).data.boon,
        bored: RULES.bored,
        moment: 7.25,
        dropped: null,
      },
    });
  });

  it("keeps its parts, and the round in play's, in the order a report keeps them", () => {
    const reported = reportedGameOf(gameAfter(SHOTS, true, 7.25), LEVELS);

    expect(JSON.stringify(reported)).toBe(
      JSON.stringify({
        game: reported.game,
        record: { from: reported.record?.from, shots: reported.record?.shots },
        round: {
          shot: [200, 3],
          boon: levelAt(LEVELS, GIRDER).data.boon,
          bored: RULES.bored,
          moment: 7.25,
          dropped: null,
        },
      }),
    );
  });

  it("keeps the run and where its round starts as the saved game does", () => {
    const game = gameAfter(SHOTS, false);

    const { game: saved } = reportedGameOf(game, LEVELS);

    expect(saved).toEqual(
      saveGame(game.run, game.start, LEVELS, { tuned: false }),
    );
  });

  it("keeps a round in play's drop and its retuned boredom", () => {
    const game = gameAfter(
      [{ shot: { aim: 100, charge: 1 }, dropped: 4, rules: RETUNED }],
      true,
      9,
    );

    const { round } = reportedGameOf(game, LEVELS);

    expect(round).toEqual({
      shot: [100, 1],
      boon: levelAt(LEVELS, GIRDER).data.boon,
      bored: RETUNED.bored,
      moment: 9,
      dropped: 4,
    });
  });

  it("keeps where a run taken up mid-level stood, its wall's hits and all, where the record began there", () => {
    const { rounds } = played(SHOTS);
    const game = { ...gameAfter(SHOTS, false), rounds: rounds.slice(2) };

    const { record } = reportedGameOf(game, LEVELS);

    expect(record?.from.start).toEqual({
      hits: rounds[2]?.start.wall.bricks.map((brick) => brick?.hits ?? null),
      lowestRow: rounds[2]?.start.wall.lowestRow,
      depth: DEPTH,
      x: rounds[2]?.start.x,
      friends: [],
      boon: null,
    });
  });

  it("writes each shot as a certificate does, but what differs from the shot before", () => {
    const game = gameAfter(
      [
        { shot: { aim: 100, charge: 1 } },
        { shot: { aim: 500, charge: 2 }, dropped: 3.5 },
        { shot: { aim: 200, charge: 3 }, depth: 12 },
        { shot: { aim: 250, charge: 4 }, rules: RETUNED },
        {
          shot: { aim: 260, charge: 5 },
          dropped: 2,
          rules: RETUNED,
          depth: 11,
        },
      ],
      false,
    );

    const { record } = reportedGameOf(game, LEVELS);

    expect(record?.shots).toEqual([
      [100, 1],
      [500, 2, 3.5],
      [200, 3, null, null, 12],
      [250, 4, null, RETUNED.bored],
      [260, 5, 2, RETUNED.bored, 11],
    ]);
  });
});

describe("readReportedGame", () => {
  it("reads back a game as it was reported, its run paused under the id handed", () => {
    const game = gameAfter(SHOTS, true, 7.25);
    const before = game.rounds[3];

    const read = readReportedGame(REPORTED, LEVELS, 7);

    expect({ run: read.game.run, start: read.game.start }).toEqual({
      run: { ...before?.started, id: 7, outcome: "paused" },
      start: before?.start,
    });
  });

  it("reads back the level's shots, each on the depth of the shot before unless it says", () => {
    const game = gameAfter(
      [
        { shot: { aim: 100, charge: 1 } },
        { shot: { aim: 500, charge: 2 }, depth: 12, dropped: 3.5 },
        { shot: { aim: 300, charge: 0 }, rules: RETUNED },
      ],
      false,
    );
    const value: unknown = JSON.parse(
      JSON.stringify(reportedGameOf(game, LEVELS)),
    );

    const { record } = readReportedGame(value, LEVELS, 7);

    expect(record?.shots).toEqual([
      { shot: { aim: 100, charge: 1 }, rules: RULES, dropped: null, depth: 11 },
      { shot: { aim: 500, charge: 2 }, rules: RULES, dropped: 3.5, depth: 12 },
      {
        shot: { aim: 300, charge: 0 },
        rules: RETUNED,
        dropped: null,
        depth: 12,
      },
    ]);
  });

  it("works its runs' par out from the pars it is given", () => {
    const read = readReportedGame(REPORTED, LEVELS, 7, { girder: { "11": 4 } });

    expect([read.game.run.par, read.record?.from.run.par]).toEqual([4, 4]);
  });

  it("reads back the round in play", () => {
    const value = JSON.parse(
      JSON.stringify(
        reportedGameOf(
          gameAfter(
            [{ shot: { aim: 100, charge: 1 }, dropped: 4, rules: RETUNED }],
            true,
            9,
          ),
          LEVELS,
        ),
      ),
    ) as unknown;

    const { round } = readReportedGame(value, LEVELS, 7);

    expect(round).toEqual({
      shot: { aim: 100, charge: 1 },
      levelBoon: levelAt(LEVELS, GIRDER).data.boon,
      rules: RETUNED,
      moment: 9,
      dropped: 4,
    });
  });

  it.each<readonly [string, unknown, string]>([
    [
      "a run that doesn't fit its level",
      withGame({ score: -1 }),
      "The game state holds a run that doesn't fit level 5 in this build.",
    ],
    [
      "a shot with an aim alone",
      withRecord({ shots: [[100]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot with too much in it",
      withRecord({ shots: [[100, 1, null, null, 11, 1]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot with no aim there is",
      withRecord({ shots: [[657, 1]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot with no charge there is",
      withRecord({ shots: [[100, 6]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot that flew on no boredom",
      withRecord({ shots: [[100, 1, null, 0]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a round that isn't a record",
      tampered({ round: [200, 3] }),
      "The game state's shot in the air isn't one this build reads.",
    ],
    [
      "a round whose shot isn't a pair",
      withRound({ shot: [200] }),
      "The game state's shot in the air isn't a shot.",
    ],
    [
      "a round whose shot holds more than a pair",
      withRound({ shot: [200, 3, 1] }),
      "The game state's shot in the air isn't a shot.",
    ],
    [
      "a round whose shot isn't a list",
      withRound({ shot: "200,3" }),
      "The game state's shot in the air isn't a shot.",
    ],
    [
      "a round with no aim there is",
      withRound({ shot: [-1, 3] }),
      "The game state's shot in the air isn't a shot.",
    ],
    [
      "a round with no charge there is",
      withRound({ shot: [200, 3.5] }),
      "The game state's shot in the air isn't a shot.",
    ],
    [
      "a round with no boon there is",
      withRound({ boon: "big" }),
      "The game state's shot in the air earns a boon this build doesn't have.",
    ],
    [
      "a round that flew on no boredom",
      withRound({ bored: -180 }),
      "The game state's shot in the air gets bored after a distance no round has.",
    ],
    [
      "a round at no moment",
      withRound({ moment: "7" }),
      "The game state's shot in the air is at no moment of a flight.",
    ],
    [
      "a round at a moment before its flight",
      withRound({ moment: -0.5 }),
      "The game state's shot in the air is at no moment of a flight.",
    ],
    [
      "a round dropped at no moment",
      withRound({ dropped: "4" }),
      "The game state's shot in the air was dropped at no moment it had reached.",
    ],
    [
      "a round dropped after the moment it reached",
      withRound({ dropped: 7.5 }),
      "The game state's shot in the air was dropped at no moment it had reached.",
    ],
  ])("names what is wrong with %s", (_name, value, problem) => {
    expect(problemOf(value)).toBe(problem);
  });

  it("reads a round dropped at the moment it reached", () => {
    const value = withRound({ dropped: 7.25 });

    expect(problemOf(value)).toBe("");
  });

  it("reads a round dropped as it was released, at its flight's first moment", () => {
    const value = withRound({ moment: 0, dropped: 0 });

    expect(problemOf(value)).toBe("");
  });
});

describe("replayReported", () => {
  /** Girder after the specs' shots, read back. */
  const read = readReportedGame(REPORTED, LEVELS, 7);

  /** Returns {@link read} with its saved game's run changed. */
  function withRun(parts: Partial<Run>): ReadGame {
    return {
      ...read,
      game: { ...read.game, run: { ...read.game.run, ...parts } },
    };
  }

  /** Returns {@link read} with where its round starts changed. */
  function withStart(parts: Partial<RoundStart>): ReadGame {
    return {
      ...read,
      game: { ...read.game, start: { ...read.game.start, ...parts } },
    };
  }

  /** Returns what replaying a game read back throws, or nothing where it replays. */
  function replayProblem(game: ReadGame): string {
    try {
      replayReported(game, LEVELS);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  it("plays the level's shots again to the wall they left, every brick as it was", () => {
    const { rounds } = played(SHOTS);

    const { game } = replayReported(read, LEVELS);

    expect({ run: game.run, start: game.start }).toEqual({
      run: read.game.run,
      start: rounds[3]?.start,
    });
  });

  it("hands back the rounds it played on the way, as the game played them", () => {
    const { rounds } = played(SHOTS);

    const replayed = replayReported(read, LEVELS);

    expect(
      replayed.rounds.map(({ started, ...round }) => ({
        ...round,
        score: started.score,
      })),
    ).toEqual(
      rounds
        .slice(0, 3)
        .map(({ started, ...round }) => ({ ...round, score: started.score })),
    );
  });

  it("plays each shot as it flew: dropped, bored soon and on its depth", () => {
    const shots: readonly Aimed[] = [
      { shot: { aim: 100, charge: 1 }, rules: BORED_SOON },
      { shot: { aim: 500, charge: 2 }, dropped: 3.5, depth: 12 },
      { shot: { aim: 300, charge: 0 } },
    ];
    const value: unknown = JSON.parse(
      JSON.stringify(reportedGameOf(gameAfter(shots, false), LEVELS)),
    );

    const { rounds } = replayReported(
      readReportedGame(value, LEVELS, 7),
      LEVELS,
    );

    expect(
      rounds.map(({ start, rules, dropped }) => ({
        depth: start.depth,
        rules,
        dropped,
      })),
    ).toEqual([
      { depth: 11, rules: BORED_SOON, dropped: null },
      { depth: 12, rules: RULES, dropped: 3.5 },
      { depth: 12, rules: RULES, dropped: null },
    ]);
  });

  it("leaves the start on the depth reported, where the field took another after the last shot", () => {
    const game = gameAfter(SHOTS, false);
    const moved = { ...game, start: { ...game.start, depth: 13 } };
    const value: unknown = JSON.parse(
      JSON.stringify(reportedGameOf(moved, LEVELS)),
    );

    const { game: replayed } = replayReported(
      readReportedGame(value, LEVELS, 7),
      LEVELS,
    );

    expect(replayed.start).toEqual(moved.start);
  });

  it("takes the game as reported where it has no record", () => {
    const game = { ...read, record: null };

    expect(replayReported(game, LEVELS)).toEqual({
      game: read.game,
      rounds: [],
      round: read.round,
    });
  });

  it("plays the shots through the round player handed", () => {
    const ending: typeof playRound = (...round) => {
      const played = playRound(...round);
      return { ...played, outcome: { ...played.outcome, result: "lost" } };
    };

    expect(() => replayReported(read, LEVELS, ending)).toThrow(
      "Shot 1 of the game state ends the level in this build.",
    );
  });

  it.each<readonly [string, ReadGame, string]>([
    ["more shots", withRun({ rounds: 4 }), "The shot count doesn't match."],
    [
      "more jumps",
      withRun({ tally: { jumps: 1 } }),
      "The jump count doesn't match.",
    ],
    ["another score", withRun({ score: 1 }), "The score doesn't match."],
    [
      "a wall come further down",
      withStart({ wall: { ...read.game.start.wall, lowestRow: 1 } }),
      "The wall doesn't match.",
    ],
    [
      "a brick with another hit left",
      withStart({
        wall: {
          ...read.game.start.wall,
          bricks: read.game.start.wall.bricks.map((brick) =>
            brick && brick.hits > 0
              ? { ...brick, hits: brick.hits + 1 }
              : brick,
          ),
        },
      }),
      "The wall doesn't match.",
    ],
    [
      "the fuzzball elsewhere",
      withStart({ x: 1.25 }),
      "The fuzzball's start doesn't match.",
    ],
    [
      "a friend more",
      withStart({ crew: { friends: [2] } }),
      "The friends don't match.",
    ],
    ["a boon", withStart({ boon: "hot" }), "The boon doesn't match."],
  ])("names a record that comes to %s than reported", (_name, game, part) => {
    expect(replayProblem(game)).toBe(
      `The shots in the game state play out differently in this build. ${part}`,
    );
  });

  it("names a level whose boon isn't the one the shot in the air flew with", () => {
    const boon = read.round?.levelBoon === "hot" ? "triple" : "hot";
    const game: ReadGame = {
      ...read,
      record: null,
      round: read.round && { ...read.round, levelBoon: boon },
    };

    expect(replayProblem(game)).toBe(
      "The level in the game state has a different boon in this build.",
    );
  });
});
