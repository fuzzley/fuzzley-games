// A level's rally mark on a depth, the rally a flight earns its third star
// at (C11), and the rally line that reaches it (docs/rickashay/design.md,
// "The guarantee", check 6): the mark the middle one of the careless
// player's best rallies over its floor games there, so a player who looks
// no further than sixteen aims a round earns the star about every other
// game; and the line its shots from the level's opening to the soonest
// flight of those games that reached it, kept beside the certificate and
// replayed with it. The games are handed in, as the library's careless
// player leaves its seeds to its callers: a spec's from its holders'
// floorGames(), a script's from @fz/dev/report's seeds. They are found in
// Node and replayed in every browser, so this is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import type { Aim } from "@fz/brick-wall/rules/aims";
import type { PlayedCarelessly } from "@fz/brick-wall/testing/careless";
import type { Line } from "@fz/brick-wall/testing/solver";
import type { RoundPlay } from "./line_play";

/** Describes a level's rally mark on a depth, and a line that reaches it. */
export interface RallyMark {
  /** The rally a flight earns the level's third star at. */
  readonly mark: number;
  /** The shots from the level's opening that reach it, the last one's flight rallying the mark or more. */
  readonly line: Line<Aim>;
}

/**
 * Returns the rally of each round a line plays from a level's opening, in
 * turn, till the line ends or the level does.
 *
 * It throws a `RangeError` for an aim that isn't one of the 657.
 */
export function ralliesOf(play: RoundPlay, line: Line<Aim>): readonly number[] {
  const rallies: number[] = [];
  let start = play.opening;
  for (const aim of line) {
    const { outcome, next } = play.play(start, aim);
    rallies.push(outcome.rally);
    if (outcome.result !== "on") break;
    start = next;
  }
  return rallies;
}

/**
 * Returns a level's rally mark on the play's depth, and the line that
 * reaches it, from the careless player's games there, each replayed by
 * {@link ralliesOf}: the mark the middle one of each game's best rally, the
 * one at half their count once sorted, the higher of the two middles of an
 * even count, as the sketch took it; and the line the shots of whichever
 * game reached the mark soonest, the first of them where several did as
 * soon, from its first round to its first flight at the mark or over.
 *
 * It throws a `RangeError` for no games, which set no mark.
 */
export function rallyMarkFrom(
  play: RoundPlay,
  games: readonly Pick<PlayedCarelessly<Aim>, "line">[],
): RallyMark {
  const rallies = games.map(({ line }) => ralliesOf(play, line));
  const bests = rallies.map((game) => Math.max(...game)).sort((a, b) => a - b);
  const mark = bests[Math.floor(bests.length / 2)];
  if (mark === undefined) {
    throw new RangeError("No games set a rally mark.");
  }
  let soonest = Number.POSITIVE_INFINITY;
  let line: Line<Aim> = [];
  for (const [game, played] of rallies.entries()) {
    const reached = played.findIndex((rally) => rally >= mark);
    if (reached >= 0 && reached < soonest) {
      soonest = reached;
      line = games[game]!.line.slice(0, reached + 1);
    }
  }
  return { mark, line };
}

/**
 * Returns whether a rally line reaches its mark as `ralliesOf()` played it:
 * every round of it played, the level going on till the last, whose flight
 * rallies the mark or more.
 */
export function rallyLineHolds(
  line: Line<Aim>,
  rallies: readonly number[],
  mark: number,
): boolean {
  const last = rallies.at(-1);
  return rallies.length === line.length && last !== undefined && last >= mark;
}
