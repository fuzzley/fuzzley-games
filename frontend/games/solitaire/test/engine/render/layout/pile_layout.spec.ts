import { describe, it, expect } from "vitest";
import {
  FanDownLayout,
  FanFit,
  PileLayout,
  SpreadDirection,
  fitFanDown,
  mirrorPileLayout,
  pileBounds,
  spreadOffsets,
  pileCardOffsets,
  stackedCardOffsets,
} from "@/engine/render/layout/pile_layout";
import { makePlayingCard } from "@test/support/card_builder";
import {
  TABLEAU_PILE_LAYOUT,
  fakePileLayout,
  wastePileLayout,
  TABLEAU_FACE_DOWN_OFFSET,
  TABLEAU_FACE_UP_OFFSET,
  TABLEAU_HOVER_EXPANSION_OFFSET,
  WASTE_FAN_OFFSET_X,
  WASTE_MAX_FAN_CARDS,
  FakeRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "@test/support/fake_table/zones";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

const CARD = { width: 100, height: 150 };

/** Returns a spread of the top `maxVisible` cards, 20 apart, one way. */
function spread(
  direction: SpreadDirection,
  maxVisible = 3,
  groupSize?: number,
): Extract<PileLayout, { kind: "spread" }> {
  return { kind: "spread", direction, gap: 20, maxVisible, groupSize };
}

/** Returns `count` face-up cards. */
function cards(count: number) {
  return Array.from({ length: count }, () => makePlayingCard({ faceUp: true }));
}

describe("spreadOffsets", () => {
  it("runs a rightward spread to the right", () => {
    expect(spreadOffsets(3, spread("right")).map((o) => o.x)).toEqual([
      0, 20, 40,
    ]);
  });

  it("ends a leftward spread at the origin, each card right of the one under it", () => {
    expect(spreadOffsets(3, spread("left")).map((o) => o.x)).toEqual([
      -40, -20, 0,
    ]);
  });

  it("keeps the top card of a leftward spread at the origin as it grows", () => {
    expect(spreadOffsets(2, spread("left")).map((o) => o.x)).toEqual([-20, 0]);
  });

  it("runs a downward spread down from the origin", () => {
    expect(spreadOffsets(3, spread("down"))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: 40 },
    ]);
  });

  it("keeps the cards under a spread beneath its first card", () => {
    const offsets = spreadOffsets(5, spread("left"));

    expect(offsets.slice(0, 3).map((o) => o.x)).toEqual([-40, -40, -40]);
  });

  it("spreads a group of cards as one", () => {
    // Twenty-five cards in groups of ten: two whole groups and five over.
    const offsets = spreadOffsets(25, spread("right", 10, 10));

    expect([offsets[0].x, offsets[9].x, offsets[10].x, offsets[24].x]).toEqual([
      0, 0, 20, 40,
    ]);
  });

  it("spreads only as many groups as it shows", () => {
    // Five groups of ten, of which only the top two spread.
    const offsets = spreadOffsets(50, spread("down", 2, 10));

    expect([offsets[29].y, offsets[30].y, offsets[49].y]).toEqual([0, 0, 20]);
  });

  it("spreads one card at a time when no group size is given", () => {
    expect(spreadOffsets(2, spread("right", 2))).toEqual(
      spreadOffsets(2, spread("right", 2, 1)),
    );
  });
});

describe("pileBounds", () => {
  it("covers one card for a pile stacked squarely", () => {
    expect(pileBounds({ kind: "stacked" }, cards(4), CARD)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 150,
    });
  });

  it("covers one card for an empty pile", () => {
    expect(pileBounds(spread("right"), [], CARD)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 150,
    });
  });

  it("reaches right of the origin for a rightward spread", () => {
    expect(pileBounds(spread("right"), cards(3), CARD)).toEqual({
      x: 0,
      y: 0,
      width: 140,
      height: 150,
    });
  });

  it("reaches left of the origin for a leftward spread", () => {
    expect(pileBounds(spread("left"), cards(3), CARD)).toEqual({
      x: -40,
      y: 0,
      width: 140,
      height: 150,
    });
  });

  it("reaches down from the origin for a downward spread", () => {
    expect(pileBounds(spread("down"), cards(3), CARD)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 190,
    });
  });
});

