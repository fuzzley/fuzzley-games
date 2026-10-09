import { expect, it } from "vitest";
import {
  ArrangedLayouts,
  BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
  StockSide,
  chooseTableLayout,
} from "@/engine/render/layout/board_layouts";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { formFactorOf } from "@/engine/render/layout/form_factor";
import {
  FanFit,
  PileLayout,
  mirrorPileLayout,
} from "@/engine/render/layout/pile_layout";
import {
  SlotPlacement,
  TableLayoutSpec,
  measureTable,
} from "@/engine/render/layout/table_layout";
import {
  Insets,
  NO_INSETS,
  Viewport,
} from "@/engine/render/view/table_view_state";
import { PHONE_FAN_FIT } from "@/games/common/pile_layouts";

/**
 * Holds the screens, arrangements and checks every game with arranged grids is
 * held to, so a game's layout spec need only add its own.
 */

/** Returns a phone screen of a CSS size at a pixel ratio of 3. */
export function phone(width: number, height: number, insets: Insets): Viewport {
  return { width: width * 3, height: height * 3, pixelRatio: 3, insets };
}

/** The bottom bar on an upright phone. */
export const BAR: Insets = { ...NO_INSETS, bottom: 60 };

/** The rail down the side of a phone on its side. */
export const RAIL: Insets = { ...NO_INSETS, left: 64 };

/** A larger screen under the header. */
export const DESKTOP: Viewport = {
  width: 1280,
  height: 800,
  pixelRatio: 1,
  insets: { ...NO_INSETS, top: 64 },
};

/** An upright phone of the size most of the specs read. */
export const UPRIGHT = phone(390, 700, BAR);

/** A phone on its side of the size most of the specs read. */
export const SIDEWAYS = phone(780, 340, RAIL);

/**
 * Phone screens from small to large, as the browser leaves them: upright with
 * the bottom bar, and on their side with the rail.
 */
export const SCREENS: [name: string, viewport: Viewport][] = [
  ["360 × 640 upright", phone(360, 640, BAR)],
  ["390 × 700 upright", UPRIGHT],
  ["430 × 800 upright", phone(430, 800, BAR)],
  ["640 × 300 on its side", phone(640, 300, RAIL)],
  ["780 × 340 on its side", SIDEWAYS],
  ["932 × 380 on its side", phone(932, 380, RAIL)],
];

/** Auto and every arrangement a player may choose. */
export const ARRANGEMENTS: [name: string, arrangement: BoardArrangement][] = [
  ["Auto", DEFAULT_BOARD_ARRANGEMENT],
  ["top, left", { piles: "top", stockSide: "left" }],
  ["top, right", { piles: "top", stockSide: "right" }],
  ["bottom, left", { piles: "bottom", stockSide: "left" }],
  ["bottom, right", { piles: "bottom", stockSide: "right" }],
];

/** Every phone screen under every arrangement, named for the failure message. */
export const CASES = SCREENS.flatMap(([screen, viewport]) =>
  ARRANGEMENTS.map(
    ([name, arrangement]): [string, Viewport, BoardArrangement] => [
      `${screen}, ${name}`,
      viewport,
      arrangement,
    ],
  ),
);

/** Describes a column by its hidden cards and the face-up cards on them. */
export interface ColumnShape {
  readonly faceDown: number;
  readonly faceUp: number;
}

/** Returns how tall a column stands with every fan at its floor. */
export function columnHeightAtFloors(
  column: ColumnShape,
  fit: FanFit = PHONE_FAN_FIT,
): number {
  return (
    CARD_HEIGHT_PX +
    column.faceDown * fit.minFaceDownGap +
    Math.max(0, column.faceUp - 1) * fit.minFaceUpGap
  );
}

/** Returns the slot a grid gives a pile. */
export function slotOf(
  grid: TableLayoutSpec,
  pileId: string,
): SlotPlacement | undefined {
  return grid.slots.find((slot) => slot.pileId === pileId);
}

/**
 * Returns how a pile arranges its cards on a grid, given its zone's own
 * arrangement: the grid's override, turned around on a mirrored grid.
 */
export function layoutOn(
  grid: TableLayoutSpec,
  pileId: string,
  own: PileLayout,
): PileLayout {
  const chosen = grid.pileLayouts?.[pileId]?.(own) ?? own;
  return grid.mirrored ? mirrorPileLayout(chosen) : chosen;
}

