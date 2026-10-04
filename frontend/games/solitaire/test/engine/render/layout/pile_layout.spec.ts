import { describe, it, expect } from "vitest";
import {
  PileLayout,
  SpreadDirection,
  pileBounds,
  spreadOffsets,
} from "@/engine/render/layout/pile_layout";
import { makePlayingCard } from "@test/support/card_builder";

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
  return Array.from({ length: count }, () => makePlayingCard());
}

describe("spreadOffsets", () => {
  it("runs a rightward spread to the right", () => {
    expect(spreadOffsets(3, spread("right")).map((o) => o.x)).toEqual([
      0, 20, 40,
    ]);
  });

  it("runs a leftward spread to the left of the origin", () => {
    expect(spreadOffsets(3, spread("left")).map((o) => o.x)).toEqual([
      0, -20, -40,
    ]);
  });

  it("runs a downward spread down from the origin", () => {
    expect(spreadOffsets(3, spread("down"))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: 40 },
    ]);
  });

  it("keeps the cards under the spread at the origin, whichever way it runs", () => {
    const offsets = spreadOffsets(5, spread("left"));

    expect(offsets.slice(0, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
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
