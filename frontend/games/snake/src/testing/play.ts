import { TestBed } from "@angular/core/testing";
import { GameService } from "../app/play/game.service";
import type { Direction } from "../rules/geometry";
import { stepMs } from "../rules/speed";
import { runFrom } from "./run_picture";

/**
 * A run on a board of three by three, one step from filling it: the head
 * left of the middle, heading right into the apple there.
 */
export const ALMOST_FULL = runFrom(["v<<", "@*^", ">>^"], {
  heading: "right",
  outcome: "playing",
  steps: 20,
});

/** Moves a game on a step's time at a time until its run ends. */
export function playToTheEnd(game: GameService): void {
  for (let i = 0; i < 200 && !game.ended(); i++) {
    game.tick(stepMs(game.run().speed, 0));
  }
}

/**
 * Returns the game with a run started one way and played to its end: up runs
 * into the top wall having eaten nothing, and right eats the first apple on
 * its way into the right one.
 */
export function endedGame(direction: Direction = "up"): GameService {
  const game = TestBed.inject(GameService);
  game.turn(direction);
  playToTheEnd(game);
  return game;
}

/** Returns the game with a run just won by filling the board. */
export function wonGame(): GameService {
  const game = TestBed.inject(GameService);
  game.takeUp(ALMOST_FULL);
  game.turn("right");
  playToTheEnd(game);
  return game;
}
