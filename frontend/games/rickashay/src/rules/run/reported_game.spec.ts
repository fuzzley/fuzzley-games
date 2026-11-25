import { levelAt } from "@fz/brick-wall/rules/progress";
import { createRun, startLevel, takeRound } from "@fz/brick-wall/rules/run";
import warmUpMarks from "../../testing/warm_up_marks.json";
import type { Wall } from "../catalog/kinds";
import type { RoundOutcome, RoundStart } from "../flight/events";
import { LEVELS, parseLevel } from "../levels/levels";
import type { Shot } from "../shot";
import { FLIGHT_RULES, type FlightRules } from "../tuning";
import {
  type PlayedGame,
  type PlayedRound,
  type ReadGame,
  type RoundPlayer,
  readReportedGame,
  replayReported,
  reportedGameOf,
} from "./reported_game";
import { type Run, levelStart, runRulesOf } from "./run";
import { type TakenUp, savedStartOf } from "./saved_game";
import type { LevelTally } from "./scoring";
import type { Marks } from "./stars";

/** Warm-up's marks, as a fixture of `marks/warm-up.json` holds them. */
const MARKS: Marks = warmUpMarks;

/** The run's rules over Warm-up's levels and marks. */
const RUN_RULES = runRulesOf(LEVELS, MARKS);

/** Rules the debug menu might retune a round to: a fuzzball bored sooner, and its first floor bounce dearer. */
const RETUNED: FlightRules = { ...FLIGHT_RULES, bored: 40, firstBounce: 12 };

/** The moment of its flight the round in play had reached. */
const MOMENT = 7.25;

/**
 * Plays a round as the specs' stand-in for the game's: a rally of 1, its
 * points the aim and the bored distance it flew on, the wall a row down
 * and the fuzzball waiting at 4.
 */
const PLAY: RoundPlayer = (start, { aim }, rules) => ({
  outcome: {
    rally: 1,
    broken: 0,
    earned: 0,
    jumped: false,
    rowsDown: 1,
    result: "on",
    points: aim + rules.bored,
  },
  next: {
    ...start,
    wall: { ...start.wall, lowestRow: start.wall.lowestRow - 1 },
    x: 4,
  },
});

/** Describes a shot the specs play, and what differs from a plain one. */
interface Shooting {
  readonly aim: number;
  /** The rules it flies by, the rules' own unless given. */
  readonly rules?: FlightRules;
  /** The field's depth it flies on, the last shot's unless given. */
  readonly depth?: number;
}

/**
 * Returns the game as it stands after shots of Side door from its opening
 * on a field 11 deep, each released and landed through {@link PLAY}, the
 * last in play if asked.
 */
function playedGame(
  shots: readonly Shooting[],
  inPlay = false,
): PlayedGame & { readonly next: RoundStart } {
  const level = parseLevel(levelAt(LEVELS, 2).data);
  let run: Run = startLevel(
    createRun({ id: 1, level: 2, depth: 11 }, LEVELS, RUN_RULES),
  );
  let start = levelStart(level, 11);
  const rounds: PlayedRound[] = [];
  for (const { aim, rules = FLIGHT_RULES, depth = start.depth } of shots) {
    const at = { ...start, depth };
    const shot: Shot = { aim };
    rounds.push({ started: run, start: at, shot, rules, dropped: null });
    const { outcome, next } = PLAY(at, shot, rules);
    run = takeRound(run, outcome, RUN_RULES);
    start = next;
  }
  return {
    run,
    start: inPlay ? (rounds.at(-1)?.start ?? start) : start,
    rounds,
    inPlay,
    tuned: false,
    moment: MOMENT,
    next: start,
  };
}

/** Returns a reported game as a report's JSON would read back. */
function readBack(played: PlayedGame): unknown {
  return JSON.parse(JSON.stringify(reportedGameOf(played, LEVELS)));
}

/** Returns a reported game read back, its runs under id 9. */
function read(value: unknown): ReadGame {
  return readReportedGame(value, LEVELS, 9, MARKS);
}

/** Returns a game read back with some of its run's values changed. */
function withRun(kept: TakenUp, change: Partial<Run>): TakenUp {
  return { ...kept, run: { ...kept.run, ...change } };
}

/** Returns a game read back with some of its level's tally changed. */
function withTally(kept: TakenUp, change: Partial<LevelTally>): TakenUp {
  return withRun(kept, { tally: { ...kept.run.tally, ...change } });
}

/** Returns a game read back with some of its wall's values changed. */
function withWall(kept: TakenUp, change: Partial<Wall>): TakenUp {
  const wall = { ...kept.start.wall, ...change };
  return { ...kept, start: { ...kept.start, wall } };
}

