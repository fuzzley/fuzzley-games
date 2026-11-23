import type { Aim } from "@fz/brick-wall/rules/aims";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { PlayedCarelessly } from "@fz/brick-wall/testing/careless";
import { floorGames } from "@fz/brick-wall/testing/holders";
import type { Line } from "@fz/brick-wall/testing/solver";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS } from "../rules/levels/levels";
import { levelPlayOf, linePlayOf } from "./line_play";
import { ralliesOf, rallyLineHolds, rallyMarkFrom } from "./rally_mark";

/**
 * A level of a row of plain bricks, on a field 11 deep: its first round
 * rallies 1 whatever the aim; after aim 0 the second rallies 1 at aim 0,
 * 2 at 221, 3 at 206, 4 at 230, 5 at 210 and 211, and 6 at 217; and after
 * aims 0 and 0 the third rallies 5 at aim 44.
 */
const A_ROW = linePlayOf(wallFrom(["ooooooooo"], WALL_LEGEND), 11);

/** Returns the careless player's games as their lines alone, which is all a rally mark reads of them. */
function gamesOf(
  ...lines: readonly Line<Aim>[]
): readonly Pick<PlayedCarelessly<Aim>, "line">[] {
  return lines.map((line) => ({ line }));
}

/** The first level, First bounce, whose best rallies the sketch measured too. */
const FIRST_BOUNCE = LEVELS[0]!;

describe("ralliesOf", () => {
  it("gives the rally of each round a line plays from the level's opening, in turn", () => {
    expect(ralliesOf(A_ROW, [0, 212, 24])).toEqual([1, 5, 3]);
  });

  it("plays no round after the one that ends the level", () => {
    expect(ralliesOf(A_ROW, [0, 212, 24, 4, 4])).toEqual([1, 5, 3]);
  });

  it("throws a RangeError for an aim that isn't one of the 657", () => {
    expect(() => ralliesOf(A_ROW, [657])).toThrow(RangeError);
  });
});

describe("rallyMarkFrom", () => {
  it("sets the mark at the middle of the games' best rallies, once sorted", () => {
    const games = gamesOf([0, 230], [0, 0], [0, 210], [0, 221], [0, 206]);

    expect(rallyMarkFrom(A_ROW, games).mark).toBe(3);
  });

  it("sets the mark at the higher of the two middles of an even count", () => {
    const games = gamesOf([0, 230], [0, 0], [0, 221], [0, 206]);

    expect(rallyMarkFrom(A_ROW, games).mark).toBe(3);
  });

  it("keeps the shots of the game that reached the mark soonest, to its flight at the mark", () => {
    // Each game's best is 5, the first's on its third round and the
    // second's on its second, which a third shot follows.
    const games = gamesOf([0, 0, 44], [0, 210, 0]);

    expect([ralliesOf(A_ROW, [0, 0, 44]), rallyMarkFrom(A_ROW, games)]).toEqual(
      [[1, 1, 5], { mark: 5, line: [0, 210] }],
    );
  });

  it("keeps the first of the games that reached the mark as soon", () => {
    const games = gamesOf([0, 211], [0, 210]);

    expect(rallyMarkFrom(A_ROW, games).line).toEqual([0, 211]);
  });

  it("throws a RangeError for no games", () => {
    expect(() => rallyMarkFrom(A_ROW, [])).toThrow(RangeError);
  });

  it("sets First bounce's marks on fields 11 and 16 deep from its floor games where the sketch's games did", () => {
    // docs/rickashay/sketch/results.md: a game's best rally, at the middle,
    // 18 on a field 11 deep and 24 on one 16 deep.
    const marks = [11, 16].map(
      (depth) =>
        rallyMarkFrom(
          levelPlayOf(FIRST_BOUNCE, depth),
          floorGames(levelPlayOf, FIRST_BOUNCE, depth),
        ).mark,
    );

    expect(marks).toEqual([18, 24]);
  });

  it("keeps a line that holds, its last flight at the mark or over", () => {
    const play = levelPlayOf(FIRST_BOUNCE, 16);
    const games = floorGames(levelPlayOf, FIRST_BOUNCE, 16);

    const { mark, line } = rallyMarkFrom(play, games);

    expect(rallyLineHolds(line, ralliesOf(play, line), mark)).toBe(true);
  });
});

describe("rallyLineHolds", () => {
  it("holds a line whose last flight reaches the mark", () => {
    expect(rallyLineHolds([197, 215], [5, 36], 24)).toBe(true);
  });

  it("holds a line whose last flight rallies the mark exactly", () => {
    expect(rallyLineHolds([197, 215], [5, 24], 24)).toBe(true);
  });

  it("refuses a line whose last flight falls short, though an earlier one reached the mark", () => {
    expect(rallyLineHolds([197, 215], [30, 5], 24)).toBe(false);
  });

  it("refuses a line whose level ended before its last shot", () => {
    expect(rallyLineHolds([197, 215, 3], [5, 36], 24)).toBe(false);
  });

  it("refuses a line of no shots", () => {
    expect(rallyLineHolds([], [], 0)).toBe(false);
  });
});
