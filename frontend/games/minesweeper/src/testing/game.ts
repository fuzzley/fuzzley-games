import { TestBed } from "@angular/core/testing";
import { GameService } from "../app/play/game.service";
import type { DifficultyId } from "../rules/difficulty";
import { type PictureOptions, fieldFrom } from "./field_picture";

/** Says how a game a spec sets up stands, beyond its picture. */
export interface GameOptions extends PictureOptions {
  readonly seconds?: number;
  readonly difficulty?: DifficultyId;
}

/**
 * Puts a field drawn as a picture on the board, as a game taken up where it
 * was left, and returns the game.
 */
export function playOn(
  picture: readonly string[],
  options: GameOptions = {},
): GameService {
  const game = TestBed.inject(GameService);
  game.resume(
    fieldFrom(picture, options),
    options.seconds ?? 0,
    options.difficulty ?? "medium",
  );
  return game;
}