/** Returns what a report keeps of a game with its round in play's parts changed. */
function withRound(change: Readonly<Record<string, unknown>>): unknown {
  const reported = reportedGameOf(playedGame([{ aim: 148 }], true), LEVELS);
  return { ...reported, round: { ...reported.round, ...change } };
}

describe("reportedGameOf", () => {
  it("keeps the run and where its round starts as the saved game keeps them, and each shot of the level as its aim", () => {
    const played = playedGame([{ aim: 148 }, { aim: 216 }]);

    const reported = reportedGameOf(played, LEVELS);

    expect(reported).toMatchObject({
      game: { level: 2, rounds: 2, start: savedStartOf(played.start) },
      record: { from: { rounds: 0, start: null }, shots: [[148], [216]] },
      round: null,
    });
  });

  it("keeps the round in play apart, with its moment, from the run as it stood before it", () => {
    const reported = reportedGameOf(
      playedGame([{ aim: 148 }, { aim: 216 }], true),
      LEVELS,
    );

    expect(reported).toMatchObject({
      game: { rounds: 1 },
      record: { shots: [[148]] },
      round: { shot: [216], rules: null, moment: MOMENT },
    });
  });

  it("keeps the numbers a round's retuned rules moved, and the depth where it changed", () => {
    const played = playedGame([
      { aim: 148, rules: RETUNED },
      { aim: 216, depth: 12 },
    ]);

    expect(reportedGameOf(played, LEVELS).record?.shots).toEqual([
      [148, null, { bored: 40, firstBounce: 12 }],
      [216, null, null, 12],
    ]);
  });

  it("keeps the numbers the round in play's retuned rules moved", () => {
    const played = playedGame([{ aim: 148, rules: RETUNED }], true);

    expect(reportedGameOf(played, LEVELS).round?.rules).toEqual({
      bored: 40,
      firstBounce: 12,
    });
  });
});

describe("readReportedGame", () => {
  it("reads back the run and where its round starts, paused, under a new id", () => {
    const played = playedGame([{ aim: 148 }, { aim: 216 }]);

    const { game } = read(readBack(played));

    expect(game).toEqual({
      run: { ...played.run, id: 9, outcome: "paused" },
      start: played.start,
      tuned: false,
    });
  });

  it("reads back each shot of the level, with the rules it flew on and its depth", () => {
    const played = playedGame([
      { aim: 148, rules: RETUNED },
      { aim: 216, depth: 12 },
    ]);

    expect(read(readBack(played)).record?.shots).toEqual([
      { shot: { aim: 148 }, rules: RETUNED, dropped: null, depth: 11 },
      { shot: { aim: 216 }, rules: FLIGHT_RULES, dropped: null, depth: 12 },
    ]);
  });

  it("reads back the round in play, with the rules it flew on and its moment", () => {
    const played = playedGame(
      [{ aim: 148 }, { aim: 216, rules: RETUNED }],
      true,
    );

    expect(read(readBack(played)).round).toEqual({
      shot: { aim: 216 },
      rules: RETUNED,
      moment: MOMENT,
    });
  });

  it("reads back rules each at the least a report may set it to", () => {
    const least: FlightRules = {
      bored: 0.5,
      longest: 0.5,
      stillTurns: 1,
      firstBounce: 1,
      bounceStep: 0,
      mostBounces: 0,
      hotHits: 1,
      hotBounces: 0,
      hatchHolds: 1,
      boltTurns: 1,
      guideTurns: 1,
      guidePast: 0,
    };

    expect(read(withRound({ rules: least })).round?.rules).toEqual(least);
  });

  it.each<[keyof FlightRules, number]>([
    ["bored", 0],
    ["longest", 0],
    ["stillTurns", 0],
    ["firstBounce", 0],
    ["firstBounce", 2.5],
    ["bounceStep", -1],
    ["mostBounces", -1],
    ["hotHits", 0],
    ["hotBounces", -1],
    ["hatchHolds", 0],
    ["boltTurns", 0],
    ["guideTurns", 0],
    ["guidePast", -0.5],
  ])("refuses rules that set %s to %f", (name, value) => {
    expect(() => read(withRound({ rules: { [name]: value } }))).toThrow(
      "The game state's shot in the air flew on rules this build doesn't have.",
    );
  });

  it("refuses a report filed before the game kept its state, which holds none", () => {
    expect(() => read(null)).toThrow(
      "The report has no game state. It was filed before Rickaashay put the game state in reports.",
    );
  });

  it.each<[string, Readonly<Record<string, unknown>>, string]>([
    ["a shot that isn't one", { shot: [657] }, "isn't a shot"],
    [
      "rules naming a number the rules lack",
      { rules: { bounce: 4 } },
      "flew on rules this build doesn't have",
    ],
    [
      "rules of a number that isn't one",
      { rules: { bored: "60" } },
      "flew on rules this build doesn't have",
    ],
    [
      "rules that aren't a record",
      { rules: 60 },
      "flew on rules this build doesn't have",
    ],
    [
      "a moment before the flight",
      { moment: -1 },
      "is at no moment of a flight",
    ],
  ])("refuses a round in play of %s", (_, change, words) => {
    expect(() => read(withRound(change))).toThrow(
      `The game state's shot in the air ${words}.`,
    );
  });

  it("refuses a shot of the level on a depth no field has", () => {
    const reported = reportedGameOf(playedGame([{ aim: 148 }]), LEVELS);
    const record = { ...reported.record, shots: [[148, null, null, 10]] };

    expect(() => read({ ...reported, record })).toThrow(
      "Shot 1 of the game state isn't one this build plays.",
    );
  });
});

