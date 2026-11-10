import type { RoundResult } from "../rules/round/round";
import type { Wall } from "../rules/wall/wall";
import type { Boon } from "../rules/shot";
import { FLIGHT_FIXTURES } from "./flight_fixtures";
import { wallFrom } from "./wall_picture";
import { type MeasuredRound, wallScore } from "./wall_score";

/** Says what a round left beside its wall, where a spec cares. */
interface Left {
  readonly friends?: readonly number[];
  readonly boon?: Boon | null;
}

/** Returns a round that left its level on, its wall pictured with its lowest row in a field row. */
function leftOn(
  picture: readonly string[],
  lowestRow: number,
  left: Left = {},
): MeasuredRound {
  return leftWith(wallFrom(picture, { lowestRow }), left);
}

/** Returns a round that left its level on with a wall. */
function leftWith(
  wall: Wall,
  { friends = [], boon = null }: Left = {},
): MeasuredRound {
  return { outcome: { result: "on" }, next: { wall, crew: { friends }, boon } };
}

/** Returns a round as another result left it. */
function endedIn(result: RoundResult, round: MeasuredRound): MeasuredRound {
  return { ...round, outcome: { result } };
}

/** Returns the measure of a wall of one plain brick, its lowest row in a field row. */
function oneBrickIn(row: number): number {
  return wallScore(leftOn(["o........"], row), 1);
}

describe("wallScore", () => {
  it("measures a lost level the least, whatever its wall", () => {
    const lost = endedIn("lost", leftOn(["o........"], 6));

    expect(wallScore(lost, 3)).toBe(-1e9);
  });

  it("measures a cleared level the most, less a thousand for each round", () => {
    const cleared = endedIn("cleared", leftOn([], 6));

    expect([wallScore(cleared, 1), wallScore(cleared, 7)]).toEqual([
      1e9 - 1000,
      1e9 - 7000,
    ]);
  });

  it("measures the rounds made by hand by how they left their levels", () => {
    const { plain, cleared, lost } = FLIGHT_FIXTURES;
    // The plain round wears the tough brick in its bottom row's last
    // column to its last hit, and lowers its wall a row.
    const asLeft = leftOn(
      [
        "ooooooooo",
        "ooooooooo",
        "222222222",
        "ooooooooo",
        ".........",
        ".........",
        ".........",
        "o.......o",
      ],
      4,
    );

    expect([
      wallScore(lost.round, 2),
      wallScore(cleared.round, 2),
      wallScore(plain.round, 2),
    ]).toEqual([-1e9, 1e9 - 2000, wallScore(asLeft, 2)]);
  });

  it("weighs a brick of one hit by its hits and 1.5, times 1 and 14 over its row squared", () => {
    expect(oneBrickIn(4)).toBe(-(1 + 1.5) * (1 + 14 / 16));
  });

  it("weighs a brick that stands lower more", () => {
    expect(oneBrickIn(3)).toBeLessThan(oneBrickIn(6));
  });

  it("weighs a brick with more hits left more", () => {
    const tough = wallScore(leftOn(["3........"], 4), 1);

    expect(tough).toBe(-(3 + 1.5) * (1 + 14 / 16));
  });

  it("weighs a worn brick by the hits it has left, not those it had whole", () => {
    const whole = wallFrom(["3........"], { lowestRow: 4 });
    const worn = whole.bricks.map((brick) =>
      brick === null ? null : { ...brick, hits: 1 },
    );

    expect(wallScore(leftWith({ ...whole, bricks: worn }), 1)).toBe(
      oneBrickIn(4),
    );
  });

  it("weighs every brick the level needs, those waiting over the ceiling among them", () => {
    const air = Array.from({ length: 25 }, () => ".........");
    const both = wallScore(leftOn(["o........", ...air, "o........"], 4), 1);

    expect(both).toBe(oneBrickIn(4) + oneBrickIn(30));
  });

  it("weighs nothing for a brick the level doesn't need", () => {
    const withSteel = wallScore(leftOn(["##.......", "o#......."], 4), 1);

    expect(withSteel).toBe(oneBrickIn(4));
  });

  it("takes 500 off for a brick the level needs in the row over the floor's, once", () => {
    const one = oneBrickIn(1);
    const two = wallScore(leftOn(["oo......."], 1), 1);

    expect([one, two]).toEqual([-37.5 - 500, -75 - 500]);
  });

  it("takes 60 off for the lowest brick the level needs in row 2", () => {
    expect(oneBrickIn(2)).toBe(-11.25 - 60);
  });

  it("takes off for the lowest brick the level needs alone, whatever stands over it", () => {
    const both = wallScore(leftOn(["o........", "o........"], 1), 1);

    expect(both).toBe(-(37.5 + 11.25) - 500);
  });

  it("takes nothing off for a brick the level doesn't need, low as it stands", () => {
    const overSteel = leftOn(["o........", ".........", "#........"], 1);

    expect(wallScore(overSteel, 1)).toBe(oneBrickIn(3));
  });

  it("takes nothing off for the lowest brick in row 3 or higher", () => {
    expect(oneBrickIn(3)).toBe(-(1 + 1.5) * (1 + 14 / 9));
  });

  it("adds 6 for each friend and 25 for a boon earned, whichever", () => {
    const friends = [2, 5];
    const hot = leftOn(["o........"], 4, { friends, boon: "hot" });
    const triple = leftOn(["o........"], 4, { friends, boon: "triple" });

    expect([wallScore(hot, 1), wallScore(triple, 1)]).toEqual([
      -4.6875 + 2 * 6 + 25,
      -4.6875 + 2 * 6 + 25,
    ]);
  });

  it("measures any cleared level over any wall still standing, and any lost one under it", () => {
    const best = leftOn(["o........"], 30, {
      friends: [0, 1, 2, 3, 4, 5],
      boon: "triple",
    });
    const worst = leftOn(
      Array.from({ length: 30 }, () => "666666666"),
      1,
    );
    const cleared = endedIn("cleared", best);
    const lost = endedIn("lost", worst);

    expect([
      wallScore(cleared, 40) > wallScore(best, 40),
      wallScore(lost, 1) < wallScore(worst, 1),
    ]).toEqual([true, true]);
  });
});
