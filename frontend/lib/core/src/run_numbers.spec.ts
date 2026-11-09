import { createRandom, randomSeed } from "./random";
import { RunNumbers } from "./run_numbers";

/** The seed of the source the runs here draw their seeds from. */
const SOURCE_SEED = 7;

/** Returns the numbers of a game's runs, before the first. */
function newNumbers(): RunNumbers {
  return new RunNumbers(createRandom(SOURCE_SEED));
}

/** Returns the ids of as many new runs as asked for. */
function idsOf(numbers: RunNumbers, runs: number): number[] {
  return Array.from({ length: runs }, () => numbers.next().id);
}

describe("RunNumbers", () => {
  it("numbers new runs from 1", () => {
    const numbers = newNumbers();

    const ids = idsOf(numbers, 3);

    expect(ids).toEqual([1, 2, 3]);
  });

  it("draws one seed from its source for each run", () => {
    const numbers = newNumbers();
    const source = createRandom(SOURCE_SEED);
    const drawn = [randomSeed(source), randomSeed(source)];

    const seeds = [numbers.next().seed, numbers.next().seed];

    expect(seeds).toEqual(drawn);
  });

  it("draws no seed as it takes a run up", () => {
    const numbers = newNumbers();
    const source = createRandom(SOURCE_SEED);
    randomSeed(source);
    const second = randomSeed(source);
    numbers.next();

    numbers.takeUp(40);

    expect(numbers.next().seed).toBe(second);
  });

  it("numbers the next run past one taken up with a higher id", () => {
    const numbers = newNumbers();
    idsOf(numbers, 2);

    numbers.takeUp(40);

    expect(numbers.next().id).toBe(41);
  });

  it.each([1, 3])(
    "numbers the next run past its own last after one taken up with id %i, no higher",
    (id) => {
      const numbers = newNumbers();
      idsOf(numbers, 3);

      numbers.takeUp(id);

      expect(numbers.next().id).toBe(4);
    },
  );
});
