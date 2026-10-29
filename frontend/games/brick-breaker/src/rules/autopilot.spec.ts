import { AUTOPILOT_LIMIT, autoplay } from "../testing/autopilot";
import type { Level } from "./level";
import { LEVELS, type LevelData, parseLevel } from "./levels";
import { SPEEDS } from "./speed";
import { COLUMNS } from "./tuning";

/** Returns a level of the bricks drawn, each row filled out with gaps, with no capsules. */
function levelOf(rows: readonly string[]): Level {
  const bricks = rows.map((row) => row.padEnd(COLUMNS, "."));
  const data: LevelData = { id: "spec", name: "Spec", bricks, capsules: [] };
  return parseLevel({
    number: 1,
    set: { id: "spec", name: "Spec", drops: 0, levels: [data] },
    data,
  });
}

describe("the autopilot", () => {
  it("clears a level", () => {
    const report = autoplay(levelOf(["", "", "", "ooooo"]), "normal", 1);

    expect(report).toMatchObject({ cleared: true, livesLost: 0 });
  });

  it("stops at its limit on a level it can't clear", () => {
    const level = levelOf(["###", "#o#", "###"]);

    const report = autoplay(level, "normal", 1, 600);

    expect(report).toMatchObject({ cleared: false, steps: 600 });
  });

  it("plays a level alike from the same seed", () => {
    const level = levelOf(["", "", "oo?oo", "o2o2o"]);

    const [first, second] = [1, 1].map((seed) => autoplay(level, "fast", seed));

    expect(first).toEqual(second);
  });
});

describe("every level", () => {
  // Each is played from its number as the seed, as `yarn report:levels`
  // plays it, so the report shows what the spec found.
  const plays = LEVELS.flatMap((entry) =>
    SPEEDS.map((speed) => [entry.data.name, speed, entry] as const),
  );

  it.each(plays)(
    "is cleared, %s at %s, within eight minutes of game time",
    (_, speed, entry) => {
      const report = autoplay(parseLevel(entry), speed, entry.number);

      expect({
        cleared: report.cleared,
        inTime: report.steps < AUTOPILOT_LIMIT,
      }).toEqual({
        cleared: true,
        inTime: true,
      });
    },
  );
});
