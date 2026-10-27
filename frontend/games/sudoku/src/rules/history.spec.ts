import { type Move, packHistory, unpackHistory } from "./history";

const HISTORY: readonly Move[] = [
  [{ index: 3, before: { digit: 0, notes: 0 }, after: { digit: 7, notes: 0 } }],
  [
    {
      index: 12,
      before: { digit: 0, notes: 9 },
      after: { digit: 4, notes: 0 },
    },
    {
      index: 13,
      before: { digit: 0, notes: 8 },
      after: { digit: 0, notes: 0 },
    },
  ],
];

describe("packHistory", () => {
  it("writes each move as five numbers a square", () => {
    expect(packHistory(HISTORY)).toEqual([
      [3, 0, 0, 7, 0],
      [12, 0, 9, 4, 0, 13, 0, 8, 0, 0],
    ]);
  });
});

describe("unpackHistory", () => {
  it("reads back what was written", () => {
    expect(unpackHistory(packHistory(HISTORY))).toEqual(HISTORY);
  });

  it("reads an empty history", () => {
    expect(unpackHistory([])).toEqual([]);
  });

  it.each([
    ["not a list", "3,0,0,7,0"],
    ["a move that isn't a list", [{}]],
    ["an empty move", [[]]],
    ["a move cut short", [[3, 0, 0, 7]]],
    ["a square off the board", [[81, 0, 0, 7, 0]]],
    ["a digit past 9", [[3, 0, 0, 10, 0]]],
    ["notes past 9", [[3, 0, 512, 0, 0]]],
    ["a fraction", [[3.5, 0, 0, 7, 0]]],
  ])("refuses %s", (_, stored) => {
    expect(unpackHistory(stored)).toBeNull();
  });
});
