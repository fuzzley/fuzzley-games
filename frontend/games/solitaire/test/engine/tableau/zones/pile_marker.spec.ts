import { describe, it, expect, beforeEach } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { PileMarker, PileMarkers } from "@/engine/tableau/zones/pile_marker";
import { ZoneLook } from "@/engine/tableau/zones/zone_look";
import { makePlayingCard } from "@test/support/card_builder";

/** Returns how a pile looks, with the placeholder and pressability given. */
function look(
  pileId: string,
  backgroundKey?: string,
  emptyIsActionable?: boolean,
): ZoneLook {
  return {
    slot: { pileId, column: 0, row: 0 },
    layout: { kind: "stacked" },
    face: "card",
    backgroundKey,
    emptyIsActionable,
  };
}

const ZONES = new Map<string, ZoneLook>([
  ["stock", look("stock", "card-placeholder-full-border", true)],
  ["bare", look("bare")],
]);

describe("PileMarkers", () => {
  let markers: PileMarkers;
  let stock: CardPile<PlayingCard>;
  let bare: CardPile<PlayingCard>;

  beforeEach(() => {
    markers = new PileMarkers({ zoneFor: (pileId) => ZONES.get(pileId) });
    stock = new CardPile<PlayingCard>("stock", "stock");
    bare = new CardPile<PlayingCard>("bare", "bare");
  });

  describe("backgroundKey", () => {
    it("is the zone's placeholder for an unmarked pile", () => {
      expect(markers.backgroundKey(stock)).toBe("card-placeholder-full-border");
    });

    it("is undefined for an unmarked pile drawn over bare table", () => {
      expect(markers.backgroundKey(bare)).toBeUndefined();
    });

    it("is the marker's artwork for a marked pile", () => {
      markers.mark("stock", () => ({ artwork: "recycle", actionable: true }));

      expect(markers.backgroundKey(stock)).toBe("recycle");
    });

    it("asks the marker afresh each time", () => {
      let marker: PileMarker = { artwork: "recycle", actionable: true };
      markers.mark("stock", () => marker);
      marker = { artwork: "spent", actionable: false };

      expect(markers.backgroundKey(stock)).toBe("spent");
    });
  });

  describe("isEmptySlotActionable", () => {
    it("follows the zone for an unmarked empty pile", () => {
      expect(markers.isEmptySlotActionable(stock)).toBe(true);
    });

    it("is false for an unmarked pile whose zone says nothing", () => {
      expect(markers.isEmptySlotActionable(bare)).toBe(false);
    });

    it("follows the marker for a marked empty pile", () => {
      markers.mark("stock", () => ({ artwork: "spent", actionable: false }));

      expect(markers.isEmptySlotActionable(stock)).toBe(false);
    });

    it("is false for a pile holding cards, whatever its marker says", () => {
      markers.mark("stock", () => ({ artwork: "recycle", actionable: true }));
      stock.addCard(makePlayingCard());

      expect(markers.isEmptySlotActionable(stock)).toBe(false);
    });
  });
});
