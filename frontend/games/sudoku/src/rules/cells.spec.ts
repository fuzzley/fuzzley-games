import {
  CELLS,
  UNITS,
  at,
  boxOf,
  colOf,
  indexAt,
  peersOf,
  rowOf,
  sees,
  unitsOf,
} from "./cells";

const SQUARES = Array.from({ length: CELLS }, (_, index) => index);

describe("the board's squares", () => {
  it("number 81 squares row by row", () => {
    expect([CELLS, indexAt(0, 0), indexAt(0, 8), indexAt(1, 0)]).toEqual([
      81, 0, 8, 9,
    ]);
  });

  it("place a square in its row, column and box", () => {
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
  });

  it("count the boxes row by row", () => {
    expect([boxOf(8), boxOf(27), boxOf(80)]).toEqual([2, 3, 8]);
  });
});

describe("UNITS", () => {
  it("lists the nine rows, the nine columns, then the nine boxes", () => {
    const nine = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    expect(UNITS.map((unit) => `${unit.kind} ${unit.n}`)).toEqual([
      ...nine.map((n) => `row ${n}`),
      ...nine.map((n) => `column ${n}`),
      ...nine.map((n) => `box ${n}`),
    ]);
  });

  it("gives a box its nine squares in reading order", () => {
    expect(UNITS[18 + 4]?.cells).toEqual([30, 31, 32, 39, 40, 41, 48, 49, 50]);
  });

  it("covers every square three times", () => {
    const counts = SQUARES.map(
      (index) => UNITS.filter((unit) => unit.cells.includes(index)).length,
    );

    expect(counts.every((n) => n === 3)).toBe(true);
  });
});

describe("unitsOf", () => {
  it("gives a square its row, column and box", () => {
    expect(unitsOf(10).map((unit) => `${unit.kind} ${unit.n}`)).toEqual([
      "row 1",
      "column 1",
      "box 0",
    ]);
  });

  it("gives a square off the board none", () => {
    expect(unitsOf(81)).toEqual([]);
  });
});

describe("peersOf", () => {
  it("gives every square 20 peers, none of them itself", () => {
    expect(
      SQUARES.every((index) => {
        const peers = peersOf(index);
        return peers.length === 20 && !peers.includes(index);
      }),
    ).toBe(true);
  });

  it("gives the squares a square sees", () => {
    expect(peersOf(0).every((peer) => sees(0, peer))).toBe(true);
  });

  it("gives a square off the board none", () => {
    expect(peersOf(-1)).toEqual([]);
  });
});

describe("at", () => {
  it("reads a list at a place", () => {
    expect(at([4, 5, 6], 1)).toBe(5);
  });

  it("reads 0 past the list's end", () => {
    expect(at([4, 5, 6], 3)).toBe(0);
  });
});

describe("sees", () => {
  it("sees along a row, a column and a box", () => {
    expect([sees(0, 8), sees(0, 72), sees(0, 20)]).toEqual([true, true, true]);
  });

  it("doesn't see a square sharing no unit, or itself", () => {
    expect([sees(0, 40), sees(0, 0)]).toEqual([false, false]);
  });
});
