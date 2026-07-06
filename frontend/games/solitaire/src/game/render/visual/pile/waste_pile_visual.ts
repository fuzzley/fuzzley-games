import { CardPile } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { DrawCount } from "@/game/model/game/game_settings";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

/**
 * Visual representation of a Waste card pile.
 *
 * Manages the positioning of drawn cards in the face-up waste pile (which are stacked directly on top of each other).
 */
export class WastePileVisual extends Visual<CardPile<PlayingCard>> {
  /**
   * Constructs a waste pile visual.
   *
   * @param cardPile The logical CardPile model instance.
   * @param playingCardVisuals The array of card visuals in this pile.
   * @param drawCount Supplies the active draw-count mode. In Draw 1 mode only
   *   the top card is fanned; otherwise up to {@link MAX_FAN_CARDS} are shown.
   */
  constructor(
    cardPile: CardPile<PlayingCard> = new CardPile<PlayingCard>(),
    public readonly playingCardVisuals: PlayingCardVisual[] = [],
    private readonly drawCount: () => DrawCount = () => 3,
  ) {
    super(cardPile);
  }

  /** Horizontal pixel offset between fanned waste cards. */
  private static readonly FAN_OFFSET_X = 25;

  /** Maximum number of cards to fan (show edges for). */
  private static readonly MAX_FAN_CARDS = 3;

  /**
   * Fans the topmost cards horizontally so a few card edges are visible, while
   * all remaining cards are stacked at the pile origin. In Draw 1 mode only the
   * single top card is shown, since cards are drawn one at a time.
   */
  layoutPile() {
    const count = this.playingCardVisuals.length;
    // In Draw 1 mode only the top card is visible; otherwise fan up to MAX_FAN_CARDS.
    const maxFanCards =
      this.drawCount() === 1 ? 1 : WastePileVisual.MAX_FAN_CARDS;
    // Number of cards to fan (the top N, up to maxFanCards)
    const fanCount = Math.min(count, maxFanCards);
    const fanStartIndex = count - fanCount;

    for (let i = 0; i < count; i++) {
      if (i < fanStartIndex) {
        // Cards below the fan are stacked at the origin
        this.playingCardVisuals[i].position = { x: 0, y: 0 };
      } else {
        // Fan the top cards to the right
        const fanPosition = i - fanStartIndex;
        this.playingCardVisuals[i].position = {
          x: fanPosition * WastePileVisual.FAN_OFFSET_X,
          y: 0,
        };
      }
    }
  }
}