describe("replayReported", () => {
  it("plays the level's shots again to the run and the start the report keeps, each as it was played", () => {
    const played = playedGame([
      { aim: 148, rules: RETUNED },
      { aim: 216, depth: 12 },
      { aim: 320 },
    ]);
    const kept = read(readBack(played));

    const { rounds } = replayReported(kept, PLAY);

    expect(
      rounds.map(({ shot, rules, start }) => [shot, rules, start]),
    ).toEqual(
      played.rounds.map(({ shot, rules, start }) => [shot, rules, start]),
    );
  });

  it("hands the run, its start and the round in play on as they were read", () => {
    const kept = read(readBack(playedGame([{ aim: 148 }, { aim: 216 }], true)));

    const replayed = replayReported(kept, PLAY);

    expect(replayed).toMatchObject({ game: kept.game, round: kept.round });
  });

  it("plays nothing again for a report with no shots before the round in play, and hands that round on", () => {
    const kept = read(readBack(playedGame([{ aim: 216 }], true)));

    expect(replayReported(kept, PLAY)).toEqual({
      game: kept.game,
      rounds: [],
      round: kept.round,
    });
  });

  it("refuses a shot the report says was dropped", () => {
    const reported = reportedGameOf(
      playedGame([{ aim: 148 }, { aim: 216 }]),
      LEVELS,
    );
    const record = { ...reported.record, shots: [[148], [216, 3]] };

    expect(() => replayReported(read({ ...reported, record }), PLAY)).toThrow(
      "Shot 2 of the game state was dropped. Rickaashay has no Drop.",
    );
  });

  it.each<[string, string, (kept: TakenUp) => TakenUp]>([
    ["more rounds", "round count", (kept) => withRun(kept, { rounds: 3 })],
    ["a jump", "jump count", (kept) => withTally(kept, { jumps: 1 })],
    [
      "a floor bounce",
      "floor bounce count",
      (kept) => withTally(kept, { earned: 1 }),
    ],
    [
      "a better rally",
      "best rally",
      (kept) => withTally(kept, { bestRally: 2 }),
    ],
    [
      "more points",
      "score",
      (kept) => withRun(kept, { score: kept.run.score + 1 }),
    ],
    ["a wall further down", "wall", (kept) => withWall(kept, { lowestRow: 1 })],
    [
      "a wall of other bricks",
      "wall",
      (kept) =>
        withWall(kept, { bricks: kept.start.wall.bricks.map(() => null) }),
    ],
    [
      "the fuzzball waiting elsewhere",
      "fuzzball's start",
      (kept) => ({ ...kept, start: { ...kept.start, x: 5 } }),
    ],
    [
      "a hot shot",
      "hot shot",
      (kept) => ({ ...kept, start: { ...kept.start, hot: true } }),
    ],
  ])(
    "refuses shots that play out to a game kept with %s",
    (_, part, change) => {
      const kept = read(readBack(playedGame([{ aim: 148 }, { aim: 216 }])));

      expect(() =>
        replayReported({ ...kept, game: change(kept.game) }, PLAY),
      ).toThrow(
        `The shots in the game state play out differently in this build. The ${part} doesn't match.`,
      );
    },
  );

  it("refuses a shot that ends the level as it is played again", () => {
    const kept = read(readBack(playedGame([{ aim: 148 }])));
    const lost: RoundPlayer = (start, shot, rules) => {
      const { outcome, next } = PLAY(start, shot, rules);
      const ended: RoundOutcome = { ...outcome, result: "lost" };
      return { outcome: ended, next };
    };

    expect(() => replayReported(kept, lost)).toThrow(
      "Shot 1 of the game state ends the level in this build.",
    );
  });
});
