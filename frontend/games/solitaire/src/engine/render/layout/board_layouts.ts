import { FormFactor } from "./form_factor";
import { TableLayoutSpec } from "./table_layout";
import {
  PilePosition,
  StockSide,
  BoardArrangement,
  resolveArrangement,
} from "./board_arrangement";

/** Holds a grid for each place the piles that are not columns may go. */
export type GridsByPilePosition = {
  readonly [Position in PilePosition]: TableLayoutSpec;
};

/**
 * Holds the grids a game's board lies on in every arrangement a player may
 * choose, on every shape of screen.
 */
export interface ArrangedLayouts {
  /** For a screen with room to spare. */
  readonly roomy: GridsByPilePosition;
  /** For a phone held upright. */
  readonly portrait: GridsByPilePosition;
  /** For a phone on its side. */
  readonly landscape: GridsByPilePosition;
  /**
   * The columns, left to right, which a mirror moves as one block but keeps
   * in order on every grid, since a player reads them left to right whichever
   * side the stock is on.
   */
  readonly columns: readonly string[];
  /**
   * The pile the side setting places: the stock, or whatever pile the player
   * plays from most in a game without one. A grid that has it in the other
   * half from the side chosen is mirrored; a board without one never is.
   */
  readonly side?: string;
}

/** Holds every grid a game's board may lie on. */
export interface BoardLayouts {
  /**
   * The grid for a screen with room to spare, and wherever no other applies.
   * It is the arranged roomy grid with the piles at the top, when there is one.
   */
  readonly roomy: TableLayoutSpec;
  /**
   * The grids for every arrangement. A game without them lies on its roomy
   * grid everywhere, and is never mirrored.
   */
  readonly arranged?: ArrangedLayouts;
}

/** Stands for no columns kept in order, as a key into the mirror cache. */
const NO_COLUMNS: readonly string[] = [];

/**
 * Each grid's mirror images, by the columns they kept in order, kept so a frame
 * does not build one again.
 */
const mirrors = new WeakMap<
  TableLayoutSpec,
  WeakMap<readonly string[], TableLayoutSpec>
>();

/**
 * Returns a grid as it looks in a mirror: every slot in the column opposite,
 * its offset turned around, and its sideways spreads running the other way.
 *
 * @param columns Piles that move as one block, into the mirror image of the
 *   columns they span, but keep their order within it.
 */
export function mirrorTable(
  spec: TableLayoutSpec,
  columns: readonly string[] = NO_COLUMNS,
): TableLayoutSpec {
  const byColumns = mirrors.get(spec) ?? new WeakMap();
  mirrors.set(spec, byColumns);
  const known = byColumns.get(columns);
  if (known) return known;

  const kept = new Set(columns);
  const block = spec.slots
    .filter((slot) => kept.has(slot.pileId))
    .map((slot) => slot.column);
  const blockStart = Math.min(...block);
  const blockEnd = Math.max(...block);

  const mirrored: TableLayoutSpec = {
    ...spec,
    slots: spec.slots.map((slot) => ({
      ...slot,
      column: kept.has(slot.pileId)
        ? spec.columns - 1 - blockEnd + (slot.column - blockStart)
        : spec.columns - 1 - slot.column,
      // Subtracted from zero so an offset of nothing stays positive zero.
      offset: slot.offset && { x: 0 - slot.offset.x, y: slot.offset.y },
    })),
    mirrored: !spec.mirrored,
  };
  byColumns.set(columns, mirrored);
  return mirrored;
}

/**
 * Returns the grid a board lies on for a shape of screen and the player's
 * arrangement: the one with the piles where they were asked for, mirrored
 * when that leaves the side pile on the other side, with the columns kept in
 * order.
 */
export function chooseTableLayout(
  layouts: BoardLayouts,
  formFactor: FormFactor,
  arrangement: BoardArrangement,
): TableLayoutSpec {
  const arranged = layouts.arranged;
  if (!arranged) return layouts.roomy;

  const { piles, stockSide } = resolveArrangement(arrangement, formFactor);
  const grid = gridsFor(arranged, formFactor)[piles];
  const side = arranged.side === undefined ? null : sideOf(grid, arranged.side);
  return side === null || side === stockSide
    ? grid
    : mirrorTable(grid, arranged.columns);
}

/** Returns a game's grids for a shape of screen. */
function gridsFor(
  arranged: ArrangedLayouts,
  formFactor: FormFactor,
): GridsByPilePosition {
  switch (formFactor) {
    case "roomy":
      return arranged.roomy;
    case "phone-portrait":
      return arranged.portrait;
    case "phone-landscape":
      return arranged.landscape;
  }
}

/**
 * Returns which half of a grid a pile sits in, or null when it straddles the
 * middle or is not on the grid.
 */
function sideOf(grid: TableLayoutSpec, pileId: string): StockSide | null {
  const slot = grid.slots.find((placed) => placed.pileId === pileId);
  if (!slot) return null;
  // Twice the distance from the left edge to the middle of the pile's column.
  const middle = 2 * slot.column + 1;
  if (middle === grid.columns) return null;
  return middle < grid.columns ? "left" : "right";
}
