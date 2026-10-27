import { TestBed } from "@angular/core/testing";
import { GameService } from "../app/play/game.service";
import { EASY, type GridPicture, gridFrom } from "./grid_picture";

/** Says how a game a spec sets up stands, beyond its picture. */
export interface GameOptions extends GridPicture {
  /** The givens, nine rows drawn as `gridFrom` draws them; `EASY` unless set. */
  readonly givens?: readonly string[];
  readonly seconds?: number;
}

/**
 * Puts a grid drawn as pictures on the board, as a game taken up where it
 * was left, and returns the game.
 */
export function playOn(options: GameOptions = {}): GameService {
  const game = TestBed.inject(GameService);
  game.resume(gridFrom(options.givens ?? EASY, options), options.seconds ?? 0);
  return game;
}
