// Where every piece stands as a move plays: the board as the screen shows
// it after the swap, and after each wave, worked out from the record's
// hits and falls, so each event finds the pieces it moves where they are.

import { itemAt } from "@fz/core/records";
import type { KindId } from "../../rules/catalog/kinds";
import type { Piece } from "../../rules/catalog/pieces";
import type { MadeId } from "../../rules/catalog/specials";
import type { Fall, Hit, Swap, Wave } from "../../rules/move/record";
import type { GridShown, SquareShown } from "../run_state";

/**
 * Returns the board after a swap kept: the two traded, but where both go
 * off, as two specials swapped together do, the first stands on the
 * second's square and the second is gone. A swap refused, or a special set
 * off where it stands, leaves it as it was.
 */
export function afterSwap(grid: GridShown, swap: Swap): GridShown {
  if (swap.refused || swap.from === swap.to) {
    return grid;
  }
  const from = grid.squares[swap.from]?.piece ?? null;
  const to = grid.squares[swap.to]?.piece ?? null;
  const both = from !== null && to !== null && goesOff(from) && goesOff(to);
  return withPieces(
    grid,
    new Map([
      [swap.from, both ? null : to],
      [swap.to, from],
    ]),
  );
}

/**
 * Returns the board after a wave: what it gathered, broke, set off or put
 * to bed gone, each cage, burr, brick's layer and dust it took off taken
 * off, each special it made standing where its bunch made it, and each
 * fall landed.
 *
 * @throws {RangeError} for a fall of a piece that isn't on the board, or a
 *   fuzzball let in with no kind.
 */
export function afterWave(grid: GridShown, wave: Wave): GridShown {
  return without(
    fallenOn(afterHits(grid, wave), wave.falls),
    new Set(
      wave.hits.flatMap((hit) => (hit.what === "bedded" ? [hit.piece] : [])),
    ),
  );
}

/**
 * Returns each piece a wave's falls bring down, in their order, as it is
 * once the wave's hits have landed on the board.
 *
 * @throws {RangeError} for a fall of a piece that isn't on the board, or a
 *   fuzzball let in with no kind.
 */
export function fallingIn(grid: GridShown, wave: Wave): readonly Piece[] {
  const struck = afterHits(grid, wave);
  return wave.falls.map((fall) => fallingOf(struck, fall));
}

/** Returns a board with its falls landed, each piece gone from where it fell from and standing where it lands. */
function fallenOn(grid: GridShown, falls: readonly Fall[]): GridShown {
  return withPieces(
    grid,
    new Map<number, Piece | null>([
      ...falls.flatMap(({ from }): [number, null][] =>
        from === null ? [] : [[from, null]],
      ),
      ...falls.map((fall): [number, Piece] => [
        itemAt(fall.path, fall.path.length - 1),
        fallingOf(grid, fall),
      ]),
    ]),
  );
}

/** Returns the board as a wave's hits leave it, before it falls. */
function afterHits(grid: GridShown, wave: Wave): GridShown {
  const squares = [...without(grid, takenBy(wave)).squares];
  for (const hit of wave.hits) {
    const square = squares[hit.square] ?? null;
    if (square !== null) {
      squares[hit.square] = hitOn(square, hit);
    }
  }
  return { ...grid, squares };
}

/** Returns the pieces a wave takes off the board before it falls: those it gathers or breaks, and those that go off. */
export function takenBy(wave: Wave): ReadonlySet<number> {
  return new Set([
    ...wave.hits.flatMap((hit) =>
      hit.what === "gathered" || hit.what === "broken" ? [hit.piece] : [],
    ),
    ...wave.blasts.flatMap(({ piece }) => (piece === null ? [] : [piece])),
  ]);
}

/** Returns a square as a hit leaves it, before the fall. */
function hitOn(square: SquareShown, hit: Hit): SquareShown {
  const piece = square.piece;
  switch (hit.what) {
    case "uncaged":
      return piece?.what === "fuzzball"
        ? { ...square, piece: { ...piece, caged: false } }
        : square;
    case "unburred":
      return piece?.what === "fuzzball"
        ? { ...square, piece: { ...piece, burred: false } }
        : square;
    case "knocked":
      return piece?.what === "brick"
        ? { ...square, piece: { ...piece, layers: hit.layersLeft } }
        : square;
    case "dusted":
      return { ...square, dust: hit.layersLeft };
    case "born":
      return { ...square, piece: pieceMadeOf(hit.made, hit.piece, hit.kind) };
    case "gathered":
    case "broken":
    case "ruffled":
    case "bedded":
      return square;
  }
}

/** Returns the piece a fall brings down. */
function fallingOf(grid: GridShown, fall: Fall): Piece {
  if (fall.from !== null) {
    const piece = grid.squares[fall.from]?.piece ?? null;
    if (piece?.id !== fall.piece) {
      throw new RangeError(
        `Piece ${String(fall.piece)} falls from square ${String(fall.from)}, where it doesn't stand.`,
      );
    }
    return piece;
  }
  if (fall.kind === null) {
    throw new RangeError(`Piece ${String(fall.piece)} is let in with no kind.`);
  }
  return {
    what: "fuzzball",
    id: fall.piece,
    kind: fall.kind,
    special: null,
    caged: false,
    burred: false,
  };
}

/** Returns the piece a bunch of a kind makes, by its id. */
export function pieceMadeOf(made: MadeId, id: number, kind: KindId): Piece {
  return made === "frizzball"
    ? { what: "frizzball", id }
    : {
        what: "fuzzball",
        id,
        kind,
        special: made,
        caged: false,
        burred: false,
      };
}

/** Returns whether a piece is a special or the frizzball, which goes off as it is swapped. */
export function goesOff(piece: Piece): boolean {
  return (
    piece.what === "frizzball" ||
    (piece.what === "fuzzball" && piece.special !== null)
  );
}

/** Returns a board with some pieces gone from it. */
function without(grid: GridShown, pieces: ReadonlySet<number>): GridShown {
  return {
    ...grid,
    squares: grid.squares.map((square) => {
      const piece = square?.piece ?? null;
      return square === null || piece === null || !pieces.has(piece.id)
        ? square
        : { ...square, piece: null };
    }),
  };
}

/** Returns a board with some of its squares holding new pieces, or none. */
function withPieces(
  grid: GridShown,
  pieces: ReadonlyMap<number, Piece | null>,
): GridShown {
  return {
    ...grid,
    squares: grid.squares.map((square, index) => {
      const piece = pieces.get(index);
      return square === null || piece === undefined
        ? square
        : { ...square, piece };
    }),
  };
}
