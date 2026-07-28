import { describe, it, expect } from "vitest";
import { MoveRules } from "@/games/klondike/move_rules";
import { CardPile, PileType } from "@/engine/core/card/card_pile";
import { PlayingCard, Suit, Rank } from "@/engine/core/card/playing_card";
import { makePlayingCard } from "@test/support/card_builder";

describe("MoveRules", () => {
  const rules = new MoveRules();

  function pileWith(
    type: PileType,
    ...cards: PlayingCard[]
  ): CardPile<PlayingCard> {
    const pile = new CardPile<PlayingCard>("pile", type);
    for (const card of cards) {
      pile.addCard(card);
    }
    return pile;
  }

  describe("tableau destinations", () => {
    it("allows a King onto an empty tableau", () => {
      const king = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });

      expect(rules.canPlace(king, pileWith(PileType.TABLEAU), 1)).toBe(true);
    });

    it("rejects a non-King onto an empty tableau", () => {
      const queen = makePlayingCard({ suit: Suit.SPADE, rank: Rank.QUEEN });

      expect(rules.canPlace(queen, pileWith(PileType.TABLEAU), 1)).toBe(false);
    });

    it("allows a descending, alternating-color card onto a tableau", () => {
      const blackKing = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });
      const redQueen = makePlayingCard({ suit: Suit.HEART, rank: Rank.QUEEN });

      expect(
        rules.canPlace(redQueen, pileWith(PileType.TABLEAU, blackKing), 1),
      ).toBe(true);
    });

    it("rejects a same-color card onto a tableau", () => {
      const blackKing = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });
      const blackQueen = makePlayingCard({ suit: Suit.CLUB, rank: Rank.QUEEN });

      expect(
        rules.canPlace(blackQueen, pileWith(PileType.TABLEAU, blackKing), 1),
      ).toBe(false);
    });

    it("rejects a non-descending card onto a tableau", () => {
      const blackKing = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });
      const redJack = makePlayingCard({ suit: Suit.HEART, rank: Rank.JACK });

      expect(
        rules.canPlace(redJack, pileWith(PileType.TABLEAU, blackKing), 1),
      ).toBe(false);
    });
  });

  describe("foundation destinations", () => {
    it("allows an Ace onto an empty foundation", () => {
      const ace = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });

      expect(rules.canPlace(ace, pileWith(PileType.FOUNDATION), 1)).toBe(true);
    });

    it("rejects a non-Ace onto an empty foundation", () => {
      const two = makePlayingCard({ suit: Suit.HEART, rank: Rank.TWO });

      expect(rules.canPlace(two, pileWith(PileType.FOUNDATION), 1)).toBe(false);
    });

    it("allows an ascending, same-suit card onto a foundation", () => {
      const ace = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });
      const two = makePlayingCard({ suit: Suit.HEART, rank: Rank.TWO });

      expect(rules.canPlace(two, pileWith(PileType.FOUNDATION, ace), 1)).toBe(
        true,
      );
    });

    it("rejects a different-suit card onto a foundation", () => {
      const heartAce = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });
      const spadeTwo = makePlayingCard({ suit: Suit.SPADE, rank: Rank.TWO });

      expect(
        rules.canPlace(spadeTwo, pileWith(PileType.FOUNDATION, heartAce), 1),
      ).toBe(false);
    });

    it("rejects a non-ascending card onto a foundation", () => {
      const heartAce = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });
      const heartThree = makePlayingCard({
        suit: Suit.HEART,
        rank: Rank.THREE,
      });

      expect(
        rules.canPlace(heartThree, pileWith(PileType.FOUNDATION, heartAce), 1),
      ).toBe(false);
    });

    it("rejects a stack of more than one card onto a foundation", () => {
      const ace = makePlayingCard({ suit: Suit.HEART, rank: Rank.ACE });

      expect(rules.canPlace(ace, pileWith(PileType.FOUNDATION), 2)).toBe(false);
    });
  });

  describe("invalid destinations", () => {
    it("rejects any move onto the stock", () => {
      const king = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });

      expect(rules.canPlace(king, pileWith(PileType.STOCK), 1)).toBe(false);
    });

    it("rejects any move onto the waste", () => {
      const king = makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING });

      expect(rules.canPlace(king, pileWith(PileType.WASTE), 1)).toBe(false);
    });
  });
});
