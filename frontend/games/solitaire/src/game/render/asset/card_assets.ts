import {
  PlayingCardId,
  playingCardIdToString,
} from "../../model/card/playing_card";

/**
 * Maps a structural playing card identity to its corresponding frame name inside the texture atlas.
 *
 * The atlas frame names are the same canonical card id strings the logical
 * model uses, so this delegates to {@link playingCardIdToString} to keep the
 * render layer and the model in lockstep.
 *
 * @param playingCardId The suit and value of the card.
 * @returns The matching string filename key.
 */
export function playingCardIdToFileName(playingCardId: PlayingCardId): string {
  return playingCardIdToString(playingCardId);
}
