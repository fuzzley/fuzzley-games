import * as Phaser from "phaser";
import { PlayingCard } from "../../../model/card/playing_card";
import { Visual } from "../visual";

/**
 * Visual wrapper for a single logical playing card.
 *
 * Manages the connection between the card's state and its Phaser sprite representation.
 */
export class PlayingCardVisual extends Visual<PlayingCard> {
  /** The drop shadow filter applied to the card's sprite. */
  public shadow?: Phaser.Filters.Shadow;

  /**
   * Constructs the playing card visual wrapper.
   *
   * @param playingCard The logical PlayingCard model instance.
   */
  constructor(public readonly playingCard: PlayingCard) {
    super(playingCard);
  }
}
