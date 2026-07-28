import { describe, it, expect } from "vitest";
import {
  computePileOrigins,
  computeScale,
  designSize,
} from "@/engine/render/layout/table_layout";
import {
  pileCardOffsets,
  stackedCardOffsets,
} from "@/engine/render/layout/pile_layout";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import {
  TABLEAU_PILE_LAYOUT,
  klondikePileLayout,
  wastePileLayout,
  TABLEAU_FACE_DOWN_OFFSET,
  TABLEAU_FACE_UP_OFFSET,
  TABLEAU_HOVER_EXPANSION_OFFSET,
  WASTE_FAN_OFFSET_X,
  WASTE_MAX_FAN_CARDS,
} from "@/games/klondike/klondike_zones";
import { measureKlondikeBoard } from "@/games/klondike/klondike_board";
import { computeDropGeometries } from "@/engine/render/layout/drop_geometry";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  HEADER_HEIGHT_PX,
  LAYOUT_GAP_X,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "@/engine/render/layout/card_metrics";
import { CardPile } from "@/engine/core/card/card_pile";
import {
  KlondikeRole,
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "@/games/klondike/klondike_zones";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { Viewport } from "@/engine/render/view/table_view_state";
import { makePlayingCard } from "@test/support/card_builder";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

const DESIGN_WIDTH_PX = designSize(KLONDIKE_LAYOUT).width;
const DESIGN_HEIGHT_PX = designSize(KLONDIKE_LAYOUT).height;
const CARD_SIZE = { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX };

/** A viewport at the design size, which lays out at a scale of exactly 1. */
function designViewport(overrides: Partial<Viewport> = {}): Viewport {
  return {
    width: DESIGN_WIDTH_PX,
    height: DESIGN_HEIGHT_PX,
    pixelRatio: 1,
    ...overrides,
  };
}

describe("computeScale", () => {
  it("is 1 at the design size on a 1x display", () => {
    expect(computeScale(KLONDIKE_LAYOUT, designViewport())).toBe(1);
  });

  it("halves when the viewport is half the design width", () => {
    const viewport = designViewport({ width: DESIGN_WIDTH_PX / 2 });

    expect(computeScale(KLONDIKE_LAYOUT, viewport)).toBeCloseTo(0.5, 5);
  });

  it("fits to whichever axis is tighter", () => {
    // Plenty of width, but only half the height the design needs.
    const viewport = designViewport({
      width: DESIGN_WIDTH_PX * 4,
      height: (DESIGN_HEIGHT_PX - HEADER_HEIGHT_PX) / 2 + HEADER_HEIGHT_PX,
    });

    expect(computeScale(KLONDIKE_LAYOUT, viewport)).toBeCloseTo(0.5, 5);
  });

  it("scales up to the pixel ratio on a high density display", () => {
    const viewport: Viewport = {
      width: DESIGN_WIDTH_PX * 2,
      height: DESIGN_HEIGHT_PX * 2,
      pixelRatio: 2,
    };

    // A design unit is worth two device pixels there, and rendering it as one
    // would throw away half the display's resolution.
    expect(computeScale(KLONDIKE_LAYOUT, viewport)).toBe(2);
  });

  it("caps at the pixel ratio however much room there is", () => {
    const viewport: Viewport = {
      width: DESIGN_WIDTH_PX * 10,
      height: DESIGN_HEIGHT_PX * 10,
      pixelRatio: 2,
    };

    expect(computeScale(KLONDIKE_LAYOUT, viewport)).toBe(2);
  });

  it("falls back to the pixel ratio for a zero-sized viewport", () => {
    const viewport: Viewport = { width: 0, height: 0, pixelRatio: 2 };

    expect(computeScale(KLONDIKE_LAYOUT, viewport)).toBe(2);
  });
});

describe("computePileOrigins", () => {
  it("places every pile the board draws", () => {
    const origins = computePileOrigins(KLONDIKE_LAYOUT, designViewport(), 1);

    const expectedIds = [
      STOCK_PILE_ID,
      WASTE_PILE_ID,
      ...[0, 1, 2, 3].map(foundationPileId),
      ...[0, 1, 2, 3, 4, 5, 6].map(tableauPileId),
    ];
    expect([...origins.keys()].sort()).toEqual(expectedIds.sort());
  });

  it("starts the top row below the header", () => {
    const origins = computePileOrigins(KLONDIKE_LAYOUT, designViewport(), 1);

    expect(origins.get(STOCK_PILE_ID)!.y).toBe(
      HEADER_HEIGHT_PX + LAYOUT_PADDING_Y,
    );
  });

  it("puts the tableau row a card and a gap below the top row", () => {
    const origins = computePileOrigins(KLONDIKE_LAYOUT, designViewport(), 1);

    const topY = origins.get(STOCK_PILE_ID)!.y;
    const bottomY = origins.get(tableauPileId(0))!.y;
    expect(bottomY).toBeGreaterThan(topY + CARD_HEIGHT_PX);
  });

  it("lines each tableau up with its column", () => {
    const origins = computePileOrigins(KLONDIKE_LAYOUT, designViewport(), 1);

    const columnWidth = CARD_WIDTH_PX + LAYOUT_GAP_X;
    const firstX = origins.get(tableauPileId(0))!.x;
    expect(origins.get(tableauPileId(3))!.x).toBeCloseTo(
      firstX + 3 * columnWidth,
      5,
    );
  });

  it("leaves a clear column between the waste and the first foundation", () => {
    const origins = computePileOrigins(KLONDIKE_LAYOUT, designViewport(), 1);

    // Waste sits in column 1 and foundations start at column 3, so the fan has
    // the whole of column 2 to grow into.
    const columnWidth = CARD_WIDTH_PX + LAYOUT_GAP_X;
    const gap =
      origins.get(foundationPileId(0))!.x - origins.get(WASTE_PILE_ID)!.x;
    expect(gap).toBeCloseTo(2 * columnWidth, 5);
  });

  it("centers the layout when the viewport is wider than it needs", () => {
    const wide = designViewport({ width: DESIGN_WIDTH_PX * 2 });

    const origins = computePileOrigins(KLONDIKE_LAYOUT, wide, 1);

    const layoutWidth =
      TABLEAU_COUNT * CARD_WIDTH_PX + (TABLEAU_COUNT - 1) * LAYOUT_GAP_X;
    const expectedPadding = (wide.width - layoutWidth) / 2;
    expect(origins.get(tableauPileId(0))!.x).toBeCloseTo(expectedPadding, 5);
  });

  it("never squeezes tighter than the layout padding", () => {
    const narrow = designViewport({ width: 100 });

    const origins = computePileOrigins(KLONDIKE_LAYOUT, narrow, 1);

    expect(origins.get(tableauPileId(0))!.x).toBe(LAYOUT_PADDING_X);
  });

  it("converts the header by the pixel ratio, not the layout scale", () => {
    // The header is a DOM overlay measured in CSS pixels.
    const origins = computePileOrigins(
      KLONDIKE_LAYOUT,
      {
        width: DESIGN_WIDTH_PX * 2,
        height: DESIGN_HEIGHT_PX * 2,
        pixelRatio: 2,
      },
      2,
    );

    expect(origins.get(STOCK_PILE_ID)!.y).toBe(
      HEADER_HEIGHT_PX * 2 + LAYOUT_PADDING_Y * 2,
    );
  });
});

describe("stackedCardOffsets", () => {
  it("stacks every card at the pile origin", () => {
    expect(stackedCardOffsets(3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("is empty for an empty pile", () => {
    expect(stackedCardOffsets(0)).toEqual([]);
  });
});

describe("tableauCardOffsets", () => {
  /** A tableau column of face-down cards with `faceUpCount` face up on top. */
  function column(faceDownCount: number, faceUpCount: number): PlayingCard[] {
    return [
      ...Array.from({ length: faceDownCount }, (_, i) =>
        makePlayingCard({ id: `down-${i}`, faceUp: false }),
      ),
      ...Array.from({ length: faceUpCount }, (_, i) =>
        makePlayingCard({ id: `up-${i}`, faceUp: true }),
      ),
    ];
  }

  it("gives a face-down card the tighter gap", () => {
    const offsets = pileCardOffsets(TABLEAU_PILE_LAYOUT, column(2, 0), null);

    expect(offsets[1].y).toBe(TABLEAU_FACE_DOWN_OFFSET);
  });

  it("gives a face-up card the wider gap", () => {
    const offsets = pileCardOffsets(TABLEAU_PILE_LAYOUT, column(0, 2), null);

    expect(offsets[1].y).toBe(TABLEAU_FACE_UP_OFFSET);
  });

  it("starts the column at its origin", () => {
    const offsets = pileCardOffsets(TABLEAU_PILE_LAYOUT, column(1, 2), null);

    expect(offsets[0]).toEqual({ x: 0, y: 0 });
  });

  it("opens an extra gap below the hovered card", () => {
    const cards = column(0, 3);
    const plain = pileCardOffsets(TABLEAU_PILE_LAYOUT, cards, null);

    const expanded = pileCardOffsets(TABLEAU_PILE_LAYOUT, cards, cards[1].id);

    expect(expanded[2].y - plain[2].y).toBe(TABLEAU_HOVER_EXPANSION_OFFSET);
  });

  it("leaves cards above the hovered one where they were", () => {
    const cards = column(0, 3);
    const plain = pileCardOffsets(TABLEAU_PILE_LAYOUT, cards, null);

    const expanded = pileCardOffsets(TABLEAU_PILE_LAYOUT, cards, cards[1].id);

    expect(expanded.slice(0, 2)).toEqual(plain.slice(0, 2));
  });

  it("fans straight down, never sideways", () => {
    const offsets = pileCardOffsets(TABLEAU_PILE_LAYOUT, column(2, 2), null);

    expect(offsets.every((offset) => offset.x === 0)).toBe(true);
  });
});

describe("wasteCardOffsets", () => {
  it("shows only the top card in Draw 1", () => {
    const offsets = pileCardOffsets(
      wastePileLayout(1),
      Array.from({ length: 4 }, () => makePlayingCard()),
    );

    expect(offsets).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("fans the top three in Draw 3", () => {
    const offsets = pileCardOffsets(
      wastePileLayout(3),
      Array.from({ length: 3 }, () => makePlayingCard()),
    );

    expect(offsets.map((offset) => offset.x)).toEqual([
      0,
      WASTE_FAN_OFFSET_X,
      2 * WASTE_FAN_OFFSET_X,
    ]);
  });

  it("keeps the buried cards stacked under the fan", () => {
    const offsets = pileCardOffsets(
      wastePileLayout(3),
      Array.from({ length: 5 }, () => makePlayingCard()),
    );

    // Only the last three fan; the two beneath sit at the origin.
    expect(offsets.slice(0, 2).map((offset) => offset.x)).toEqual([0, 0]);
  });

  it("never fans more than the maximum", () => {
    const offsets = pileCardOffsets(
      wastePileLayout(3),
      Array.from({ length: 10 }, () => makePlayingCard()),
    );

    const fanned = offsets.filter((offset) => offset.x > 0).length;
    expect(fanned).toBe(WASTE_MAX_FAN_CARDS - 1);
  });

  it("keeps the fan on one row", () => {
    const offsets = pileCardOffsets(
      wastePileLayout(3),
      Array.from({ length: 3 }, () => makePlayingCard()),
    );

    expect(offsets.every((offset) => offset.y === 0)).toBe(true);
  });
});

describe("offsetsForPile", () => {
  it("fans a waste pile horizontally", () => {
    const pile = new CardPile<PlayingCard>(WASTE_PILE_ID, KlondikeRole.WASTE);
    pile.addCard(makePlayingCard({ id: "a", faceUp: true }));
    pile.addCard(makePlayingCard({ id: "b", faceUp: true }));

    const offsets = pileCardOffsets(
      klondikePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets[1].x).toBe(WASTE_FAN_OFFSET_X);
  });

  it("fans a tableau pile downwards", () => {
    const pile = new CardPile<PlayingCard>(
      tableauPileId(0),
      KlondikeRole.TABLEAU,
    );
    pile.addCard(makePlayingCard({ id: "a", faceUp: true }));
    pile.addCard(makePlayingCard({ id: "b", faceUp: true }));

    const offsets = pileCardOffsets(
      klondikePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets[1]).toEqual({ x: 0, y: TABLEAU_FACE_UP_OFFSET });
  });

  it("stacks a stock pile", () => {
    const pile = new CardPile<PlayingCard>(STOCK_PILE_ID, KlondikeRole.STOCK);
    pile.addCard(makePlayingCard({ id: "a" }));
    pile.addCard(makePlayingCard({ id: "b" }));

    const offsets = pileCardOffsets(
      klondikePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("stacks a foundation pile", () => {
    const pile = new CardPile<PlayingCard>(
      foundationPileId(0),
      KlondikeRole.FOUNDATION,
    );
    pile.addCard(makePlayingCard({ id: "a", faceUp: true }));
    pile.addCard(makePlayingCard({ id: "b", faceUp: true }));

    const offsets = pileCardOffsets(
      klondikePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets[1]).toEqual({ x: 0, y: 0 });
  });
});

describe("computeDropGeometries", () => {
  let game: KlondikeGame;

  function dropGeometries() {
    const metrics = measureKlondikeBoard(designViewport());
    return computeDropGeometries(
      game.dropTargetPiles.map((pile) => ({
        pile,
        layout: game.zoneFor(pile.id)!.layout,
      })),
      metrics.origins,
      CARD_SIZE,
      metrics.scale,
    );
  }

  function geometryFor(pileId: string) {
    return dropGeometries().find((geometry) => geometry.pileId === pileId);
  }

  beforeEach(() => {
    game = new KlondikeGame();
    game.startNewGame();
    emptyBoard(game);
  });

  it("offers every foundation and tableau as a target", () => {
    const pileIds = dropGeometries().map((geometry) => geometry.pileId);

    expect(pileIds.sort()).toEqual(
      [
        ...[0, 1, 2, 3].map(foundationPileId),
        ...[0, 1, 2, 3, 4, 5, 6].map(tableauPileId),
      ].sort(),
    );
  });

  it("does not offer the stock or waste, which accept no drops", () => {
    const pileIds = dropGeometries().map((geometry) => geometry.pileId);

    expect(pileIds).not.toContain(STOCK_PILE_ID);
    expect(pileIds).not.toContain(WASTE_PILE_ID);
  });

  it("sizes an empty tableau to a single card", () => {
    expect(geometryFor(tableauPileId(0))!.height).toBe(CARD_HEIGHT_PX);
  });

  it("grows a tableau's target with the cards fanned down it", () => {
    relocate(game, "card-spades-king", game.tableaus[0]);
    relocate(game, "card-hearts-queen", game.tableaus[0]);

    // A card dropped low in the column still has to overlap it.
    expect(geometryFor(tableauPileId(0))!.height).toBe(
      CARD_HEIGHT_PX + TABLEAU_FACE_UP_OFFSET,
    );
  });

  it("leaves a foundation at a single card however many it holds", () => {
    relocate(game, "card-hearts-ace", game.foundations[0]);
    relocate(game, "card-hearts-2", game.foundations[0]);

    expect(geometryFor(foundationPileId(0))!.height).toBe(CARD_HEIGHT_PX);
  });

  it("puts each target where its pile is", () => {
    const origins = computePileOrigins(KLONDIKE_LAYOUT, designViewport(), 1);

    const geometry = geometryFor(tableauPileId(2))!;

    expect({ x: geometry.x, y: geometry.y }).toEqual(
      origins.get(tableauPileId(2)),
    );
  });

  it("scales the targets with the viewport", () => {
    const half = designViewport({ width: DESIGN_WIDTH_PX / 2 });

    const metrics = measureKlondikeBoard(half);
    const geometry = computeDropGeometries(
      game.dropTargetPiles.map((pile) => ({
        pile,
        layout: game.zoneFor(pile.id)!.layout,
      })),
      metrics.origins,
      CARD_SIZE,
      metrics.scale,
    ).find((candidate) => candidate.pileId === tableauPileId(0))!;

    expect(geometry.width).toBeCloseTo(
      CARD_WIDTH_PX * computeScale(KLONDIKE_LAYOUT, half),
      5,
    );
  });
});
