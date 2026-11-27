import { levelsOf } from "@fz/core/levels";
import { playWithoutBall, stepTimes } from "../../testing/field_picture";
import { type Brick, hitBrick } from "../bricks/bricks";
import { catchCapsule } from "../bricks/capsules";
import { BRICK_KINDS, hasTrait } from "../catalog/bricks";
import {
  type Field,
  createField,
  launch,
  serve,
  steerField,
  stepField,
} from "../field/field";
import { CELLS, cellIndex } from "../grid";
import { type LevelSetData, parseLevel } from "../levels/levels";
import { stepsIn } from "../stepper";
import {
  FIELD_WIDTH,
  FIRST_LIFE_POINTS,
  MAX_LIVES,
  SLIDER_BEAT_MS,
} from "../tuning";
import { type Run, catchUp, createRun, levelSeed, startLevel } from "./run";
import {
  type SavedGame,
  restoreGame,
  saveGame,
  takeUpField,
} from "./saved_game";

/**
 * Three levels: a plain brick, a tough one, steel, a hidden brick, a
 * regrowing one, a blast brick, another plain one and another hidden one;
 * then a row of plain bricks; then, in a set whose bricks draw for capsules,
 * a crowd of every brick that changes as it is played, over a row of blast
 * bricks the ball sets off at once, too many to clear in a few seconds, a
 * key between two gates under them, and two trains of sliders under those.
 */
