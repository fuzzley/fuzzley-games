import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS } from "../rules/levels/levels";
import { levelPlayOf, linePlayOf } from "./line_play";
import { ralliesFrom, sweetSpotOf, widestLongRun } from "./sweet_spot";

/** The first level, First bounce, whose sweet spot the sketch measured too. */
const FIRST_BOUNCE = LEVELS[0]!;

/** The aim at 45°. */
const AT_45 = 148;

describe("widestLongRun", () => {
  it("counts the aims of the widest run whose rallies each reach 8", () => {
    expect(widestLongRun([8, 9, 1, 8, 8, 30, 7, 12])).toBe(3);
  });

  it("counts none where no rally reaches 8", () => {
    expect(widestLongRun([7, 0, 7])).toBe(0);
  });

  it("counts a run that runs to the last aim", () => {
    expect(widestLongRun([1, 8, 8, 8, 8])).toBe(4);
  });
});

describe("ralliesFrom", () => {
  it("gives each aim the rally of the round it plays from the start", () => {
    const play = levelPlayOf(FIRST_BOUNCE, 11);
    const start = { ...play.opening, x: 1.5 };

    const rallies = ralliesFrom(play, start);

    expect([rallies.length, rallies[AT_45]]).toEqual([
      657,
      play.play(start, AT_45).outcome.rally,
    ]);
  });
});

describe("sweetSpotOf", () => {
  it("measures First bounce as the sketch did on fields 11 and 14 deep", () => {
    // docs/rickashay/sketch/results.md: 2.2° on a field 11 deep, and its
    // narrowest, 1.25°, on one 14 deep.
    const spots = [11, 14].map((depth) =>
      sweetSpotOf(levelPlayOf(FIRST_BOUNCE, depth)),
    );

    expect(spots).toEqual([26 / 12, 1.25]);
  });

  it("ignores where the level's opening has the fuzzball wait", () => {
    const play = levelPlayOf(FIRST_BOUNCE, 14);
    const elsewhere = { ...play, opening: { ...play.opening, x: 3 } };

    expect(sweetSpotOf(elsewhere)).toBe(1.25);
  });

  it("measures nothing where no flight rallies 8", () => {
    const oneBrick = linePlayOf(wallFrom(["o........"], WALL_LEGEND), 11);

    expect(sweetSpotOf(oneBrick)).toBe(0);
  });
});
