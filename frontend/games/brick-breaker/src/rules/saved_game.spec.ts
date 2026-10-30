import { hitBrick } from "./bricks";
import { type Field, createField } from "./field";
import { levelsOf, parseLevel } from "./levels";
import { type Run, catchUp, createRun, startLevel } from "./run";
import { FIRST_LIFE_POINTS } from "./tuning";
import {
  type SavedGame,
  restoreGame,
  saveGame,
  takeUpField,
} from "./saved_game";

/** Two levels: a plain brick, a tough one and steel, then a row of plain bricks. */
const LEVELS = levelsOf([
  {
    id: "set",
    name: "Set",
    drops: 0,
    levels: [
      { id: "mixed", name: "Mixed", capsules: [], bricks: ["o3#.........."] },
      { id: "row", name: "Row", capsules: [], bricks: ["ooo.........."] },
    ],
  },
]);

/** Returns a new field of one of the levels. */
function fieldOf(level: number): Field {
  const entry = LEVELS[level - 1];
  if (!entry) throw new Error(`No level ${String(level)}.`);
  return createField(parseLevel(entry), { speed: "normal", seed: 1 });
}

/** Returns a field of the first level with its plain brick broken and its tough one hit once, and its run caught up with it. */
function playedField(): { run: Run; field: Field } {
  const field = fieldOf(1);
  const [plain, tough] = field.bricks;
  if (plain) hitBrick(field, plain, 0, 0);
  if (tough) hitBrick(field, tough, 0, 0);
  field.steps = 300;
  field.draws = 4;
  const run = catchUp(
    startLevel(
      createRun({ id: 3, seed: 9, speed: "fast", lastLevel: 2, level: 1 }),
    ),
    field,
  );
  return { run, field };
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
      lastLevel: 2,
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

  it("keeps a run in play with its level's bricks as they stand", () => {
    const { run, field } = playedField();

    const saved = saveGame(run, field, LEVELS);

    expect({
      levelId: saved?.levelId,
      score: saved?.score,
      steps: saved?.field?.steps,
      draws: saved?.field?.draws,
      bricks: saved?.field?.bricks.slice(0, 4),
    }).toEqual({
      levelId: "mixed",
      score: run.score,
      steps: 300,
      draws: 4,
      bricks: [
        { hits: 0, broken: true, shown: true, goesOffAt: 0, regrowsAt: 0 },
        { hits: 2, broken: false, shown: true, goesOffAt: 0, regrowsAt: 0 },
        { hits: 0, broken: false, shown: true, goesOffAt: 0, regrowsAt: 0 },
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

  it.each<[string, (saved: Record<string, unknown>) => unknown]>([
    ["not an object", () => "saved"],
    ["a level the game doesn't have", (saved) => ({ ...saved, level: 9 })],
    [
      "another level under its number",
      (saved) => ({ ...saved, levelId: "row" }),
    ],
    ["a speed it doesn't know", (saved) => ({ ...saved, speed: "slow" })],
    ["a first level after the level", (saved) => ({ ...saved, firstLevel: 2 })],
    ["a score below the points banked", (saved) => ({ ...saved, banked: 1e6 })],
    ["no lives", (saved) => ({ ...saved, lives: 0 })],
    ["more lives than a run holds", (saved) => ({ ...saved, lives: 7 })],
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
    ["a field that isn't one", (saved) => ({ ...saved, field: "bricks" })],
    ["a brick that isn't one", (saved) => withBrick(saved, 0, 5)],
    [
      "a field of another size",
      (saved) => ({ ...saved, field: { ...fieldIn(saved), bricks: [] } }),
    ],
    [
      "a brick where the level has none",
      (saved) => withBrick(saved, 3, { ...brickIn(saved, 0) }),
    ],
    [
      "a brick with more hits than the level gives it",
      (saved) => withBrick(saved, 1, { ...brickIn(saved, 1), hits: 4 }),
    ],
    [
      "a brick neither broken nor whole",
      (saved) => withBrick(saved, 0, { ...brickIn(saved, 0), broken: 1 }),
    ],
    [
      "streak points beyond the level's",
      (saved) => ({
        ...saved,
        field: { ...fieldIn(saved), streakPoints: 1e6 },
      }),
    ],
  ])("leaves out %s", (_, spoil) => {
    expect(restoreGame(spoil(stored()), LEVELS, 7)).toBeNull();
  });
});

describe("takeUpField", () => {
  it("lays the kept bricks, points and counts over a new field", () => {
    const { run, field: played } = playedField();
    const takenUp = restoreGame(stored(), LEVELS, 7);
    const field = fieldOf(1);

    takeUpField(field, takenUp?.field ?? null, run);

    expect({
      hits: field.bricks.map((brick) => brick?.hits),
      broken: field.bricks.map((brick) => brick?.broken),
      needed: field.needed,
      score: field.score,
      steps: field.steps,
    }).toEqual({
      hits: played.bricks.map((brick) => brick?.hits),
      broken: played.bricks.map((brick) => brick?.broken),
      needed: played.needed,
      score: played.score,
      steps: 300,
    });
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

/** Returns a stored game with one cell's brick changed. */
function withBrick(
  saved: Record<string, unknown>,
  cell: number,
  brick: unknown,
): Record<string, unknown> {
  const field = fieldIn(saved);
  const bricks = [...(field["bricks"] as unknown[])];
  bricks[cell] = brick;
  return { ...saved, field: { ...field, bricks } };
}
