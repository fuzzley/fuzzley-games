import { isCount, isFiniteNumber, isRecord, isWhole } from "@fz/core/json";
import { isAim } from "./aims";
import { type Legend, levelOpening, wallFrom } from "./level_picture";
import type { Pars } from "./par";
import {
  type Run,
  type RunRules,
  type TakenRound,
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "./run";
import {
  type ReadReport,
  type ReleasedRound,
  type ReportedGame,
  type ReportedPlay,
  type ShotCodec,
  isMoment,
  partsOf,
  readKeptShot,
  readReport,
  replayRecord,
  reportOf,
  trimReported,
} from "./reported";
import {
  type KeptWall,
  type SavedRules,
  type SavedRun,
  type TakenUp,
  hasDepth,
  keptWallOf,
  readWall,
  restoreRun,
  savedRunOf,
} from "./saved_wall";
import type { Wall, WallRules } from "./wall";

/** Kinds of brick made up for the specs. */
type Kind = "pebble" | "slate";

/** What the spec's game tallies of a level's rounds: its longest streak. */
interface Tally {
  readonly longest: number;
}

/** A shot of the spec's game: an aim's index and nothing else. */
interface Aimed {
  readonly aim: number;
}

/** The numbers the spec's game's debug menu retunes a round by. */
interface Rules {
  readonly bored: number;
  readonly step: number;
}

/** Where a round of the spec's game starts: its wall, the field's depth, and where its fuzzball waits. */
interface Start {
  readonly wall: Wall<Kind>;
  readonly depth: number;
  readonly x: number;
}

/** Where a round of the spec's game starts as its saved game keeps it. */
interface KeptStart extends KeptWall {
  readonly depth: number;
  readonly x: number;
}

/** A round of the spec's game as its run takes it in. */
interface Played extends TakenRound {
  readonly streak: number;
}

/** The spec's game's round in play as its report keeps it. */
interface KeptRound {
  readonly shot: readonly unknown[];
  readonly moment: number;
}

/** The spec's game's round in play read back. */
interface ReadRound {
  readonly shot: Aimed;
  readonly moment: number;
}

/** A round of the spec's game as it released it. */
type Round = ReleasedRound<Tally, Start, Aimed, Rules>;

/** The spec's game's state as a report keeps it. */
type Reported = ReportedGame<SavedRun<Tally, KeptStart>, KeptRound>;

/** The spec's game's state read back from a report. */
type Read = ReadReport<Tally, Start, Aimed, Rules, ReadRound>;

/** Describes a shot the specs play, and what differs from a plain one. */
interface Shooting {
  readonly aim: number;
  /** The moment it is dropped at, if it is. */
  readonly dropped?: number;
  /** The rules it flies by, the rules' own unless given. */
  readonly rules?: Rules;
  /** The field's depth it flies on, the last shot's unless given. */
  readonly depth?: number;
}

/** The legend the specs draw their level in. */
const LEGEND: Legend<Kind> = {
  none: ".",
  bricks: {
    p: { kind: "pebble", hits: 1, plates: 0 },
    "#": { kind: "slate", hits: 0, plates: 0 },
  },
  twinMarks: [],
  tintOf: () => 0,
};

/** Which of the spec's kinds a level needs broken: pebbles. */
const WALL_RULES: Pick<WallRules<Kind>, "needed"> = {
  needed: (kind) => kind === "pebble",
};

/** The spec's level: a row of pebbles over a row of slate. */
const LEVEL = wallFrom(["ppppppppp", "#########"], LEGEND);

/** Three levels made up for the spec, "a" to "c". */
const LEVELS = ["a", "b", "c"].map((id) => ({ data: { id } }));

/** Each level's par on the depths the specs play. */
const PARS: Pars = Object.fromEntries(
  ["a", "b", "c"].map((id) => [id, { "11": 4, "12": 5, "13": 6 }]),
);

/** The rules a round of the spec's game plays on but where its debug menu retunes them. */
const OWN: Rules = { bored: 60, step: 5 };

/** Rules the spec's debug menu might retune a round to. */
const RETUNED: Rules = { bored: 90, step: 7 };

/** The moment of its flight the spec's round in play had reached. */
const MOMENT = 7.25;

/** The spec's game's run rules: two stars for a level cleared within par, else one, each worth 100. */
const RUN_RULES: RunRules<Tally, Played> = {
  pars: PARS,
  untallied: { longest: 0 },
  tallied: ({ longest }, { streak }) => ({
    longest: Math.max(longest, streak),
  }),
  starsOf: ({ rounds, par }) => (rounds <= par ? 2 : 1),
  starPoints: 100,
};

/** The spec's game's saved-game rules. */
const SAVED_RULES: SavedRules<Tally, KeptStart, Start> = {
  mostStars: 2,
  keptStart: ({ wall, depth, x }) => ({ ...keptWallOf(wall), depth, x }),
  readTally: ({ longest }) => (isCount(longest) ? { longest } : null),
  openingOf: (run) => ({ ...levelOpening(LEVEL, run.depth), depth: run.depth }),
  readStart: (value, run) => {
    if (!isRecord(value) || !hasDepth(value)) return null;
    const played = { depth: run.depth, rounds: run.rounds, jumps: 0 };
    const wall = readWall(value, LEVEL, played, WALL_RULES);
    const { depth, x } = value;
    return wall !== null && isFiniteNumber(x) ? { wall, depth, x } : null;
  },
};

/** How the spec's game keeps a shot in a report, an aim's index alone, and the rules its round flew on where it retuned them. */
const CODEC: ShotCodec<Aimed, Rules> = {
  shotLength: 1,
  keepShot: ({ aim }) => [aim],
  readShot: (kept) => {
    const [aim] = kept;
    return kept.length === 1 && isAim(aim) ? { aim } : null;
  },
  ownRules: OWN,
  keepRules: (rules) =>
    rules.bored === OWN.bored && rules.step === OWN.step ? null : rules,
  readRules: (kept) => {
    if (!isRecord(kept)) return null;
    const { bored, step } = kept;
    return isWhole(bored) && bored > 0 && isWhole(step)
      ? { bored, step }
      : null;
  },
};

/**
 * A codec that keeps a shot as two entries, its aim's index and a 0, and
 * reads back only the first, so what a report holds of a shot's length is
 * the library's to check.
 */
const PADDED: ShotCodec<Aimed, Rules> = {
  ...CODEC,
  shotLength: 2,
  keepShot: ({ aim }) => [aim, 0],
  readShot: ([aim]) => (isAim(aim) ? { aim } : null),
};

/**
 * Returns how a round of the spec's game ends and where the next starts:
 * a shot whole breaks the pebble in the column its aim picks, if one stands
 * there, for 10 points; a dropped one breaks nothing; and the wall comes
 * down a row.
 */
function play(
  start: Start,
  { aim }: Aimed,
  { step }: Rules,
  dropped: number | null,
): { readonly outcome: Played; readonly next: Start } {
  const cell = 9 + (aim % 9);
  const broken = dropped === null && start.wall.bricks[cell] !== null;
  const bricks = start.wall.bricks.map((brick, at) =>
    broken && at === cell ? null : brick,
  );
  const wall = { ...start.wall, bricks, lowestRow: start.wall.lowestRow - 1 };
  return {
    outcome: { points: broken ? 10 : 0, result: "on", streak: step },
    next: { wall, depth: start.depth, x: 0.5 + (aim % 9) },
  };
}

/** Says the first part of a run and start that differs from those a report keeps: its rounds, its streak, its score or its wall. */
function differs(
  run: Run<Tally>,
  start: Start,
  { run: kept, start: reported }: TakenUp<Tally, Start>,
): string | null {
  if (run.rounds !== kept.rounds) return "The shot count doesn't match.";
  if (run.tally.longest !== kept.tally.longest) {
    return "The streak doesn't match.";
  }
  if (run.score !== kept.score) return "The score doesn't match.";
  const wall = JSON.stringify(keptWallOf(start.wall));
  return wall === JSON.stringify(keptWallOf(reported.wall))
    ? null
    : "The wall doesn't match.";
}

/** Returns the spec's round in play as a report keeps it read back, throwing where it doesn't fit. */
function readRound(value: unknown): ReadRound {
  const name = "The game state's shot in the air";
  const { shot, moment } = partsOf(value, { shot: true, moment: true }, name);
  const flown = readKeptShot(shot, CODEC);
  if (flown === null || !isMoment(moment)) {
    throw new Error(`${name} isn't one this build flies.`);
  }
  return { shot: flown, moment };
}

/** What the spec's game hands the report's reader, its runs taken up under the id 7. */
const READERS = {
  ...CODEC,
  restore: (kept: unknown) =>
    restoreRun(kept, LEVELS, 7, { ...RUN_RULES, ...SAVED_RULES }),
  readRound,
};

/** What the spec's game hands a record's replay. */
const REPLAY = { ...RUN_RULES, play, differs };

/** Shots that leave the spec's level standing, on a field 11 deep, the third dropped. */
const SHOTS: readonly Shooting[] = [
  { aim: 100 },
  { aim: 500 },
  { aim: 300, dropped: 6.5 },
  { aim: 200 },
];

/** Returns a run at the spec's level 2's opening, waiting for its first shot, and where that starts. */
function opening(): { readonly run: Run<Tally>; readonly start: Start } {
  const run = createRun({ id: 1, level: 2, depth: 11 }, LEVELS, RUN_RULES);
  return { run, start: SAVED_RULES.openingOf(run) };
}

/** Returns the spec's level played from its opening, a round for each shot as the game releases it, each landed before the next. */
function played(shots: readonly Shooting[]): {
  readonly rounds: readonly Round[];
  readonly run: Run<Tally>;
  readonly start: Start;
} {
  let { run, start } = opening();
  const rounds: Round[] = [];
  for (const { aim, dropped = null, rules = OWN, depth } of shots) {
    const from = depth === undefined ? start : { ...start, depth };
    const started = startLevel(run);
    const round = play(from, { aim }, rules, dropped);
    rounds.push({ started, start: from, shot: { aim }, rules, dropped });
    run = landRound(takeRound(started, round.outcome, RUN_RULES), RUN_RULES);
    start = round.next;
  }
  return { rounds, run, start };
}

/** Returns a round of the spec's level as played, which its shots must hold. */
function roundAt(rounds: readonly Round[], index: number): Round {
  const round = rounds[index];
  if (round === undefined) {
    throw new RangeError(`The spec played no round ${String(index)}.`);
  }
  return round;
}

/** Returns the spec's game as a report takes it once its level has played some shots, the last in play where it says. */
function gameAfter(
  shots: readonly Shooting[],
  inPlay: boolean,
  tuned = false,
): ReportedPlay<Tally, Start, Round> {
  const { rounds, run, start } = played(shots);
  const last = rounds.at(-1);
  if (!inPlay || last === undefined) {
    return { run, start, rounds, inPlay, tuned };
  }
  const flying = { points: 0, result: "on", streak: 0 } as const;
  const inFlight = takeRound(last.started, flying, RUN_RULES);
  return { run: inFlight, start: last.start, rounds, inPlay, tuned };
}

/** Returns the spec's game as a report keeps it. */
function reportedOf(game: ReportedPlay<Tally, Start, Round>): Reported {
  return reportOf(game, LEVELS, { ...SAVED_RULES, ...CODEC }, (round) => ({
    shot: CODEC.keepShot(round.shot),
    moment: MOMENT,
  }));
}

/** Returns a value as a report's link would bring it back. */
function readBack(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

/** The spec's level after its shots, the last in the air, as a report keeps it. */
const REPORTED = reportedOf(gameAfter(SHOTS, true));

/** Returns {@link REPORTED} with its parts changed. */
function tampered(parts: Readonly<Record<string, unknown>>): unknown {
  return { ...REPORTED, ...parts };
}

/** Returns {@link REPORTED} with its record's parts changed. */
function withRecord(parts: Readonly<Record<string, unknown>>): unknown {
  return tampered({ record: { ...REPORTED.record, ...parts } });
}

/** Returns {@link REPORTED} with its saved game's parts changed. */
function withGame(parts: Readonly<Record<string, unknown>>): unknown {
  return tampered({ game: { ...REPORTED.game, ...parts } });
}

/** Returns a value read as the spec's reported game. */
function read(value: unknown): Read {
  return readReport(readBack(value), LEVELS, READERS);
}

/** Returns what reading a value as a reported game throws, or nothing where it reads. */
function problemOf(value: unknown): string {
  try {
    read(value);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Returns the spec's game read back from a report of its level after some shots, none in play. */
function readAfter(shots: readonly Shooting[]): Read {
  return read(reportedOf(gameAfter(shots, false)));
}

describe("reportOf", () => {
  it("keeps a level waiting for its first shot as its opening, with no record and no round", () => {
    const { run, start } = opening();

    const reported = reportedOf({
      run,
      start,
      rounds: [],
      inPlay: false,
      tuned: false,
    });

    expect(reported).toEqual({
      game: savedRunOf(run, null, LEVELS, false),
      record: null,
      round: null,
    });
  });

  it("keeps the round in play apart from the shots before it, with the run before it", () => {
    const last = roundAt(played(SHOTS).rounds, 3);

    const { game, record, round } = reportedOf(gameAfter(SHOTS, true));

    expect({ game, shots: record?.shots.length, round }).toEqual({
      game: savedRunOf(
        last.started,
        SAVED_RULES.keptStart(last.start),
        LEVELS,
        false,
      ),
      shots: 3,
      round: { shot: [200], moment: MOMENT },
    });
  });

  it("keeps the run on the board, and every shot, where no round is in play", () => {
    const game = gameAfter(SHOTS, false);

    const { game: kept, record, round } = reportedOf(game);

    expect({ kept, shots: record?.shots.length, round }).toEqual({
      kept: savedRunOf(
        game.run,
        SAVED_RULES.keptStart(game.start),
        LEVELS,
        false,
      ),
      shots: 4,
      round: null,
    });
  });

  it("keeps whether the run was tuned, in the game and the record", () => {
    const { game, record } = reportedOf(gameAfter(SHOTS, false, true));

    expect([game.tuned, record?.from.tuned]).toEqual([true, true]);
  });

  it("records from the run and start the first shot was released from, a level's opening as one with no round played", () => {
    const { run } = opening();

    const { record } = reportedOf(gameAfter(SHOTS, false));

    expect(record?.from).toEqual(savedRunOf(run, null, LEVELS, false));
  });

  it("keeps where a run taken up mid-level stood, where the record began there", () => {
    const { rounds } = played(SHOTS);
    const game = { ...gameAfter(SHOTS, false), rounds: rounds.slice(2) };

    const { record } = reportedOf(game);

    expect(record?.from.start).toEqual(
      SAVED_RULES.keptStart(roundAt(rounds, 2).start),
    );
  });

  it("keeps each shot as the game's codec does, then only what differs from the shot before", () => {
    const game = gameAfter(
      [
        { aim: 100 },
        { aim: 500, dropped: 3.5 },
        { aim: 200, depth: 12 },
        { aim: 250, rules: RETUNED },
        { aim: 260, dropped: 2, rules: RETUNED, depth: 11 },
      ],
      false,
    );

    const { record } = reportedOf(game);

    expect(record?.shots).toEqual([
      [100],
      [500, 3.5],
      [200, null, null, 12],
      [250, null, RETUNED],
      [260, 2, RETUNED, 11],
    ]);
  });

  it("keeps no depth for the first shot, whose start the record keeps", () => {
    const game = gameAfter([{ aim: 100, depth: 12 }], false);

    expect(reportedOf(game).record?.shots).toEqual([[100]]);
  });
});

describe("readReport", () => {
  it("reads back a game as it was reported, its run paused under the id the game's restore gives it", () => {
    const before = roundAt(played(SHOTS).rounds, 3);

    const { game } = read(REPORTED);

    expect({ run: game.run, start: game.start }).toEqual({
      run: { ...before.started, id: 7, outcome: "paused" },
      start: before.start,
    });
  });

  it("reads back the level's shots, each on the depth of the shot before unless it says, on the rules' own unless it keeps others", () => {
    const { record } = readAfter([
      { aim: 100 },
      { aim: 500, depth: 12, dropped: 3.5 },
      { aim: 300, rules: RETUNED },
    ]);

    expect(record?.shots).toEqual([
      { shot: { aim: 100 }, rules: OWN, dropped: null, depth: 11 },
      { shot: { aim: 500 }, rules: OWN, dropped: 3.5, depth: 12 },
      { shot: { aim: 300 }, rules: RETUNED, dropped: null, depth: 12 },
    ]);
  });

  it("reads back where the record began, paused under the id the game's restore gives it", () => {
    const { run, start } = opening();

    const { record } = read(REPORTED);

    expect(record?.from).toEqual({
      run: { ...run, id: 7, outcome: "paused" },
      start,
      tuned: false,
    });
  });

  it("reads back the round in play as the game reads it", () => {
    const { round } = read(REPORTED);

    expect(round).toEqual({ shot: { aim: 200 }, moment: MOMENT });
  });

  it("reads a game with no record and no round", () => {
    const { record, round } = read(tampered({ record: null, round: null }));

    expect({ record, round }).toEqual({ record: null, round: null });
  });

  it("reads a record of the level in play, whichever it is", () => {
    const level3 = { levelId: "c", level: 3, firstLevel: 3 };
    const value = tampered({
      game: { ...REPORTED.game, ...level3 },
      record: {
        ...REPORTED.record,
        from: { ...REPORTED.record?.from, ...level3 },
      },
    });

    expect(read(value).record?.from.run.level).toBe(3);
  });

  it("names a shot with fewer entries than the game's codec keeps a shot in", () => {
    const value = readBack(withRecord({ shots: [[100]] }));

    expect(() => readReport(value, LEVELS, { ...READERS, ...PADDED })).toThrow(
      "Shot 1 of the game state isn't one this build plays.",
    );
  });

  it.each<readonly [string, readonly unknown[]]>([
    ["nothing after it", [100, null, null]],
    ["all it may hold", [100, 1.5, RETUNED, 13]],
    ["a drop at its flight's first moment", [100, 0]],
  ])("reads a shot that says %s", (_, shot) => {
    expect(problemOf(withRecord({ shots: [shot] }))).toBe("");
  });

  it.each<readonly [string, unknown, string]>([
    [
      "a value that isn't a record",
      "wall",
      "The game state isn't one this build reads.",
    ],
    [
      "a part the reader doesn't know",
      tampered({ ball: 1 }),
      "The game state has a part this build doesn't know: ball.",
    ],
    [
      "no record",
      { game: REPORTED.game, round: REPORTED.round },
      "The game state lacks a part: record.",
    ],
    [
      "a saved game that isn't a record",
      tampered({ game: 5 }),
      "The game state holds no run this build reads.",
    ],
    [
      "a level the build doesn't have",
      withGame({ levelId: "z" }),
      "The game state names a level this build doesn't have.",
    ],
    [
      "a first level the build doesn't have",
      withGame({ firstLevel: 0 }),
      "The game state names a level this build doesn't have.",
    ],
    [
      "a run that doesn't fit its level",
      withGame({ score: -1 }),
      "The game state holds a run that doesn't fit level 2 in this build.",
    ],
    [
      "a record that isn't a record",
      tampered({ record: [] }),
      "The game state's record isn't one this build reads.",
    ],
    [
      "a record from a saved game that isn't a record",
      withRecord({ from: null }),
      "The game state's record holds no run this build reads.",
    ],
    [
      "a record that lacks a part",
      tampered({ record: { shots: REPORTED.record?.shots } }),
      "The game state's record lacks a part: from.",
    ],
    [
      "a record from a level the build doesn't have",
      withRecord({ from: { ...REPORTED.game, levelId: "z" } }),
      "The game state's record names a level this build doesn't have.",
    ],
    [
      "a record from a run that doesn't fit",
      withRecord({ from: { ...REPORTED.game, rounds: -1 } }),
      "The game state's record holds a run that doesn't fit level 2 in this build.",
    ],
    [
      "a record of another level",
      withRecord({
        from: savedRunOf(
          createRun({ id: 1, level: 1, depth: 11 }, LEVELS, RUN_RULES),
          null,
          LEVELS,
          false,
        ),
      }),
      "The game state's record is of another level.",
    ],
    [
      "a record with no shots",
      withRecord({ shots: [] }),
      "The game state's record holds no shots.",
    ],
    [
      "shots that aren't a list",
      withRecord({ shots: "100" }),
      "The game state's record holds no shots.",
    ],
    [
      "a shot that isn't a list",
      withRecord({ shots: [[100], "500"] }),
      "Shot 2 of the game state isn't one this build plays.",
    ],
    [
      "a shot with nothing in it",
      withRecord({ shots: [[]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot with too much in it",
      withRecord({ shots: [[100, null, null, 11, 1]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot the game's codec doesn't read",
      withRecord({ shots: [[657]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot dropped before its flight",
      withRecord({ shots: [[100, -1]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot dropped at no moment",
      withRecord({ shots: [[100, "1"]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot that flew on rules no round plays",
      withRecord({ shots: [[100, null, { bored: 0, step: 7 }]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot on a depth no field has",
      withRecord({ shots: [[100, null, null, 10]] }),
      "Shot 1 of the game state isn't one this build plays.",
    ],
    [
      "a shot after one on a depth no field has",
      withRecord({ shots: [[100], [500, null, null, 23]] }),
      "Shot 2 of the game state isn't one this build plays.",
    ],
    [
      "a round in play the game can't read",
      tampered({ round: { ...REPORTED.round, moment: -1 } }),
      "The game state's shot in the air isn't one this build flies.",
    ],
  ])("names what is wrong with %s", (_name, value, problem) => {
    expect(problemOf(value)).toBe(problem);
  });
});

describe("replayRecord", () => {
  /** The spec's level after its shots, read back. */
  const READ = read(REPORTED);

  /** Returns what replaying the spec's record against what a report keeps throws, or nothing where it replays. */
  function replayProblem(
    kept: TakenUp<Tally, Start>,
    rules: typeof REPLAY = REPLAY,
  ): string {
    try {
      if (READ.record !== null) replayRecord(READ.record, kept, rules);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  it("hands back the rounds the record's shots play again, as the game played them", () => {
    const { rounds } = played(SHOTS);

    const replayed =
      READ.record && replayRecord(READ.record, READ.game, REPLAY);

    expect(
      replayed?.map(({ started, ...round }) => ({
        ...round,
        score: started.score,
      })),
    ).toEqual(
      rounds
        .slice(0, 3)
        .map(({ started, ...round }) => ({ ...round, score: started.score })),
    );
  });

  it("plays each shot as it flew: dropped, retuned and on its depth", () => {
    const { record, game } = readAfter([
      { aim: 100, rules: RETUNED },
      { aim: 500, dropped: 3.5, depth: 12 },
      { aim: 300 },
    ]);

    const rounds = record && replayRecord(record, game, REPLAY);

    expect(
      rounds?.map(({ start, rules, dropped }) => ({
        depth: start.depth,
        rules,
        dropped,
      })),
    ).toEqual([
      { depth: 11, rules: RETUNED, dropped: null },
      { depth: 12, rules: OWN, dropped: 3.5 },
      { depth: 12, rules: OWN, dropped: null },
    ]);
  });

  it("plays the shots through the round the game hands it, naming the first that ends the level", () => {
    const ending: typeof play = (start, shot, ...round) => {
      const { outcome, next } = play(start, shot, ...round);
      return {
        outcome: { ...outcome, result: shot.aim === 500 ? "lost" : "on" },
        next,
      };
    };

    expect(replayProblem(READ.game, { ...REPLAY, play: ending })).toBe(
      "Shot 2 of the game state ends the level in this build.",
    );
  });

  it.each<readonly [string, TakenUp<Tally, Start>, string]>([
    [
      "more shots",
      { ...READ.game, run: { ...READ.game.run, rounds: 4 } },
      "The shot count doesn't match.",
    ],
    [
      "a longer streak",
      { ...READ.game, run: { ...READ.game.run, tally: { longest: 6 } } },
      "The streak doesn't match.",
    ],
    [
      "another score",
      { ...READ.game, run: { ...READ.game.run, score: 1 } },
      "The score doesn't match.",
    ],
    [
      "a wall come further down",
      {
        ...READ.game,
        start: {
          ...READ.game.start,
          wall: { ...READ.game.start.wall, lowestRow: 1 },
        },
      },
      "The wall doesn't match.",
    ],
  ])(
    "names a record that comes to %s than reported, as the game says",
    (_name, kept, part) => {
      expect(replayProblem(kept)).toBe(
        `The shots in the game state play out differently in this build. ${part}`,
      );
    },
  );
});

describe("trimReported", () => {
  it("leaves nothing out of a game with no record and no round", () => {
    const reported = { ...REPORTED, record: null, round: null };

    expect(trimReported(reported)).toBeUndefined();
  });

  it("leaves out the level's shots first, then the round in play", () => {
    const trim = trimReported(REPORTED);

    expect({
      most: trim?.most,
      one: trim?.at(1),
      none: trim?.at(0),
    }).toEqual({
      most: 2,
      one: {
        value: { ...REPORTED, record: null },
        note: "without the level's shots",
      },
      none: {
        value: { ...REPORTED, record: null, round: null },
        note: "without the level's shots or the shot in the air",
      },
    });
  });

  it("leaves out the round in play where it has no record", () => {
    const trim = trimReported({ ...REPORTED, record: null });

    expect({ most: trim?.most, none: trim?.at(0) }).toEqual({
      most: 1,
      none: {
        value: { ...REPORTED, record: null, round: null },
        note: "without the shot in the air",
      },
    });
  });

  it("leaves out the level's shots where no round is in play", () => {
    const trim = trimReported({ ...REPORTED, round: null });

    expect({ most: trim?.most, none: trim?.at(0) }).toEqual({
      most: 1,
      none: {
        value: { ...REPORTED, record: null, round: null },
        note: "without the level's shots",
      },
    });
  });
});

describe("partsOf", () => {
  it("returns a value holding every part known, and no other", () => {
    const value = { shot: [100], moment: 0 };

    expect(partsOf(value, { shot: true, moment: true }, "A round")).toBe(value);
  });

  it("takes a part that holds undefined as there, naming the one it lacks", () => {
    expect(() =>
      partsOf({ shot: undefined }, { shot: true, moment: true }, "A round"),
    ).toThrow("A round lacks a part: moment.");
  });
});

describe("readKeptShot", () => {
  it("reads a shot as the game's codec keeps it", () => {
    expect(readKeptShot([100], CODEC)).toEqual({ aim: 100 });
  });

  it.each([
    ["something that isn't a list", 100],
    ["entries the codec doesn't read", [-1]],
  ])("reads no shot from %s", (_, value) => {
    expect(readKeptShot(value, CODEC)).toBeNull();
  });

  it.each([
    ["fewer entries than the codec keeps", [100]],
    ["more entries than the codec keeps", [100, 0, 5]],
  ])("reads no shot from %s, whatever the codec reads of them", (_, value) => {
    expect(readKeptShot(value, PADDED)).toBeNull();
  });
});

describe("isMoment", () => {
  it.each([
    [0, true],
    [7.25, true],
    [-0.5, false],
    ["1", false],
    [Infinity, false],
  ])("says %j is a moment of a flight: %s", (value, moment) => {
    expect(isMoment(value)).toBe(moment);
  });
});
