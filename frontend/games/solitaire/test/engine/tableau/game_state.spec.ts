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

    state.update({ score: 25 });

    expect(published.map((metrics) => metrics.score)).toEqual([0, 25]);
  });

  it("stays quiet when an update changes nothing", () => {
    const state = new GameState();
    state.update({ score: 25 });
    const published = follow(state);

    state.update({ score: 25, moves: 0 });

    // Only the reading reported on subscribe.
    expect(published).toHaveLength(1);
  });

  it("publishes a change to several metrics once", () => {
    const state = new GameState();
    const published = follow(state);

    state.update({ score: 5, moves: 1, undoDepth: 1 });

    expect(published).toEqual([
      { score: 0, moves: 0, undoDepth: 0 },
      { score: 5, moves: 1, undoDepth: 1 },
    ]);
  });

  it("keeps the metrics an update leaves out", () => {
    const state = new GameState();
    state.update({ score: 40, moves: 2 });

    state.update({ undoDepth: 1 });

    expect(state.snapshot()).toEqual({ score: 40, moves: 2, undoDepth: 1 });
  });

  it("reports the current readings to a late follower", () => {
    const state = new GameState();
    state.update({ score: 40 });

    const published = follow(state);

    expect(published.map((metrics) => metrics.score)).toEqual([40]);
  });

  it("stops publishing once a follower has unsubscribed", () => {
    const state = new GameState();
    const published: GameMetrics[] = [];
    const unsubscribe = state.onChange((metrics) => published.push(metrics));

    unsubscribe();
    state.update({ score: 99 });

    expect(published).toHaveLength(1);
  });
});
