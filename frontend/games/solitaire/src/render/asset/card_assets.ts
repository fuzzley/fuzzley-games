import { PlayingCardId, Suit, Type } from "../../model/card/playing_card";

/**
 * Maps a structural playing card identity to its corresponding frame name inside the texture atlas.
 *
 * @param playingCardId The suit and value of the card.
 * @returns The matching string filename key.
 */
export function playingCardIdToFileName(playingCardId: PlayingCardId): string {
  function suitToFileName(suit: Suit) {
    switch (suit) {
      case Suit.SPADE:
        return "spades";
      case Suit.HEART:
        return "hearts";
      case Suit.DIAMOND:
        return "diamonds";
      case Suit.CLUB:
        return "clubs";
    }
    throw new Error(`Unknown Suit: ${suit as number}`);
  }

  function typeToFileName(type: Type) {
    switch (type) {
      case Type.ACE:
        return "ace";
      case Type.TWO:
        return "2";
      case Type.THREE:
        return "3";
      case Type.FOUR:
        return "4";
      case Type.FIVE:
        return "5";
      case Type.SIX:
        return "6";
      case Type.SEVEN:
        return "7";
      case Type.EIGHT:
        return "8";
      case Type.NINE:
        return "9";
      case Type.TEN:
        return "10";
      case Type.JACK:
        return "jack";
      case Type.QUEEN:
        return "queen";
      case Type.KING:
        return "king";
    }
    throw new Error(`Unknown Type: ${type as number}`);
  }

  return `card-${suitToFileName(playingCardId.suit)}-${typeToFileName(
    playingCardId.type,
  )}`;
}
