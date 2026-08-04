import { describe, it, expect } from "vitest";
import { GameMetrics, GameState } from "@/engine/tableau/game_state";

/** Records every set of metrics a state publishes to one follower. */
function follow(state: GameState): GameMetrics[] {
  const published: GameMetrics[] = [];
  state.onChange((metrics) => published.push(metrics));
  return published;
}

describe("GameState", () => {
  it("starts at zero", () => {
    const state = new GameState();

    expect([state.score, state.moves, state.undoDepth]).toEqual([0, 0, 0]);
  });

  it("publishes a new score to followers", () => {
    const state = new GameState();
    const published = follow(state);

    state.score = 25;

    expect(published.map((metrics) => metrics.score)).toEqual([0, 25]);
  });

  it("stays quiet when the score is set to what it already is", () => {
    const state = new GameState();
    state.score = 25;
    const published = follow(state);

    state.score = 25;

    // Only the reading reported on subscribe.
    expect(published.map((metrics) => metrics.score)).toEqual([25]);
  });

  it("supports the compound assignment the game logic uses", () => {
    const state = new GameState();
    state.score = 10;

    state.score += 5;

    expect(state.score).toBe(15);
  });

  it("publishes a new move count to followers", () => {
    const state = new GameState();
    const published = follow(state);

    state.moves++;

    expect(published.map((metrics) => metrics.moves)).toEqual([0, 1]);
  });

  it("stays quiet when the move count is unchanged", () => {
    const state = new GameState();
    const published = follow(state);

    state.moves = 0;

    expect(published.map((metrics) => metrics.moves)).toEqual([0]);
  });

  it("publishes a new undo depth to followers", () => {
    const state = new GameState();
    const published = follow(state);

    state.undoDepth = 3;

    expect(published.map((metrics) => metrics.undoDepth)).toEqual([0, 3]);
  });

  /*
   * What a BehaviorSubject gave for free, and what a display bound to a game
   * already in progress needs: the current score, not zero until the next move.
   */
  it("reports the current readings to a late follower", () => {
    const state = new GameState();
    state.score = 40;

    const published = follow(state);

    expect(published.map((metrics) => metrics.score)).toEqual([40]);
  });

  it("carries every metric on each change, not only the one that moved", () => {
    const state = new GameState();
    state.score = 40;
    state.moves = 2;
    const published = follow(state);

    state.undoDepth = 1;

    expect(published.at(-1)).toEqual({ score: 40, moves: 2, undoDepth: 1 });
  });

  it("stops publishing once a follower has unsubscribed", () => {
    const state = new GameState();
    const published: GameMetrics[] = [];
    const unsubscribe = state.onChange((metrics) => published.push(metrics));

    unsubscribe();
    state.score = 99;

    expect(published).toHaveLength(1);
  });
});
