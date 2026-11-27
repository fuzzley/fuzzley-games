// A move played whole: the swap, its waves to rest, the move counted and
// how the level stands, then, while it plays on, the wind's turn. The rules
// play it in the board's own frame, and take the move in and hand its
// record back in the screen's. A game is never changed: the move makes the
// next one.

import type { Game, Outcome } from "../board/board";
import { fromScreen, turnFrame } from "../board/orientation";
import { findBunches } from "../bunches/find";
import type { ElementId } from "../catalog/elements";
import type { ElementRule, WindRule } from "../elements/element_rule";
import { goalsMet } from "./goals";
import { waveOnScreen } from "./on_screen";
import type { Gust, MoveRecord, Wave } from "./record";
import { settle } from "./settle";
import { playSwap } from "./swapped";
import { playToRest } from "./wave";

/** Describes a move played: the game it leaves, and what it did. */
export interface Played {
  readonly game: Game;
  readonly record: MoveRecord;
}

/** Describes the wind's turn after a move: the game it leaves, and the gust, or null where the wind didn't turn. */
interface Gusted {
  readonly game: Game;
  readonly gust: Gust | null;
}

/**
 * Returns a move played on a game, by the elements' rules and the wind's:
 * the game it leaves, and its record.
 *
 * The move is the square picked up and the neighbor it is swapped with, or
 * the same square again for a special set off where it stands, each in the
 * screen's frame. A move on a game no longer in play, or one `playSwap()`
 * refuses, is refused and costs nothing: the game handed back is the one
 * handed in, and its record's outcome is how that game stands.
 *
 * @throws {RangeError} for a square off the board.
 */
export function play(
  game: Game,
  from: number,
  to: number,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): Played {
  const picked = squareFromScreen(game, from);
  const neighbor = squareFromScreen(game, to);
  const swapped =
    game.outcome === "playing" ? playSwap(game, picked, neighbor, rules) : null;
  if (swapped === null) {
    return {
      game,
      record: {
        swap: { from, to, refused: true },
        waves: [],
        burrSpread: null,
        gust: null,
        shuffle: null,
        outcome: game.outcome,
      },
    };
  }
  const rested = playToRest(
    swapped.game,
    swapped.bunches,
    swapped.setOff,
    rules,
  );
  const swap = { from, to, refused: false };
  const waves = rested.waves.map((wave) => waveOnScreen(wave, rested.game));
  const ended: Game = {
    ...rested.game,
    movesLeft: rested.game.movesLeft - 1,
    movesPlayed: rested.game.movesPlayed + 1,
  };
  if (goalsMet(ended)) {
    return endedAs(
      ended,
      { swap, waves, burrSpread: null, gust: null, shuffle: null },
      "cleared",
    );
  }
  const gusted = gustAfter(ended, rules, wind);
  return endedAs(
    gusted.game,
    { swap, waves, burrSpread: null, gust: gusted.gust, shuffle: null },
    outcomeOf(gusted.game),
  );
}

/**
 * Returns the wind's turn after a move that leaves the level in play: a
 * turning wind, by its rule, waits a move less, or turns the board's frame,
 * everything falling the new way, and then plays the waves the fall stood
 * up to rest.
 */
function gustAfter(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): Gusted {
  if (game.wind === null || wind.afterMove === undefined) {
    return { game, gust: null };
  }
  const turn = wind.afterMove(game.wind);
  const waited = { ...game, wind: turn.wind };
  if (turn.quarters === 0) {
    return { game: waited, gust: null };
  }
  const turned = turnFrame(waited, turn.quarters);
  const fallen = settle(turned, rules);
  const rested = playToRest(
    fallen.game,
    findBunches(fallen.game.board, null),
    [],
    rules,
  );
  const fall: Wave = {
    number: 0,
    bunches: [],
    blasts: [],
    hits: [],
    falls: fallen.falls,
    goalsLeft: fallen.game.goalsLeft,
  };
  return {
    game: rested.game,
    gust: {
      turns: turned.turns,
      waves: [fall, ...rested.waves].map((wave) => waveOnScreen(wave, turned)),
    },
  };
}

/** Returns how a game stands once a move has ended: cleared where every goal is met, over where its moves have run out, and in play otherwise. */
function outcomeOf(game: Game): Outcome {
  if (goalsMet(game)) {
    return "cleared";
  }
  return game.movesLeft > 0 ? "playing" : "over";
}

/** Returns a move that ended, the game it left standing as it does, and its record saying so. */
function endedAs(
  game: Game,
  record: Omit<MoveRecord, "outcome">,
  outcome: Outcome,
): Played {
  return { game: { ...game, outcome }, record: { ...record, outcome } };
}

/** Returns the square of a game's board, in its own frame, that a square of the screen shows, throwing for a square off the board. */
function squareFromScreen(game: Game, square: number): number {
  const { width, height } = game.board;
  if (square < 0 || square >= width * height) {
    throw new RangeError(`Square ${String(square)} is off the board.`);
  }
  return fromScreen(game, square);
}
