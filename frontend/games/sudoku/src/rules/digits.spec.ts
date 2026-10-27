import {
  ALL_DIGITS,
  bit,
  digitsIn,
  firstDigit,
  has,
  isDigitSet,
  setOf,
  size,
} from "./digits";

describe("sets of digits", () => {
  it("hold a digit as its bit", () => {
    expect([bit(1), bit(9)]).toEqual([1, 256]);
  });

  it("say whether they hold a digit", () => {
    expect([has(setOf([1, 4]), 4), has(setOf([1, 4]), 5)]).toEqual([
      true,
      false,
    ]);
  });

  it("count their digits", () => {
    expect([size(0), size(setOf([2, 5, 9])), size(ALL_DIGITS)]).toEqual([
      0, 3, 9,
    ]);
  });

  it("list their digits, smallest first", () => {
    expect(digitsIn(setOf([8, 1, 4]))).toEqual([1, 4, 8]);
  });

  it("give their smallest digit, or 0 when empty", () => {
    expect([
      firstDigit(setOf([7, 3])),
      firstDigit(bit(9)),
      firstDigit(0),
    ]).toEqual([3, 9, 0]);
  });

  it.each([0, 1, ALL_DIGITS])("accept %d as a set", (value) => {
    expect(isDigitSet(value)).toBe(true);
  });

  it.each([-1, 512, 1.5, "3", null])("refuse %s as a set", (value) => {
    expect(isDigitSet(value)).toBe(false);
  });
});