/** Returns which half of a grid a pile sits in. */
export function sideOf(grid: TableLayoutSpec, pileId: string): StockSide {
  return slotOf(grid, pileId)!.column < grid.columns / 2 ? "left" : "right";
}

/**
 * Returns, for every pair of the named piles, which of them a grid puts
 * further left, so a grid of cards or a pyramid can be held to its order as a
 * row of columns is.
 */
function leftToRight(
  grid: TableLayoutSpec,
  pileIds: readonly string[],
): number[] {
  const placed = pileIds.map((pileId) => slotOf(grid, pileId)!.column);
  return placed.flatMap((column, index) =>
    placed.slice(index + 1).map((later) => Math.sign(later - column)),
  );
}

/** Returns the least room any of the named piles has on a screen. */
export function leastRoom(
  grid: TableLayoutSpec,
  viewport: Viewport,
  pileIds: readonly string[],
): number {
  const { rooms } = measureTable(grid, viewport);
  return Math.min(...pileIds.map((pileId) => rooms.get(pileId) ?? 0));
}

/** Describes a game's grids as {@link itLaysOutArrangedGrids} checks them. */
export interface ArrangedGridsUnderTest {
  /** The grid the catalog entry names for a larger screen. */
  readonly roomy: TableLayoutSpec;
  /** The grids the catalog entry names for every arrangement. */
  readonly arranged: ArrangedLayouts;
  /**
   * The column every phone grid keeps on screen at the floors, in every
   * column, under Auto and every choice.
   */
  readonly longestColumn: ColumnShape;
}

/** Returns a function giving the grid a screen and arrangement call for. */
export function gridChooser(
  game: Pick<ArrangedGridsUnderTest, "roomy" | "arranged">,
): (viewport: Viewport, arrangement?: BoardArrangement) => TableLayoutSpec {
  return (viewport, arrangement = DEFAULT_BOARD_ARRANGEMENT) =>
    chooseTableLayout(
      { roomy: game.roomy, arranged: game.arranged },
      formFactorOf(viewport),
      arrangement,
    );
}

/**
 * Declares the specs every game with arranged grids shares: its longest column
 * stays on every phone screen, its columns keep their order, its side pile
 * goes where it is asked or it is never mirrored, and a larger screen keeps
 * its own grid under Auto.
 */
export function itLaysOutArrangedGrids(game: ArrangedGridsUnderTest): void {
  const gridFor = gridChooser(game);
  const { columns, side } = game.arranged;

  it.each(CASES)(
    "keeps the longest column on screen at %s",
    (_name, viewport, arrangement) => {
      // Within a rounding error of the room exactly a card fills.
      expect(
        leastRoom(gridFor(viewport, arrangement), viewport, columns),
      ).toBeGreaterThanOrEqual(columnHeightAtFloors(game.longestColumn) - 1e-6);
    },
  );

  it.each(CASES)(
    "keeps the columns in the larger screen's order at %s",
    (_name, viewport, arrangement) => {
      const grid = gridFor(viewport, arrangement);

      expect(leftToRight(grid, columns)).toEqual(
        leftToRight(game.roomy, columns),
      );
    },
  );

  it("lays a larger screen out on its own grid by default", () => {
    expect(gridFor(DESKTOP)).toBe(game.roomy);
  });

  if (side === undefined) {
    it.each(CASES)("never mirrors a grid at %s", (_name, viewport, chosen) => {
      expect(gridFor(viewport, chosen).mirrored ?? false).toBe(false);
    });
    return;
  }

  it.each(
    [DESKTOP, ...SCREENS.map(([, viewport]) => viewport)].flatMap((viewport) =>
      (["left", "right"] as const).map(
        (chosen): [string, StockSide, Viewport] => [
          `${viewport.width / viewport.pixelRatio} × ${viewport.height / viewport.pixelRatio}`,
          chosen,
          viewport,
        ],
      ),
    ),
  )("puts the side pile where asked at %s: %s", (_name, chosen, viewport) => {
    const grid = gridFor(viewport, { piles: "auto", stockSide: chosen });

    expect(sideOf(grid, side)).toBe(chosen);
  });
}
