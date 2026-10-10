import { describe, it, expect } from "vitest";
import {
  computePileOrigins,
  computeScale,
} from "@/engine/render/layout/table_metrics";
import { designSize } from "@/engine/render/layout/table_layout";
import {
  FAKE_TABLE_LAYOUT,
  measureFakeTable,
} from "@test/support/fake_table/board";
import {
  TABLEAU_FACE_UP_OFFSET,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "@test/support/fake_table/zones";
import {
  computeDropGeometries,
  resolveDropTarget,
  PileGeometry,
} from "@/engine/render/layout/drop_geometry";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
} from "@/engine/render/layout/card_metrics";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { FakeTableGame } from "@test/support/fake_table/game";
import { NO_INSETS, Viewport } from "@/engine/render/layout/viewport";
import { Rect } from "@/engine/render/layout/geometry";
import { makePlayingCard } from "@test/support/card_builder";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

const DESIGN_WIDTH_PX = designSize(FAKE_TABLE_LAYOUT).width;

const DESIGN_HEIGHT_PX = designSize(FAKE_TABLE_LAYOUT).height;

const CARD_SIZE = { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX };

/** A header laid over the top of the canvas, in CSS pixels, as the shell's is. */
const INSET_TOP = 73;

/**
 * Returns a viewport at the design size below a header, which lays out at a
 * scale of 1.
 */
function designViewport(overrides: Partial<Viewport> = {}): Viewport {
  return {
    width: DESIGN_WIDTH_PX,
    height: DESIGN_HEIGHT_PX + INSET_TOP,
    pixelRatio: 1,
    insets: { ...NO_INSETS, top: INSET_TOP },
    ...overrides,
  };
}

describe("computeDropGeometries", () => {
  let game: FakeTableGame;

  function dropGeometries() {
    const metrics = measureFakeTable(designViewport());
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
    game = new FakeTableGame();
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

  it("grows a target across with the cards fanned along it", () => {
    const row = new CardPile<PlayingCard>("row");
    row.addCard(makePlayingCard({ id: "first" }));
    row.addCard(makePlayingCard({ id: "second" }));
    const fanned = {
      kind: "spread",
      direction: "right",
      gap: 55,
      maxVisible: 52,
    } as const;

    const [geometry] = computeDropGeometries(
      [{ pile: row, layout: fanned }],
      new Map([["row", { x: 0, y: 0 }]]),
      CARD_SIZE,
      1,
    );

    expect([geometry?.width, geometry?.height]).toEqual([
      CARD_WIDTH_PX + 55,
      CARD_HEIGHT_PX,
    ]);
  });

  it("starts a leftward spread's target left of its origin", () => {
    const row = new CardPile<PlayingCard>("row");
    row.addCard(makePlayingCard({ id: "first" }));
    row.addCard(makePlayingCard({ id: "second" }));
    const spread = {
      kind: "spread",
      direction: "left",
      gap: 55,
      maxVisible: 52,
    } as const;

    const [geometry] = computeDropGeometries(
      [{ pile: row, layout: spread }],
      new Map([["row", { x: 200, y: 0 }]]),
      CARD_SIZE,
      1,
    );

    expect([geometry?.x, geometry?.width]).toEqual([145, CARD_WIDTH_PX + 55]);
  });

  it("leaves a foundation at a single card however many it holds", () => {
    relocate(game, "card-hearts-ace", game.foundations[0]);
    relocate(game, "card-hearts-2", game.foundations[0]);

    expect(geometryFor(foundationPileId(0))!.height).toBe(CARD_HEIGHT_PX);
  });

  it("puts each target where its pile is", () => {
    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, designViewport(), 1);

    const geometry = geometryFor(tableauPileId(2))!;

    expect({ x: geometry.x, y: geometry.y }).toEqual(
      origins.get(tableauPileId(2)),
    );
  });

  it("scales the targets with the viewport", () => {
    const half = designViewport({ width: DESIGN_WIDTH_PX / 2 });

    const metrics = measureFakeTable(half);
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
      CARD_WIDTH_PX * computeScale(FAKE_TABLE_LAYOUT, half),
      5,
    );
  });
});

describe("resolveDropTarget", () => {
  const geometries: PileGeometry[] = [
    { pileId: "tableau-0", x: 100, y: 300, width: 200, height: 300 },
    { pileId: "tableau-1", x: 400, y: 300, width: 200, height: 300 },
    { pileId: "foundation-0", x: 400, y: 50, width: 200, height: 300 },
  ];

  it("returns the pile ID with the maximum overlap area", () => {
    // Overlaps tableau-0 partially
    const dragRect: Rect = { x: 150, y: 350, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target?.pileId).toBe("tableau-0");
  });

  it("returns null if there is no overlap at all", () => {
    const dragRect: Rect = { x: 800, y: 800, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBeNull();
  });

  it("resolves overlap correctly when overlapping multiple piles", () => {
    // Positioned right between tableau-0 and tableau-1 but mostly on tableau-1
    const dragRect: Rect = { x: 350, y: 300, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target?.pileId).toBe("tableau-1");
  });
});
