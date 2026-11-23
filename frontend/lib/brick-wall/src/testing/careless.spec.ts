import { createRandom } from "@fz/core/random";
import type { Wall } from "../rules/wall";
import { playCarelessly } from "./careless";
import { MADE_UP_RULES, type MadeUpKind, madeUpPlay } from "./made_up/wall";
import type { LinePlay } from "./solver";

/** A level of two bricks of clay, which aims 0 and 4 clear. */
const TWO_BRICKS = madeUpPlay(["1...1...."], 11);

/** A level of a brick of clay that never breaks, three rows over the wall's lowest: it jumps once and is lost in six rounds. */
const HIGH_BRICK = madeUpPlay(
  ["#........", ".........", ".........", "........."],
  11,
);

/** How many aims a play of numbered shots has. */
const AIMS = 40;

/** Returns how many shots an aim of a play of numbered shots has: one, two or three, in turn. */
function shotsAt(aim: number): number {
  return (aim % 3) + 1;
}

/** How many shots a play of numbered shots has in all. */
const SHOTS = Array.from({ length: AIMS }, (_, aim) => shotsAt(aim)).reduce(
  (sum, count) => sum + count,
);

/** Describes where a round of a play of numbered shots starts: the shot last played, and a wall with no brick. */
interface Numbered {
  readonly wall: Wall<MadeUpKind>;
  readonly last: number | null;
}

/**
 * Returns a play of {@link SHOTS} shots numbered in turn over {@link AIMS}
 * aims, from one to three an aim, whose level is never cleared or lost,
 * each round measured by `score` of the shot it played.
 */
function numberedPlay(
  score: (shot: number) => number,
): LinePlay<MadeUpKind, Numbered, number> {
  const wall: Wall<MadeUpKind> = { bricks: [], rows: 0, lowestRow: 5 };
  let next = 0;
  const shots = Array.from({ length: AIMS }, (_, aim) =>
    Array.from({ length: shotsAt(aim) }, () => next++),
  );
  return {
    opening: { wall, last: null },
    shots,
    play: (_, shot) => ({
      outcome: { result: "on", jumped: false },
      next: { wall, last: shot },
    }),
    keyOf: ({ last }) => String(last),
    score: ({ next: { last } }) => score(last ?? -1),
    wallRules: MADE_UP_RULES,
  };
}

/**
 * Returns the shots a seed draws of a play of numbered shots, sixteen a
 * round, round by round: each one draw over every shot, aim by aim, as the
 * floors' games are drawn.
 */
function looksOf(seed: number, rounds: number): number[][] {
  const random = createRandom(seed);
  return Array.from({ length: rounds }, () =>
    Array.from({ length: 16 }, () => Math.floor(random() * SHOTS)),
  );
}

describe("playCarelessly", () => {
  it("clears a level it can", () => {
    expect(playCarelessly(TWO_BRICKS, 1)).toMatchObject({
      cleared: true,
      rounds: 2,
    });
  });

  it("plays the same game from the same seed", () => {
    expect(playCarelessly(TWO_BRICKS, 7)).toEqual(
      playCarelessly(TWO_BRICKS, 7),
    );
  });

  it("plays the best of sixteen shots a round, each drawn from its seed over every shot, aim by aim", () => {
    const { line } = playCarelessly(
      numberedPlay((shot) => shot),
      3,
    );

    expect(line).toEqual(looksOf(3, 150).map((looks) => Math.max(...looks)));
  });

  it("plays the first of the best where they tie", () => {
    const { line } = playCarelessly(
      numberedPlay(() => 0),
      3,
    );

    expect(line).toEqual(looksOf(3, 150).map(([first]) => first));
  });

  it("gives a level up after 150 rounds", () => {
    expect(
      playCarelessly(
        numberedPlay(() => 0),
        3,
      ),
    ).toMatchObject({
      cleared: false,
      rounds: 150,
    });
  });

  it("loses a level it can't clear, counting its rounds, its jumps and the lowest row a needed brick stood in", () => {
    const played = playCarelessly(HIGH_BRICK, 1);

    expect({ ...played, line: played.line.length }).toEqual({
      cleared: false,
      rounds: 6,
      jumps: 1,
      leastRow: 1,
      line: 6,
    });
  });
});
