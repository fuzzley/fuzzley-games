import { hitBrick } from "./bricks";
import { BRICK_KINDS, hasTrait } from "./catalog/bricks";
import {
  type Field,
  createField,
  launch,
  serve,
  steerField,
  stepField,
} from "./field";
import { levelsOf, parseLevel } from "./levels";
import { type Run, catchUp, createRun, levelSeed, startLevel } from "./run";
import {
  type SavedGame,
  restoreGame,
  saveGame,
  takeUpField,
} from "./saved_game";
import { stepsIn } from "./stepper";
import { FIELD_WIDTH, FIRST_LIFE_POINTS, MAX_LIVES } from "./tuning";

/**
 * Three levels: a plain brick, a tough one, steel, a hidden brick, a
 * regrowing one, a blast brick, another plain one and another hidden one;
 * then a row of plain bricks; then, in a set whose bricks draw for capsules,
 * a crowd of every brick that changes as it is played, over a row of blast
 * bricks the ball sets off at once, too many to clear in a few seconds.
 */
const LEVELS = levelsOf([
  {
    id: "set",
    name: "Set",
    drops: 0,
    levels: [
      { id: "mixed", name: "Mixed", capsules: [], bricks: ["o3#~+*o~....."] },
      { id: "row", name: "Row", capsules: [], bricks: ["ooo.........."] },
    ],
  },
  {
    id: "crowds",
    name: "Crowds",
    drops: 0.25,
    levels: [
      {
        id: "crowd",
        name: "Crowd",
        capsules: [],
        bricks: [
          "4444444444444",
          "4~+*~4~*+~4~4",
          "3+3~3*3~3+3~3",
          "~4~+~4~+~4~+~",
          "3*3~3+3~3*3+3",
          "+~+~+~+~+~+~+",
          "*************",
        ],
      },
    ],
  },
]);

/** The step the played field is at as its bricks are hit. */
const PLAYED_AT = 300;

/** How many steps the crowd is played between two takes, sharing no factor with a fuse's 12. */
const STRIDE = 7;

/** How many takes of the crowd are kept and taken up. */
const TAKES = 300;

/** The take from which the paddle keeps away from the ball until one is lost. */
const MISS_FROM = 150;

/** How far off the ball's middle the paddle meets it, take by take, so the ball goes everywhere. */
const AIMS: readonly number[] = [-1.4, -0.6, 0.3, 1.1];

/** Every state of the crowd's play that a field taken up must keep. */
const PLAYED_STATES: readonly string[] = [
  "a ball lost",
  "a fuse lit",
  "a ghost shown",
  "a regrowing brick broken",
  "a regrowing brick grown back",
  "a tough brick worn",
  "draws",
  "streak points",
];

/** Returns a new field of one of the levels. */
function fieldOf(level: number): Field {
  const entry = LEVELS[level - 1];
  if (!entry) throw new Error(`No level ${String(level)}.`);
  return createField(parseLevel(entry), { speed: "normal", seed: 1 });
}

/** Returns a new field of the level a run is on, as the game makes it. */
function fieldFor(run: Run): Field {
  const entry = LEVELS[run.level - 1];
  if (!entry) throw new Error(`No level ${String(run.level)}.`);
  return createField(parseLevel(entry), {
    speed: run.speed,
    seed: levelSeed(run),
  });
}

/**
 * Returns a field of the first level well into play, and its run caught up
 * with it: its first plain brick, its regrowing brick and its blast brick
 * broken, the blast's fuse lit, its tough brick and its first hidden one hit
 * once, a streak, a climb, draws, and a life gained and one lost.
 */
function playedField(): { run: Run; field: Field } {
  const field = fieldOf(1);
  field.steps = PLAYED_AT;
  for (const cell of [0, 1, 3, 4, 5]) {
    const brick = field.bricks[cell];
    if (brick) hitBrick(field, brick, 0, 0);
  }
  field.streakPoints = 10;
  field.climbed = 2.5;
  field.draws = 4;
  field.livesGained = 1;
  field.livesLost = 1;
  const run = catchUp(
    startLevel(
      createRun({ id: 3, seed: 9, speed: "fast", lastLevel: 3, level: 1 }),
    ),
    field,
  );
  return { run, field };
}