const LEVELS = levelsOf<LevelSetData>([
  {
    id: "set",
    name: "Set",
    place: "playroom",
    drops: 0,
    levels: [
      {
        id: "mixed",
        name: "Mixed",
        mark: 5,
        capsules: [],
        bricks: ["o3#~+*o~....."],
      },
      {
        id: "row",
        name: "Row",
        mark: 5,
        capsules: [],
        bricks: ["ooo.........."],
      },
    ],
  },
  {
    id: "crowds",
    name: "Crowds",
    place: "playroom",
    drops: 0.25,
    levels: [
      {
        id: "crowd",
        name: "Crowd",
        mark: 5,
        capsules: [],
        bricks: [
          "4444444444444",
          "4~+*~4~*+~4~4",
          "3+3~3*3~3+3~3",
          "~4~+~4~+~4~+~",
          "3*3~3+3~3*3+3",
          "+~+~+~+~+~+~+",
          "*************",
          "=.....k.....=",
          ">>.........<<",
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
  "a best streak",
  "a fuse lit",
  "a gate opened",
  "a ghost shown",
  "a regrowing brick broken",
  "a regrowing brick grown back",
  "a slider stepped",
  "a slider turned",
  "a tough brick worn",
  "dare points",
  "draws",
  "dry bounces",
  "streak points",
];

/** The way each brick of the crowd heads as the level draws it, by its cell. */
const DRAWN_HEADINGS = fieldOf(3).bricks.map((brick) => brick?.heading ?? 0);

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
 * once, a best streak of 6 and the points it added, points from double
 * pay, a climb, draws, two balls off the paddle since a brick it needs
 * broke, and a life gained and one lost.
 */
function playedField(): { run: Run; field: Field } {
  const field = fieldOf(1);
  field.steps = PLAYED_AT;
  for (const cell of [0, 1, 3, 4, 5]) {
    const brick = field.bricks[cell];
    if (brick) hitBrick(field, brick, 0, 0);
  }
  field.bestStreak = 6;
  field.streakPoints = 10;
  field.darePoints = 20;
  field.climbed = 2.5;
  field.draws = 4;
  field.dryBounces = 2;
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
    steerField(field, {
      to: ball ? aim(ball.x) : null,
      by: 0,
      push: 0,
      aim: null,
    });
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
    field.darePoints > 0 && "dare points",
    field.dryBounces > 0 && "dry bounces",
    field.bestStreak > 0 && "a best streak",
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
      brick.broken && hasTrait(brick.kind, "locked") && "a gate opened",
      brick.cell !== brick.home &&
        hasTrait(brick.kind, "slides") &&
        "a slider stepped",
      brick.heading !== DRAWN_HEADINGS[brick.home] && "a slider turned",
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
    /** Where a brick that stays at home stands, heading nowhere. */
    const at = (cell: number): object => ({ cell, heading: 0 });

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
        darePoints: 20,
        climbed: 2.5,
        steps: PLAYED_AT,
        draws: 4,
        dryBounces: 2,
        bestStreak: 6,
      },
      bricks: [
        { ...base, broken: true, ...timers, ...at(0) },
        { ...base, hits: 2, ...timers, ...at(1) },
        { ...base, ...timers, ...at(2) },
        { ...base, hits: 1, ...timers, ...at(3) },
        {
          ...base,
          broken: true,
          goesOffAt: 0,
          regrowsAt: PLAYED_AT + stepsIn(BRICK_KINDS.regrow.traits[0].afterMs),
          ...at(4),
        },
        {
          ...base,
          broken: true,
          goesOffAt: PLAYED_AT + stepsIn(BRICK_KINDS.blast.traits[0].delayMs),
          regrowsAt: 0,
          ...at(5),
        },
        { ...base, hits: 1, ...timers, ...at(6) },
        { ...base, hits: 2, shown: false, ...timers, ...at(7) },
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
    // Its effect isn't kept, but the points it pays are.
    catchCapsule(field, "fast", 0, 0);
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
    [
      "dare points beyond the level's",
      (saved) => withField(saved, { darePoints: 1e6 }),
    ],
    [
      "streak and dare points beyond the level's together",
      (saved) => {
        const level = Number(saved["score"]) - Number(saved["banked"]);
        const streaks = Number(fieldIn(saved)["streakPoints"]);
        return withField(saved, { darePoints: level - streaks + 1 });
      },
    ],
    ["dare points below none", (saved) => withField(saved, { darePoints: -1 })],
    ["a climb below nothing", (saved) => withField(saved, { climbed: -1 })],
    [
      "a climb that isn't a number",
      (saved) => withField(saved, { climbed: "2.5" }),
    ],
    [
      "a climb past any number",
      (saved) => withField(saved, { climbed: Infinity }),
    ],
    ["steps below none", (saved) => withField(saved, { steps: -1 })],
    [
      "balls left the paddle below none",
      (saved) => withField(saved, { dryBounces: -1 }),
    ],
    [
      "balls left the paddle that aren't whole",
      (saved) => withField(saved, { dryBounces: 1.5 }),
    ],
    [
      "a field kept before the best streak was",
      (saved) => {
        const { bestStreak: _, ...field } = fieldIn(saved);
        return { ...saved, field };
      },
    ],
    [
      "a best streak below none",
      (saved) => withField(saved, { bestStreak: -1 }),
    ],
    [
      "a best streak that isn't whole",
      (saved) => withField(saved, { bestStreak: 6.5 }),
    ],
    [
      "streak points with no streak long enough to multiply",
      (saved) => withField(saved, { bestStreak: 4 }),
    ],
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

describe("a level's keys and gates", () => {
  /** A level of two keys, a gate and a plain brick. */
  const GATE_LEVELS = levelsOf<LevelSetData>([
    {
      id: "gates",
      name: "Gates",
      place: "garden",
      drops: 0,
      levels: [
        {
          id: "gates",
          name: "Gates",
          mark: 5,
          capsules: [],
          bricks: ["kk=o........."],
        },
      ],
    },
  ]);

  /** Returns a new field of the level of gates for a run, as the game makes it. */
  function gatesFieldFor(run: Run): Field {
    const [entry] = GATE_LEVELS;
    if (!entry) throw new Error("No level of gates.");
    return createField(parseLevel(entry), {
      speed: run.speed,
      seed: levelSeed(run),
    });
  }

  /**
   * Returns a run on the level of keys and a gate as storage keeps it, read
   * back from JSON, with the keys in the cells given broken.
   */
  function storedGates(keys: readonly number[]): Record<string, unknown> {
    const run = startLevel(
      createRun({
        id: 1,
        seed: 1,
        speed: "normal",
        lastLevel: 1,
        level: 1,
      }),
    );
    const field = gatesFieldFor(run);
    for (const cell of keys) {
      const key = field.bricks[cell];
      if (key) hitBrick(field, key, 0, 0);
    }
    return JSON.parse(
      JSON.stringify(saveGame(catchUp(run, field), field, GATE_LEVELS)),
    ) as Record<string, unknown>;
  }

  /** Returns a field taken up from a run storage kept, or null for one left out. */
  function takenUpFrom(stored: Record<string, unknown>): Field | null {
    const takenUp = restoreGame(stored, GATE_LEVELS, 7);
    if (!takenUp) return null;
    const field = gatesFieldFor(takenUp.run);
    takeUpField(field, takenUp.field, takenUp.run);
    return field;
  }

  it.each([
    ["a key left, its gate shut", [0], 1, false],
    ["no key left, its gate open", [0, 1], 0, true],
  ] as const)("takes up a field with %s", (_, keys, keysLeft, opened) => {
    const field = takenUpFrom(storedGates(keys));

    expect({
      keysLeft: field?.keysLeft,
      opened: field?.bricks[2]?.broken,
    }).toEqual({ keysLeft, opened });
  });

  it.each([
    ["a gate open with a key left", [0], true],
    ["a gate shut with no key left", [0, 1], false],
  ] as const)("leaves out %s", (_, keys, broken) => {
    const stored = withBricks(storedGates(keys), { 2: { broken } });

    expect(restoreGame(stored, GATE_LEVELS, 7)).toBeNull();
  });
});

describe("a level's sliders", () => {
  /** A level of a train of two sliders before a plain brick, and a regrowing brick under them. */
  const SLIDER_LEVELS = levelsOf<LevelSetData>([
    {
      id: "sliders",
      name: "Sliders",
      place: "playroom",
      drops: 0,
      levels: [
        {
          id: "sliders",
          name: "Sliders",
          mark: 5,
          capsules: [],
          bricks: [".>>o.........", ".............", ">+..........."],
        },
      ],
    },
  ]);

  /** The field's beat, in steps. */
  const BEAT = stepsIn(SLIDER_BEAT_MS);

  /** The steps a regrowing brick waits before it grows back. */
  const REGROW_STEPS = stepsIn(BRICK_KINDS.regrow.traits[0].afterMs);

  /** Returns a run on the level of sliders, begun. */
  function sliderRun(): Run {
    return startLevel(
      createRun({ id: 1, seed: 1, speed: "normal", lastLevel: 1, level: 1 }),
    );
  }

  /** Returns a new field of the level of sliders for a run, as the game makes it. */
  function slidersFieldFor(run: Run): Field {
    const [entry] = SLIDER_LEVELS;
    if (!entry) throw new Error("No level of sliders.");
    return createField(parseLevel(entry), {
      speed: run.speed,
      seed: levelSeed(run),
    });
  }

  /**
   * Returns the level of sliders played with no ball for some steps, its
   * plain brick and its regrowing one broken first, so the trains step
   * over them.
   */
  function playedSliders(steps: number): { run: Run; field: Field } {
    const run = sliderRun();
    const field = playWithoutBall(slidersFieldFor(run));
    for (const cell of [3, cellIndex(1, 2)]) {
      const brick = field.bricks[cell];
      if (brick) hitBrick(field, brick, 0, 0);
    }
    stepTimes(field, steps);
    return { run: catchUp(run, field), field };
  }

  /** Returns a run on the level of sliders as storage keeps it, read back from JSON. */
  function storedSliders(steps: number): Record<string, unknown> {
    const { run, field } = playedSliders(steps);
    return JSON.parse(
      JSON.stringify(saveGame(run, field, SLIDER_LEVELS)),
    ) as Record<string, unknown>;
  }

  /** Returns a field taken up from a run storage kept, or null for one left out. */
  function takenUpFrom(stored: Record<string, unknown>): Field | null {
    const takenUp = restoreGame(stored, SLIDER_LEVELS, 7);
    if (!takenUp) return null;
    const field = slidersFieldFor(takenUp.run);
    takeUpField(field, takenUp.field, takenUp.run);
    return field;
  }

  /** Returns where each brick of a field stands, the way it heads and whether it is broken, by its home. */
  function placesOf(field: Field | null): object[] {
    return (field?.bricks ?? [])
      .filter((brick): brick is Brick => brick !== null)
      .map(({ home, cell, heading, broken }) => ({
        home,
        cell,
        heading,
        broken,
      }))
      .sort((a, b) => a.home - b.home);
  }

  it.each([
    ["stepped", BEAT * 2],
    ["turned at the wall", BEAT * 11],
    ["stepped back, a regrowing brick grown where they left it", REGROW_STEPS],
  ])(
    "takes up a field whose sliders have %s, each brick where it stood",
    (_, steps) => {
      const { field: played } = playedSliders(steps);

      const field = takenUpFrom(storedSliders(steps));

      expect({
        places: placesOf(field),
        atTheirCells: field?.bricks.every(
          (brick, cell) => !brick || brick.cell === cell,
        ),
      }).toEqual({ places: placesOf(played), atTheirCells: true });
    },
  );

  it.each<[string, Record<number, unknown>]>([
    ["a brick kept with no cell", { 1: { cell: undefined } }],
    ["a brick kept with no heading", { 1: { heading: undefined } }],
    ["a brick out of its row", { 1: { cell: cellIndex(1, 1) } }],
    ["a brick out of the grid", { 1: { cell: CELLS } }],
    ["a brick in a cell that isn't whole", { 1: { cell: 1.5 } }],
    ["two bricks in one cell", { 1: { cell: 2 } }],
    [
      "a whole brick that doesn't slide away from home",
      { 3: { cell: 0, broken: false, hits: 1 } },
    ],
    ["a slider heading nowhere", { 1: { heading: 0 } }],
    ["a slider heading two cells at a step", { 1: { heading: 2 } }],
    ["a slider heading a way that isn't whole", { 1: { heading: 0.5 } }],
    ["a brick that doesn't slide heading a way", { 3: { heading: 1 } }],
  ])("leaves out %s", (_, changes) => {
    const stored = withBricks(storedSliders(0), changes);

    expect(restoreGame(stored, SLIDER_LEVELS, 7)).toBeNull();
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
