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
  state.update({
    score: overrides.score ?? 0,
    moves: overrides.moves ?? 0,
    undoDepth: overrides.undoDepth ?? 0,
  });

  /** Raises an event as the real game would. */
  const emit = (event: string) => {
    listeners.get(event)?.forEach((callback) => callback());
  };

  /** Clears the readings and announces the new deal, as a real deal does. */
  const deal = () => {
    state.update({ score: 0, moves: 0, undoDepth: 0 });
    emit("game-reset");
  };

  return {
    state,

    on(event: string, callback: () => void) {
      const set = listeners.get(event) ?? new Set<() => void>();
      set.add(callback);
      listeners.set(event, set);
      return () => {
        set.delete(callback);
      };
    },

    emit,

    startNewGame: vi.fn(deal),
    restartGame: vi.fn(deal),
    undo: vi.fn(),

    /** Returns an empty board carrying the mock's score. */
    snapshot: vi.fn((): GameSnapshot => ({
      piles: [],
      score: state.score,
      extra: null,
      history: [],
      deal: [],
    })),
    /** Takes the snapshot's readings and announces them, as a restore does. */
    restore: vi.fn((snapshot: GameSnapshot) => {
      state.update({
        score: snapshot.score,
        moves: snapshot.history.length,
        undoDepth: snapshot.history.length,
      });
      emit("game-reset");
    }),
  };
}

export type MockGameModel = ReturnType<typeof createMockGameModel>;

/**
 * Returns an empty board whose history holds `moves` actions, which is how a
 * snapshot carries its move count.
 */
export function snapshotWithMoves(moves: number, score = 0): GameSnapshot {
  return {
    piles: [],
    score,
    history: Array.from({ length: moves }, () => ({
      kind: "move",
      transfers: [],
      scoreDelta: 0,
      flippedCardIds: [],
    })),
    deal: [],
    extra: null,
  };
}

/**
 * Returns the mock as the game type the catalog session holds, which checks at
 * compile time that it still fits.
 */
export function asGameModel(mock: MockGameModel): PlayableGame {
  return mock;
}