/**
 * Plays a field on a number of steps, serving and launching at once, its
 * paddle sent where `aim` puts it for its first ball in play.
 */
function playOn(
  field: Field,
  steps: number,
  aim: (ballX: number) => number,
): void {
  for (let i = 0; i < steps; i++) {
    if (field.state === "lost") serve(field);
    launch(field);
    const ball = field.balls.find((each) => each.live);
    steerField(field, { to: ball ? aim(ball.x) : null, by: 0, push: 0 });
    stepField(field);
  }
}

/**
 * Returns where the paddle goes for a ball, take by take: a little off the
 * ball's middle, or, from {@link MISS_FROM} until a ball is lost, to the wall
 * across the field from it.
 */
function aimOf(
  field: Readonly<Field>,
  take: number,
): (ballX: number) => number {
  const missing = take >= MISS_FROM && field.livesLost === 0;
  const off = AIMS[take % AIMS.length] ?? 0;
  return (x) => {
    if (missing) return x < FIELD_WIDTH / 2 ? FIELD_WIDTH : 0;
    return x + off;
  };
}

/** Names the states of {@link PLAYED_STATES} a field holds now. */
function statesOf(field: Readonly<Field>): string[] {
  const states = [
    field.livesLost > 0 && "a ball lost",
    field.draws > 0 && "draws",
    field.streakPoints > 0 && "streak points",
  ];
  for (const brick of field.bricks) {
    if (!brick) continue;
    states.push(
      brick.broken && brick.goesOffAt > field.steps && "a fuse lit",
      !brick.broken &&
        hasTrait(brick.kind, "hidden") &&
        brick.shown &&
        "a ghost shown",
      brick.broken &&
        hasTrait(brick.kind, "regrows") &&
        "a regrowing brick broken",
      !brick.broken && brick.regrowsAt > 0 && "a regrowing brick grown back",
      brick.kind === "tough" &&
        !brick.broken &&
        brick.hits < brick.whole &&
        "a tough brick worn",
    );
  }
  return states.filter((state) => state !== false);
}

/**
 * Returns whether a run and its field, kept and read back from JSON as a
 * reload would, are taken up as they stood.
 */
function keptAsItStands(run: Run, field: Field): boolean {
  const saved = saveGame(run, field, LEVELS);
  const takenUp = restoreGame(JSON.parse(JSON.stringify(saved)), LEVELS, 2);
  if (!takenUp) return false;
  const fresh = fieldFor(takenUp.run);
  takeUpField(fresh, takenUp.field, takenUp.run);
  return (
    JSON.stringify(saveGame(takenUp.run, fresh, LEVELS)) ===
    JSON.stringify(saved)
  );
}

/** Returns a played run as storage keeps it, read back from JSON as a reload would. */
function stored(): Record<string, unknown> {
  const { run, field } = playedField();
  return JSON.parse(JSON.stringify(saveGame(run, field, LEVELS))) as Record<
    string,
    unknown
  >;
}

