import type { LevelEntry } from "../../rules/levels/levels";
import {
  readReportedGame,
  replayReported,
} from "../../rules/run/reported_game";
import type { GameService } from "../play/game.service";
import type { RoundPlayer } from "../tokens";

/**
 * Puts a state a bug report kept in play: reads it, plays its level's
 * shots again through the round player, and has the game take it up,
 * paused and off the record, asking first where a run in progress would be
 * lost; resolves to whether it did.
 *
 * @throws Error naming the part that doesn't fit this build, or where a
 *   round is in play and the board isn't drawn yet, before anything is
 *   asked.
 */
export async function loadReport(
  state: unknown,
  game: GameService,
  levels: readonly LevelEntry[],
  play: RoundPlayer,
): Promise<boolean> {
  const read = readReportedGame(state, levels, game.run().id + 1);
  return game.takeUpReport(replayReported(read, levels, play));
}
