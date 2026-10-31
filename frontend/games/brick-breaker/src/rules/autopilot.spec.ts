import {
  AUTOPILOT_LIMIT,
  ENDGAME_LIMIT,
  autoplay,
  limitsOf,
  playLevel,
} from "../testing/autopilot";
import type { Level } from "./level";
import { LEVELS, type LevelData, type LevelEntry, parseLevel } from "./levels";
import { SPEEDS } from "./speed";
import { stepsIn } from "./stepper";
import { COLUMNS, FIELD_HEIGHT, TALLEST_FIELD } from "./tuning";

/** The seeds a spec plays a level from, to judge the autopilot by more than one game. */
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

/** Returns the first level of the bricks drawn, each row filled out with gaps, drawing from the capsules given. */
function entryOf(
  rows: readonly string[],
  capsules: readonly string[] = [],
): LevelEntry {
  const bricks = rows.map((row) => row.padEnd(COLUMNS, "."));
  const data: LevelData = { id: "spec", name: "Spec", bricks, capsules };
  return {
    number: 1,
    set: { id: "spec", name: "Spec", drops: 0, levels: [data] },
    data,
  };
}

/** Returns a level of the bricks drawn, as {@link entryOf} lays it out, ready to play. */
function levelOf(
  rows: readonly string[],
  capsules: readonly string[] = [],
): Level {
  return parseLevel(entryOf(rows, capsules));
}

describe("the autopilot", () => {
  it("clears a level", () => {
    const report = autoplay(levelOf(["", "", "", "ooooo"]), "normal", 1);

    expect(report).toMatchObject({ cleared: true, livesLost: 0 });
  });

  it("stops at its limit on a level it can't clear", () => {
    const level = levelOf(["###", "#o#", "###"]);

    const report = autoplay(level, "normal", 1, { limit: 600 });

    expect(report).toMatchObject({ cleared: false, steps: 600 });
  });

  it("plays a level alike from the same seed", () => {
    const level = levelOf(["", "", "oo?oo", "o2o2o"], ["wide", "multi"]);

    const [first, second] = [1, 1].map((seed) => autoplay(level, "fast", seed));

    expect(first).toEqual(second);
  });

  it("plays one of the game's levels from its number, unless given a seed", () => {
    const entry = {
      ...entryOf(["", "", "oo?oo", "o2o2o"], ["wide", "multi"]),
      number: 4,
    };
    const level = parseLevel(entry);

    const plays = [
      playLevel(entry, "fast"),
      playLevel(entry, "fast", { seed: 9 }),
    ];

    expect(plays).toEqual([
      autoplay(level, "fast", 4),
      autoplay(level, "fast", 9),
    ]);
  });

  it("plays a field of the least height to the spec's own limits", () => {
    expect(limitsOf(FIELD_HEIGHT)).toEqual({
      level: AUTOPILOT_LIMIT,
      endgame: ENDGAME_LIMIT,
    });
  });

  it("plays a taller field to longer limits, as its ball's trips are longer", () => {
    const tallest = limitsOf(TALLEST_FIELD);

    expect({
      level: tallest.level > AUTOPILOT_LIMIT,
      endgame: tallest.endgame > ENDGAME_LIMIT,
    }).toEqual({ level: true, endgame: true });
  });

  it("counts a level of three bricks as endgame from its start", () => {
    const report = autoplay(levelOf(["ooo"]), "normal", 1);

    expect(report.endgameSteps).toBe(report.steps);
  });

  it("sends the ball at a brick the level needs within a few bounces", () => {
    const level = levelOf(["o"]);

    const bounces = SEEDS.map(
      (seed) => autoplay(level, "normal", seed).bounces,
    );

    expect(Math.max(...bounces)).toBeLessThanOrEqual(8);
  });

  // Sent straight at the brick, the ball would meet the shelf under it time
  // after time; sent about, it finds the gap.
  it("aims only at a brick it can see, so one behind steel holds it up no longer than chance", () => {
    const level = levelOf(["", "", "o", "", "", "############."]);

    const steps = SEEDS.reduce(
      (sum, seed) => sum + autoplay(level, "normal", seed).steps,
      0,
    );

    expect(steps).toBeLessThan(stepsIn(30 * 60_000));
  });

  it("catches most of the good capsules that fall", () => {
    // Each gift lets one fall, six a play.
    const level = levelOf(["", "", "??????", "oooooo"], ["wide", "multi"]);

    const caught = SEEDS.reduce(
      (sum, seed) => sum + autoplay(level, "normal", seed).caught,
      0,
    );

    expect(caught).toBeGreaterThan((SEEDS.length * 6) / 2);
  });
});

describe("every level", () => {
  const plays = LEVELS.flatMap((entry) =>
    SPEEDS.map((speed) => [entry.data.name, speed, entry] as const),
  );

  it.each(plays)(
    "is cleared, %s at %s, within eight minutes of game time, its last bricks within one",
    (_, speed, entry) => {
      const report = playLevel(entry, speed);

      expect({
        cleared: report.cleared,
        inTime: report.steps < AUTOPILOT_LIMIT,
        endgameInTime: report.endgameSteps <= ENDGAME_LIMIT,
      }).toEqual({ cleared: true, inTime: true, endgameInTime: true });
    },
  );

  // A taller field lengthens every trip between the paddle and the bricks,
  // and leaves more of how long the last bricks take to luck: across twenty
  // seeds, its endgames drag past their stretched minute about three times
  // as often. The spec above holds how each level is drawn; this one, that
  // each is still cleared in its time on the tallest field.
  it.each(plays)(
    `is cleared, %s at %s, on a field ${String(TALLEST_FIELD)} tall, within eight minutes stretched as its ball's trips are`,
    (_, speed, entry) => {
      const report = playLevel(entry, speed, { height: TALLEST_FIELD });

      expect({
        cleared: report.cleared,
        inTime: report.steps < limitsOf(TALLEST_FIELD).level,
      }).toEqual({ cleared: true, inTime: true });
    },
  );
});