describe("saveGame", () => {
  it("keeps nothing of a run waiting for its first serve", () => {
    const run = createRun({
      id: 1,
      seed: 1,
      speed: "normal",
      lastLevel: 3,
      level: 1,
    });

    expect(saveGame(run, fieldOf(1), LEVELS)).toBeNull();
  });

  it.each(["over", "won"] as const)("keeps nothing of a run %s", (outcome) => {
    const { run, field } = playedField();

    expect(saveGame({ ...run, outcome }, field, LEVELS)).toBeNull();
  });

  it("keeps nothing of a run at a level the game doesn't have", () => {
    const { run, field } = playedField();

    expect(saveGame({ ...run, level: 9 }, field, LEVELS)).toBeNull();
  });

  it("keeps a run in play with its level's bricks and counts as they stand", () => {
    const { run, field } = playedField();
    const base = { hits: 0, broken: false, shown: true };
    const timers = { goesOffAt: 0, regrowsAt: 0 };

    const saved = saveGame(run, field, LEVELS);

    const { bricks = [], ...counts } = saved?.field ?? {};
    expect({
      levelId: saved?.levelId,
      score: saved?.score,
      counts,
      bricks: bricks.slice(0, 9),
    }).toEqual({
      levelId: "mixed",
      score: run.score,
      counts: {
        streakPoints: 10,
        climbed: 2.5,
        steps: PLAYED_AT,
        draws: 4,
      },
      bricks: [
        { ...base, broken: true, ...timers },
        { ...base, hits: 2, ...timers },
        { ...base, ...timers },
        { ...base, hits: 1, ...timers },
        {
          ...base,
          broken: true,
          goesOffAt: 0,
          regrowsAt: PLAYED_AT + stepsIn(BRICK_KINDS.regrow.traits[0].afterMs),
        },
        {
          ...base,
          broken: true,
          goesOffAt: PLAYED_AT + stepsIn(BRICK_KINDS.blast.traits[0].delayMs),
          regrowsAt: 0,
        },
        { ...base, hits: 1, ...timers },
        { ...base, hits: 2, shown: false, ...timers },
        null,
      ],
    });
  });

  it("keeps a run whose level was just cleared at the start of the next", () => {
    const { run, field } = playedField();

    const saved = saveGame({ ...run, outcome: "cleared" }, field, LEVELS);

    expect(saved).toMatchObject({ levelId: "row", level: 2, field: null });
  });
});

