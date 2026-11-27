import { type Dice, seededDice } from "./dice";

/** A die of as many sides as a 32-bit state has values, which shows the state itself. */
const EVERY_STATE = 2 ** 32;

/** Returns so many rolls of dice, each of a die of so many sides. */
function rolls(dice: Dice, count: number, sides: number): number[] {
  return Array.from({ length: count }, () => dice(sides));
}

describe("seededDice", () => {
  it("rolls the sketch's states from a seed", () => {
    expect(rolls(seededDice(1017), 4, EVERY_STATE)).toEqual([
      261839622, 4220421659, 1123255325, 2088212869,
    ]);
  });

  it("rolls each state's remainder by the die's sides", () => {
    expect(rolls(seededDice(1017), 4, 100)).toEqual([22, 59, 25, 69]);
  });

  it("takes a seed of 0 as 1", () => {
    expect(rolls(seededDice(0), 3, EVERY_STATE)).toEqual(
      rolls(seededDice(1), 3, EVERY_STATE),
    );
  });

  it.each([
    [2 ** 32 + 1017, 1017],
    [-1, 2 ** 32 - 1],
  ])("takes a seed of %i by its low 32 bits, as %i", (seed, low) => {
    expect(rolls(seededDice(seed), 3, EVERY_STATE)).toEqual(
      rolls(seededDice(low), 3, EVERY_STATE),
    );
  });
});
