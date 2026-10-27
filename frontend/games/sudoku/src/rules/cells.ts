/** The squares on a board: nine rows of nine, numbered 0 to 80 row by row. */
export const CELLS = 81;

/** Names a kind of unit: the nine squares that must hold 1 to 9 once each. */
export type UnitKind = "row" | "column" | "box";

/** Describes one of the board's 27 units. */
export interface Unit {
  readonly kind: UnitKind;
  /** Which row, column or box it is, from 0, boxes counted row by row. */
  readonly n: number;
  /** Its squares, in reading order. */
  readonly cells: readonly number[];
}

/** Returns the row a square is in, from 0. */
export function rowOf(index: number): number {
  return Math.floor(index / 9);
}

/** Returns the column a square is in, from 0. */
export function colOf(index: number): number {
  return index % 9;
}

/** Returns the box a square is in, from 0, the boxes counted row by row. */
export function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

/** Returns the square at a row and a column. */
export function indexAt(row: number, col: number): number {
  return row * 9 + col;
}

const NINE = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

/** The 27 units: the nine rows, then the nine columns, then the nine boxes. */
export const UNITS: readonly Unit[] = [
  ...NINE.map((n) => ({
    kind: "row" as const,
    n,
    cells: NINE.map((col) => indexAt(n, col)),
  })),
  ...NINE.map((n) => ({
    kind: "column" as const,
    n,
    cells: NINE.map((row) => indexAt(row, n)),
  })),
  ...NINE.map((n) => ({
    kind: "box" as const,
    n,
    cells: NINE.map((i) =>
      indexAt(Math.floor(n / 3) * 3 + Math.floor(i / 3), (n % 3) * 3 + (i % 3)),
    ),
  })),
];

/** Each square's three units, in `UNITS`' order: row, column, box. */
const UNITS_OF: readonly (readonly Unit[])[] = Array.from(
  { length: CELLS },
  (_, index) => UNITS.filter((unit) => unit.cells.includes(index)),
);

/** Each square's 20 peers: the other squares of its row, column and box. */
const PEERS: readonly (readonly number[])[] = Array.from(
  { length: CELLS },
  (_, index) => {
    const peers = new Set(unitsOf(index).flatMap((each) => each.cells));
    peers.delete(index);
    return [...peers].sort((a, b) => a - b);
  },
);

/** Returns a square's three units, its row, its column and its box. */
export function unitsOf(index: number): readonly Unit[] {
  return UNITS_OF[index] ?? [];
}

/** Returns a square's 20 peers, the other squares of its units, in order. */
export function peersOf(index: number): readonly number[] {
  return PEERS[index] ?? [];
}

/**
 * Returns what a list of numbers holds at a place, or 0 past its end, as a
 * board's digits or notes hold one number a square.
 */
export function at(values: readonly number[], index: number): number {
  return values[index] ?? 0;
}

/** Returns whether two different squares share a unit. */
export function sees(a: number, b: number): boolean {
  return (
    a !== b &&
    (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b))
  );
}