describe("fitFanDown", () => {
  const FAN: FanDownLayout = {
    kind: "fan-down",
    faceUpGap: 45,
    faceDownGap: 18,
    hoverExpansion: 15,
  };
  const FIT: FanFit = {
    minFaceUpGap: 40,
    maxFaceUpGap: 110,
    minFaceDownGap: 10,
  };

  /** Returns a column of `down` hidden cards under `up` face-up ones. */
  function column(down: number, up: number) {
    return [
      ...Array.from({ length: down }, () => makePlayingCard()),
      ...cards(up),
    ];
  }

  /** Returns how tall a column stands under a fan, in design units. */
  function standing(layout: FanDownLayout, down: number, up: number) {
    return down * layout.faceDownGap + (up - 1) * layout.faceUpGap + 150;
  }

  it("opens a short column's face-up gaps to the cap", () => {
    const fitted = fitFanDown(FAN, column(2, 3), 2000, 150, FIT);

    expect(fitted.faceUpGap).toBe(110);
  });

  it("leaves hidden cards their own gap when there is room", () => {
    const fitted = fitFanDown(FAN, column(2, 3), 2000, 150, FIT);

    expect(fitted.faceDownGap).toBe(18);
  });

  it("spreads face-up cards over the room when it is less than the cap", () => {
    // Room for the card, the hover, two hidden gaps and two gaps of 80.
    const room = 150 + 15 + 2 * 18 + 2 * 80;

    const fitted = fitFanDown(FAN, column(2, 3), room, 150, FIT);

    expect(fitted.faceUpGap).toBe(80);
  });

  it("closes hidden cards' gaps before face-up ones go below their own", () => {
    // Room for every face-up gap at 45 and the hidden ones at 14.
    const room = 150 + 15 + 6 * 14 + 5 * 45;

    const fitted = fitFanDown(FAN, column(6, 6), room, 150, FIT);

    expect([fitted.faceDownGap, fitted.faceUpGap]).toEqual([14, 45]);
  });

  it("closes face-up gaps once hidden cards are at their floor", () => {
    const room = 150 + 15 + 6 * 10 + 5 * 42;

    const fitted = fitFanDown(FAN, column(6, 6), room, 150, FIT);

    expect([fitted.faceDownGap, fitted.faceUpGap]).toEqual([10, 42]);
  });

  it("never closes past the floors, letting a long column run long", () => {
    const fitted = fitFanDown(FAN, column(6, 12), 400, 150, FIT);

    expect([fitted.faceDownGap, fitted.faceUpGap]).toEqual([10, 40]);
  });

  it("keeps room for the hovered card's expansion", () => {
    const room = 1000;

    const fitted = fitFanDown(FAN, column(6, 12), room, 150, FIT);

    expect(standing(fitted, 6, 12) + FAN.hoverExpansion).toBeLessThanOrEqual(
      room,
    );
  });

  it("keeps a column of hidden cards under one face-up card at its gaps", () => {
    const fitted = fitFanDown(FAN, column(4, 1), 2000, 150, FIT);

    expect([fitted.faceDownGap, fitted.faceUpGap]).toEqual([18, 45]);
  });

  it("keeps a single card's fan as it was", () => {
    expect(fitFanDown(FAN, cards(1), 50, 150, FIT)).toEqual(FAN);
  });
});

describe("mirrorPileLayout", () => {
  it("turns a rightward spread to the left", () => {
    expect(mirrorPileLayout(spread("right"))).toEqual(spread("left"));
  });

  it("turns a leftward spread to the right", () => {
    expect(mirrorPileLayout(spread("left"))).toEqual(spread("right"));
  });

  it("leaves a downward spread running down", () => {
    expect(mirrorPileLayout(spread("down"))).toEqual(spread("down"));
  });

  it("leaves a downward fan as it is", () => {
    const fan: PileLayout = {
      kind: "fan-down",
      faceUpGap: 45,
      faceDownGap: 18,
      hoverExpansion: 15,
    };

    expect(mirrorPileLayout(fan)).toBe(fan);
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
  /** Returns a column of face-down cards with `faceUpCount` face up on top. */
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
    const pile = new CardPile<PlayingCard>(WASTE_PILE_ID, FakeRole.WASTE);
    pile.addCard(makePlayingCard({ id: "a", faceUp: true }));
    pile.addCard(makePlayingCard({ id: "b", faceUp: true }));

    const offsets = pileCardOffsets(
      fakePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets[1].x).toBe(WASTE_FAN_OFFSET_X);
  });

  it("fans a tableau pile downwards", () => {
    const pile = new CardPile<PlayingCard>(tableauPileId(0), FakeRole.TABLEAU);
    pile.addCard(makePlayingCard({ id: "a", faceUp: true }));
    pile.addCard(makePlayingCard({ id: "b", faceUp: true }));

    const offsets = pileCardOffsets(
      fakePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets[1]).toEqual({ x: 0, y: TABLEAU_FACE_UP_OFFSET });
  });

  it("stacks a stock pile", () => {
    const pile = new CardPile<PlayingCard>(STOCK_PILE_ID, FakeRole.STOCK);
    pile.addCard(makePlayingCard({ id: "a" }));
    pile.addCard(makePlayingCard({ id: "b" }));

    const offsets = pileCardOffsets(
      fakePileLayout(pile.role, 3),
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
      FakeRole.FOUNDATION,
    );
    pile.addCard(makePlayingCard({ id: "a", faceUp: true }));
    pile.addCard(makePlayingCard({ id: "b", faceUp: true }));

    const offsets = pileCardOffsets(
      fakePileLayout(pile.role, 3),
      pile.getCards(),
      null,
    );

    expect(offsets[1]).toEqual({ x: 0, y: 0 });
  });
});
