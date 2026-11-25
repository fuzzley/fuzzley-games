import { boltsBack, lockBolts, lockTint } from "./lock_tint";

describe("lockTint", () => {
  it.each([
    [1, 0, 1],
    [1, 1, 5],
    [2, 1, 6],
    [2, 2, 10],
    [3, 1, 7],
    [3, 2, 11],
    [3, 3, 15],
  ])(
    "gives a lock of %i bolts, %i of them drawn back, the tint %i",
    (bolts, drawn, tint) => {
      expect(lockTint(bolts, drawn)).toBe(tint);
    },
  );

  it("draws back no more bolts than a lock has, so one of fewer than are drawn shows open", () => {
    expect([lockTint(1, 3), lockTint(2, 3)]).toEqual([5, 10]);
  });

  it("reads a lock's bolts from the tint the view gave it at the bolt before", () => {
    expect(lockTint(lockTint(3, 1), 2)).toBe(lockTint(3, 2));
  });
});

describe("lockBolts and boltsBack", () => {
  it.each([
    [1, 1, 0],
    [3, 3, 0],
    [5, 1, 1],
    [11, 3, 2],
    [15, 3, 3],
  ])(
    "read a lock's tint %i as %i bolts, %i of them drawn back",
    (tint, bolts, back) => {
      expect([lockBolts(tint), boltsBack(tint)]).toEqual([bolts, back]);
    },
  );
});
