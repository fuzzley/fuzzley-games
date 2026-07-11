/**
 * Event map defining payloads for solitaire game events.
 *
 * Rendering reads the model's state directly every frame, so per-card mutation
 * events are unnecessary; only these coarse lifecycle signals have consumers.
 */
export type GameEvents = {
  /** Emitted when all cards have been successfully moved to the foundation piles. */
  "game-won": undefined;

  /** Emitted when the game is restarted or new game is dealt. */
  "game-reset": undefined;
};