describe("restoreGame", () => {
  it("takes up a run as it was kept, paused, under a new id", () => {
    const { run } = playedField();

    const takenUp = restoreGame(stored(), LEVELS, 7);

    expect(takenUp?.run).toEqual({ ...run, id: 7, outcome: "paused" });
  });

  it("takes up a run kept at a level not yet begun", () => {
    const { run, field } = playedField();
    const cleared = { ...run, banked: run.score, outcome: "cleared" as const };
    const kept: unknown = JSON.parse(
      JSON.stringify(saveGame(cleared, field, LEVELS)),
    );

    const takenUp = restoreGame(kept, LEVELS, 7);

    expect({ level: takenUp?.run.level, field: takenUp?.field }).toEqual({
      level: 2,
      field: null,
    });
  });

  it("takes up a run holding the most lives a run holds", () => {
    const takenUp = restoreGame({ ...stored(), lives: MAX_LIVES }, LEVELS, 7);

    expect(takenUp?.run.lives).toBe(MAX_LIVES);
  });

  it.each<[string, Record<number, unknown>]>([
    [
      "a brick grown back",
      { 4: { hits: 1, broken: false, regrowsAt: PLAYED_AT } },
    ],
    ["a blast brick gone off", { 5: { goesOffAt: 0 } }],
  ])("takes up %s", (_, changes) => {
    expect(
      restoreGame(withBricks(stored(), changes), LEVELS, 7),
    ).not.toBeNull();
  });

  it("takes up a run and its field at any step of their play as they stood", () => {
    let run = startLevel(
      createRun({ id: 1, seed: 5, speed: "normal", lastLevel: 3, level: 3 }),
    );
    const field = fieldFor(run);
    const misses: number[] = [];
    const seen = new Set<string>();

    for (let take = 0; take < TAKES; take++) {
      playOn(field, STRIDE, aimOf(field, take));
      run = catchUp(run, field);
      for (const state of statesOf(field)) seen.add(state);
      if (!keptAsItStands(run, field)) misses.push(take);
    }

    expect({ misses, seen: [...seen].sort() }).toEqual({
      misses: [],
      seen: PLAYED_STATES,
    });
  });

  it.each<[string, (saved: Record<string, unknown>) => unknown]>([
    ["not an object", () => "saved"],
    ["a level the game doesn't have", (saved) => ({ ...saved, level: 9 })],
    [
      "another level under its number",
      (saved) => ({ ...saved, levelId: "row" }),
    ],
    ["a speed it doesn't know", (saved) => ({ ...saved, speed: "slow" })],
    ["a seed that isn't whole", (saved) => ({ ...saved, seed: 1.5 })],
    [
      "a first level before the first",
      (saved) => ({ ...saved, firstLevel: 0 }),
    ],
    ["a first level after the level", (saved) => ({ ...saved, firstLevel: 2 })],
    ["a score below the points banked", (saved) => ({ ...saved, banked: 1e6 })],
    ["no lives", (saved) => ({ ...saved, lives: 0 })],
    [
      "more lives than a run holds",
      (saved) => ({ ...saved, lives: MAX_LIVES + 1 }),
    ],
    ["lives lost below none", (saved) => ({ ...saved, levelLost: -1 })],
    [
      "the next life at a score already passed",
      (saved) => ({
        ...saved,
        score: Number(saved["score"]) + FIRST_LIFE_POINTS,
        banked: Number(saved["banked"]) + FIRST_LIFE_POINTS,
      }),
    ],
    [
      "the next life before the first",
      (saved) => ({ ...saved, nextLifeAt: FIRST_LIFE_POINTS - 1 }),
    ],
    [
      "the next life between the marks",
      (saved) => ({ ...saved, nextLifeAt: FIRST_LIFE_POINTS + 1 }),
    ],
    [
      "a level not yet begun with points on it",
      () => {
        const cleared = storedCleared();
        return { ...cleared, score: Number(cleared["score"]) + 10 };
      },
    ],
    [
      "a level not yet begun with a life gained on it",
      () => ({ ...storedCleared(), levelGained: 1 }),
    ],
    [
      "a level not yet begun with a life lost on it",
      () => ({ ...storedCleared(), levelLost: 1 }),
    ],
    ["a field that isn't one", (saved) => ({ ...saved, field: "bricks" })],
    [
      "a field of another size",
      (saved) => ({ ...saved, field: { ...fieldIn(saved), bricks: [] } }),
    ],
    [
      "streak points beyond the level's",
      (saved) => withField(saved, { streakPoints: 1e6 }),
    ],
    ["a climb below nothing", (saved) => withField(saved, { climbed: -1 })],
    ["steps below none", (saved) => withField(saved, { steps: -1 })],
    [
      "more steps than can be counted",
      (saved) => withField(saved, { steps: 2 ** 60 }),
    ],
    [
      "a level with nothing it needs left",
      (saved) =>
        withBricks(saved, {
          1: { hits: 0, broken: true },
          3: { hits: 0, broken: true },
          6: { hits: 0, broken: true },
          7: { hits: 0, broken: true, shown: true },
        }),
    ],
    ["a brick that isn't one", (saved) => withBricks(saved, { 0: 5 })],
    [
      "a brick where the level has none",
      (saved) => withBricks(saved, { 8: brickIn(saved, 0) }),
    ],
    [
      "a brick with more hits than the level gives it",
      (saved) => withBricks(saved, { 1: { hits: 4 } }),
    ],
    [
      "a brick neither broken nor whole",
      (saved) => withBricks(saved, { 0: { broken: 1 } }),
    ],
    [
      "a brick broken with hits left",
      (saved) => withBricks(saved, { 1: { broken: true } }),
    ],
    [
      "a brick out of hits but not broken",
      (saved) => withBricks(saved, { 1: { hits: 0 } }),
    ],
    ["steel broken", (saved) => withBricks(saved, { 2: { broken: true } })],
    [
      "a brick neither shown nor hidden",
      (saved) => withBricks(saved, { 0: { shown: "yes" } }),
    ],
    [
      "a brick hidden that never hides",
      (saved) => withBricks(saved, { 1: { shown: false } }),
    ],
    [
      "a hidden brick hit but still hidden",
      (saved) => withBricks(saved, { 3: { shown: false } }),
    ],
    [
      "a fuse below nothing",
      (saved) => withBricks(saved, { 5: { goesOffAt: -1 } }),
    ],
    [
      "a fuse on a brick that doesn't blast",
      (saved) => withBricks(saved, { 0: { goesOffAt: 50 } }),
    ],
    [
      "a fuse on a blast brick not broken",
      (saved) =>
        withBricks(saved, { 5: { hits: 1, broken: false, goesOffAt: 50 } }),
    ],
    [
      "a regrowth due on a brick that doesn't regrow",
      (saved) => withBricks(saved, { 0: { regrowsAt: 50 } }),
    ],
  ])("leaves out %s", (_, spoil) => {
    expect(restoreGame(spoil(stored()), LEVELS, 7)).toBeNull();
  });
});

