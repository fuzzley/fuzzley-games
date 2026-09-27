import { vi } from "vitest";
import type { GameSnapshot } from "@/engine/tableau/game_snapshot";
import { GameState } from "@/engine/tableau/game_state";
import type { PlayableGame } from "@/engine/tableau/playable_game";

/** Sets the starting readings of a mock game. */
export interface MockGameModelOverrides {
  score?: number;
  moves?: number;
  undoDepth?: number;
}

/**
 * Creates a stand-in for a dealt game, with a real {@link GameState} that a
 * spec sets as the game itself would.
 */
export function createMockGameModel(overrides: MockGameModelOverrides = {}) {
  /** Listeners registered by whoever is following this game. */
  const listeners = new Map<string, Set<() => void>>();

  const state = new GameState();
  state.score = overrides.score ?? 0;
  state.moves = overrides.moves ?? 0;
  state.undoDepth = overrides.undoDepth ?? 0;

  /** Raises an event as the real game would. */
  const emit = (event: string) => {
    listeners.get(event)?.forEach((callback) => callback());
  };

  /** Clears the readings and announces the new deal, as a real deal does. */
  const deal = () => {
    state.score = 0;
    state.moves = 0;
    state.undoDepth = 0;
    emit("game-reset");
  };

  return {
    state,

    on(event: string, callback: () => void) {
      const set = listeners.get(event) ?? new Set<() => void>();
      set.add(callback);
      listeners.set(event, set);
    },

    off(event: string, callback: () => void) {
      listeners.get(event)?.delete(callback);
    },

    emit,

    startNewGame: vi.fn(deal),
    restartGame: vi.fn(deal),
    undo: vi.fn(),

    /** Returns an empty board carrying the mock's score and moves. */
    snapshot: vi.fn((): GameSnapshot => ({
      piles: [],
      score: state.score,
      moves: state.moves,
      extra: null,
      history: [],
      deal: [],
    })),
    /** Takes the snapshot's readings and announces them, as a restore does. */
    restore: vi.fn((snapshot: GameSnapshot) => {
      state.score = snapshot.score;
      state.moves = snapshot.moves;
      state.undoDepth = snapshot.history.length;
      emit("game-reset");
    }),
  };
}

export type MockGameModel = ReturnType<typeof createMockGameModel>;

/**
 * Returns the mock as the game type the catalog session holds, which checks at
 * compile time that it still fits.
 */
export function asGameModel(mock: MockGameModel): PlayableGame {
  return mock;
}
