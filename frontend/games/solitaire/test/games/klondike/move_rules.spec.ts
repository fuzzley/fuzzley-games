import { describe, it, expect } from "vitest";
import { klondikePlacementRule } from "@/games/klondike/move_rules";
import { CardPile } from "@/engine/core/card/card_pile";
import { KlondikeRole } from "@/games/klondike/klondike_zones";
import { PlayingCard, Suit, Rank } from "@/engine/core/card/playing_card";
import { BoardQuery } from "@/engine/tableau/rules";
import { makePlayingCard } from "@test/support/card_builder";

describe("klondikePlacementRule", () => {
  function pileWith(
    type: KlondikeRole,
    ...cards: PlayingCard[]
  ): CardPile<PlayingCard> {
    const pile = new CardPile<PlayingCard>("pile", type);
    for (const card of cards) {
      pile.addCard(card);
    }
    return pile;
  }

  /** A board no Klondike rule consults, since none of them depend on one. */
  const board: BoardQuery = {
    pile: () => undefined,
    pilesByRole: () => [],
    emptyCount: () => 0,
  };

  /**
   * Asks whether `card`, carrying `movingStackSize` cards including itself, may
   * be placed on `targetPile`. The filler cards above it are never inspected —
   * only how many there are matters to these rules.
   */
  function canPlace(
    card: PlayingCard,
    targetPile: CardPile<PlayingCard>,
    movingStackSize: number,
  ): boolean {
    const movingStack = [
      card,
      ...Array.from({ length: movingStackSize - 1 }, () => makePlayingCard()),
    ];
    return klondikePlacementRule(targetPile.role)({
      card,
      movingStack,
      sourcePile: pileWith(KlondikeRole.TABLEAU),
      targetPile,
      board,
    });
  }

  describe("tableau destinations", () => {
    it("allows a King onto an empty tableau", () => {
      const king = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });

      expect(canPlace(king, pileWith(KlondikeRole.TABLEAU), 1)).toBe(true);
    });

    it("rejects a non-King onto an empty tableau", () => {
      const queen = makePlayingCard({ suit: Suit.SPADE, rank: Rank.QUEEN });

      expect(canPlace(queen, pileWith(KlondikeRole.TABLEAU), 1)).toBe(false);
    });

    it("allows a descending, alternating-color card onto a tableau", () => {
      const blackKing = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });
      const redQueen = makePlayingCard({ suit: Suit.HEART, rank: Rank.QUEEN });

      expect(
        canPlace(redQueen, pileWith(KlondikeRole.TABLEAU, blackKing), 1),
      ).toBe(true);
    });

    it("rejects a same-color card onto a tableau", () => {
      const blackKing = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });
      const blackQueen = makePlayingCard({ suit: Suit.CLUB, rank: Rank.QUEEN });

      expect(
        canPlace(blackQueen, pileWith(KlondikeRole.TABLEAU, blackKing), 1),
      ).toBe(false);
    });

    it("rejects a non-descending card onto a tableau", () => {
      const blackKing = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });
      const redJack = makePlayingCard({ suit: Suit.HEART, rank: Rank.JACK });

      expect(
        canPlace(redJack, pileWith(KlondikeRole.TABLEAU, blackKing), 1),
      ).toBe(false);
    });
  });

  describe("foundation destinations", () => {
    it("allows an Ace onto an empty foundation", () => {
      const ace = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });

      expect(canPlace(ace, pileWith(KlondikeRole.FOUNDATION), 1)).toBe(true);
    });

    it("rejects a non-Ace onto an empty foundation", () => {
      const two = makePlayingCard({ suit: Suit.HEART, rank: Rank.TWO });

      expect(canPlace(two, pileWith(KlondikeRole.FOUNDATION), 1)).toBe(false);
    });

    it("allows an ascending, same-suit card onto a foundation", () => {
      const ace = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });
      const two = makePlayingCard({ suit: Suit.HEART, rank: Rank.TWO });

      expect(canPlace(two, pileWith(KlondikeRole.FOUNDATION, ace), 1)).toBe(
        true,
      );
    });

    it("rejects a different-suit card onto a foundation", () => {
      const heartAce = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });
      const spadeTwo = makePlayingCard({ suit: Suit.SPADE, rank: Rank.TWO });

      expect(
        canPlace(spadeTwo, pileWith(KlondikeRole.FOUNDATION, heartAce), 1),
      ).toBe(false);
    });

    it("rejects a non-ascending card onto a foundation", () => {
      const heartAce = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });
      const heartThree = makePlayingCard({
        suit: Suit.HEART,
        rank: Rank.THREE,
      });

      expect(
        canPlace(heartThree, pileWith(KlondikeRole.FOUNDATION, heartAce), 1),
      ).toBe(false);
    });

    it("rejects a stack of more than one card onto a foundation", () => {
      const ace = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });

      expect(canPlace(ace, pileWith(KlondikeRole.FOUNDATION), 2)).toBe(false);
    });
  });

  describe("invalid destinations", () => {
    it("rejects any move onto the stock", () => {
      const king = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });

      expect(canPlace(king, pileWith(KlondikeRole.STOCK), 1)).toBe(false);
    });

    it("rejects any move onto the waste", () => {
      const king = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });

      expect(canPlace(king, pileWith(KlondikeRole.WASTE), 1)).toBe(false);
    });
  });
});