describe("takeUpField", () => {
  it("lays every kept brick and count over a new field, so it keeps as it was", () => {
    const { run, field: played } = playedField();
    const takenUp = restoreGame(stored(), LEVELS, 7);
    const field = fieldOf(1);

    takeUpField(field, takenUp?.field ?? null, run);

    expect(saveGame(run, field, LEVELS)).toEqual(saveGame(run, played, LEVELS));
  });

  it("takes the level's points and lives from the run, and counts the bricks it still needs", () => {
    const { run, field: played } = playedField();
    const takenUp = restoreGame(stored(), LEVELS, 7);
    const field = fieldOf(1);

    takeUpField(field, takenUp?.field ?? null, run);

    expect({
      score: field.score,
      gained: field.livesGained,
      lost: field.livesLost,
      needed: field.needed,
    }).toEqual({ score: played.score, gained: 1, lost: 1, needed: 4 });
  });

  it("leaves a level not yet begun as the level lays it", () => {
    const { run } = playedField();
    const next = startLevel({ ...run, banked: run.score, outcome: "cleared" });
    const field = fieldOf(2);

    takeUpField(field, null, next);

    expect({ needed: field.needed, score: field.score }).toEqual({
      needed: 3,
      score: 0,
    });
  });
});

/** Returns a played run kept as its level was cleared: the next level, not yet begun. */
function storedCleared(): Record<string, unknown> {
  const { run, field } = playedField();
  const cleared = { ...run, banked: run.score, outcome: "cleared" as const };
  return JSON.parse(JSON.stringify(saveGame(cleared, field, LEVELS))) as Record<
    string,
    unknown
  >;
}

/** Returns a stored game's field, as an object to spoil. */
function fieldIn(saved: Record<string, unknown>): Record<string, unknown> {
  return (saved as unknown as SavedGame).field as unknown as Record<
    string,
    unknown
  >;
}

/** Returns one of a stored game's bricks, as an object to spoil. */
function brickIn(
  saved: Record<string, unknown>,
  cell: number,
): Record<string, unknown> {
  const bricks = fieldIn(saved)["bricks"] as Record<string, unknown>[];
  return bricks[cell] ?? {};
}

/** Returns a stored game with some of its field's counts changed. */
function withField(
  saved: Record<string, unknown>,
  changes: Record<string, unknown>,
): Record<string, unknown> {
  return { ...saved, field: { ...fieldIn(saved), ...changes } };
}

/**
 * Returns a stored game with some cells' bricks changed: an object is
 * merged into the brick kept there, anything else takes its place.
 */
function withBricks(
  saved: Record<string, unknown>,
  changes: Record<number, unknown>,
): Record<string, unknown> {
  const bricks = [...(fieldIn(saved)["bricks"] as unknown[])];
  for (const [cell, change] of Object.entries(changes)) {
    const at = Number(cell);
    bricks[at] =
      typeof change === "object" && change !== null
        ? { ...brickIn(saved, at), ...change }
        : change;
  }
  return withField(saved, { bricks });
}
