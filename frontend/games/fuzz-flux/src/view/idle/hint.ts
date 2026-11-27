// The hint, the board's cue to a player who hasn't moved for a while: the
// two fuzzballs of a move look at each other and hop, twice, with the
// hint's sound, once the board has rested a while with no move, as long
// again after each hint, and at once when the player asks. The move is the
// careful player's, which can't see the deal, so a hint never gives away
// what falls in; on a level that teaches something, it is the level's own
// first move, shown by the hand too, as soon as the level's board rests.

import { indexOf, type Square } from "../../rules/board/cells";
import type { Hint } from "../../rules/levels/level";
import type { GridShown } from "../run_state";
import { Draft } from "../timeline/draft";
import type { FeelTuning } from "../timeline/feel";
import { POOLS } from "../timeline/limits";
import { type Part, cue, moves, sets } from "../timeline/part";
import { standingOn } from "../timeline/standing";
import type { Timeline } from "../timeline/timeline";

/** Describes a hint the board shows: a move, its squares in the screen's frame, and whether the hand shows it too, as it does a teaching level's own first move. */
export interface HintShown {
  readonly move: Hint;
  readonly hand: boolean;
}

/**
 * Keeps when the board hints, and which move it shows: never while a move
 * plays; at once when the player asks; as soon as the board rests while a
 * teaching level's own first move is still to be made; and else once the
 * board has rested the feel's wait since it came to rest or last hinted.
 */
export class Hinting {
  /** When the wait for the next hint started, or null while a move plays. */
  private waitFromMs: number | null = null;
  /** Whether the next hint comes as soon as the board rests, as a teaching level's first does. */
  private soon: boolean;

  /** Starts with a move playing, as the level's board falls in, on a level that teaches its own first move, or null for one that doesn't or whose first move is made. */
  constructor(private levelMove: Hint | null) {
    this.soon = levelMove !== null;
  }

  /** Starts the wait for the next hint, as the board comes to rest after a move. */
  rests(atMs: number): void {
    this.waitFromMs = atMs;
  }

  /**
   * Stops the wait as a move starts, after which the hint is never the
   * level's own: a swap the rules play or a special set off. A swap
   * refused is none, since it costs nothing, so the wait runs on through it
   * and a teaching level keeps its own move; nor are the hint's own hops,
   * whose wait starts from the hint.
   */
  moves(): void {
    this.waitFromMs = null;
    this.levelMove = null;
    this.soon = false;
  }

  /** Returns whether the board hints at a moment, asked for or not, and if so starts the wait for the next from it. */
  hintsAt(atMs: number, asked: boolean, feel: FeelTuning): boolean {
    if (this.waitFromMs === null) {
      return false;
    }
    const dueMs = this.waitFromMs + (this.soon ? 0 : feel.hintWaitMs);
    if (!asked && atMs < dueMs) {
      return false;
    }
    this.waitFromMs = atMs;
    this.soon = false;
    return true;
  }

  /**
   * Returns the hint the board shows: the level's own first move with the
   * hand while it is still to be made, which asks nothing of the careful
   * player, and else the careful player's move, or null where it finds
   * none.
   */
  shown(carefulMove: () => Hint | null): HintShown | null {
    if (this.levelMove !== null) {
      return { move: this.levelMove, hand: true };
    }
    const move = carefulMove();
    return move === null ? null : { move, hand: false };
  }
}

/**
 * Returns the timeline of a hint's hops on the board as it rests: the
 * move's two fuzzballs look at each other and hop the feel's hops, and the
 * hint's sound plays as they start. It plays alike with Less motion, which
 * keeps the board's hops, and is no move: the board rests through it.
 *
 * @throws {RangeError} for a square of the move with no piece.
 */
export function hintTimeline(
  grid: GridShown,
  move: Hint,
  feel: FeelTuning,
): Timeline {
  // A hint has no effect or flight for Less motion to take.
  const draft = new Draft(grid, [], "full");
  draft.add([
    cue("hint", 0),
    ...hopsOf(grid, move.from, move.to, feel),
    ...hopsOf(grid, move.to, move.from, feel),
  ]);
  const hopsMs =
    (feel.hintHops - 1) * feel.hintHopGapMs + feel.hintUpMs + feel.hintDownMs;
  return draft.finish(Math.max(hopsMs, feel.hintLookMs), null, feel, POOLS);
}

/** Returns the parts of a hint's fuzzball on a square looking toward the other's square and hopping, each hop stretching it up and springing back. */
function hopsOf(
  grid: GridShown,
  square: Square,
  toward: Square,
  feel: FeelTuning,
): readonly Part[] {
  const { id } = standingOn(grid, indexOf(square, grid.width)).piece;
  return [
    ...sets(id, 0, { lookX: toward.x - square.x, lookY: toward.y - square.y }),
    ...Array.from({ length: feel.hintHops }, (_, hop) => {
      const upMs = hop * feel.hintHopGapMs;
      return [
        ...moves(id, upMs, feel.hintUpMs, "out", {
          scaleX: feel.hintNarrow,
          scaleY: feel.hintStretch,
        }),
        ...moves(id, upMs + feel.hintUpMs, feel.hintDownMs, "spring", {
          scaleX: 1,
          scaleY: 1,
        }),
      ];
    }).flat(),
    ...sets(id, feel.hintLookMs, { lookX: 0, lookY: 0 }),
  ];
}
