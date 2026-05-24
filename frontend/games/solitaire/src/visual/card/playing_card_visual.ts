import { PlayingCard } from "../../card/playing_card";
import { Visual } from "../visual";

export class PlayingCardVisual extends Visual<PlayingCard> {
  constructor(public readonly playingCard: PlayingCard) {
    super(playingCard);
  }
}
