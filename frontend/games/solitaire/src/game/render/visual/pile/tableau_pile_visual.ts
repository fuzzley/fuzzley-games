import { CardPile } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

/**
 * Visual representation of a Tableau card pile.
 *
 * Manages the layout spacing of cards fanned downwards in a tableau column.
 */
export class TableauPileVisual extends Visual<CardPile<PlayingCard>> {
  /**
   * Constructs a tableau pile visual.
   *
   * @param cardPile The logical CardPile model instance.
   * @param playingCardVisuals The array of card visuals in this pile.
   */
  constructor(
    cardPile: CardPile<PlayingCard> = new CardPile<PlayingCard>(),
    public readonly playingCardVisuals: PlayingCardVisual[] = [],
  ) {
    super(cardPile);
  }

  private static readonly FACE_UP_OFFSET = 45;
  private static readonly FACE_DOWN_OFFSET = 18;
  /**
   * Extra vertical gap opened below the hovered card so the cards stacked on top
   * slide down and reveal more of it.
   */
  private static readonly HOVER_EXPANSION_OFFSET = 15;

  /**
   * The card currently hovered in this pile, if any. While set, the cards fanned
   * on top of it are shifted down to expose more of it. Cleared once the hover
   * ends so the reveal never persists.
   */
  public hoveredCard: PlayingCardVisual | null = null;

  /**
   * Fans cards vertically downwards, using the configured offsets for face-down and face-up cards.
   */
  layoutPile() {
    let currentY = 0;
    for (const cardVisual of this.playingCardVisuals) {
      cardVisual.position = { x: 0, y: currentY };
      // Fan face-down cards and face-up cards according to configured offsets
      const offset = cardVisual.playingCard.faceUp
        ? TableauPileVisual.FACE_UP_OFFSET
        : TableauPileVisual.FACE_DOWN_OFFSET;
      currentY += offset;
      // Open an extra gap after the hovered card so any cards stacked on top of
      // it slide down, revealing more of the hovered card.
      if (cardVisual === this.hoveredCard) {
        currentY += TableauPileVisual.HOVER_EXPANSION_OFFSET;
      }
    }
  }
}
