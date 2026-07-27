import { describe, it, expect } from "vitest";
import { GameState } from "@/game/model/game/game_state";

describe("GameState", () => {
  it("starts at zero", () => {
    const state = new GameState();

    expect([state.score, state.moves, state.undoDepth]).toEqual([0, 0, 0]);
  });

  it("publishes a new score to subscribers", () => {
    const state = new GameState();
    const published: number[] = [];
    state.score$.subscribe((score) => published.push(score));

    state.score = 25;

    expect(published).toEqual([0, 25]);
  });

  it("stays quiet when the score is set to what it already is", () => {
    const state = new GameState();
    state.score = 25;
    const published: number[] = [];
    state.score$.subscribe((score) => published.push(score));

    state.score = 25;

    // Only the current value the subject replays on subscribe.
    expect(published).toEqual([25]);
  });

  it("supports the compound assignment the game logic uses", () => {
    const state = new GameState();
    state.score = 10;

    state.score += 5;

    expect(state.score).toBe(15);
  });

  it("publishes a new move count to subscribers", () => {
    const state = new GameState();
    const published: number[] = [];
    state.moves$.subscribe((moves) => published.push(moves));

    state.moves++;

    expect(published).toEqual([0, 1]);
  });

  it("stays quiet when the move count is unchanged", () => {
    const state = new GameState();
    const published: number[] = [];
    state.moves$.subscribe((moves) => published.push(moves));

    state.moves = 0;

    expect(published).toEqual([0]);
  });

  it("publishes a new undo depth to subscribers", () => {
    const state = new GameState();
    const published: number[] = [];
    state.undoDepth$.subscribe((depth) => published.push(depth));

    state.undoDepth = 3;

    expect(published).toEqual([0, 3]);
  });

  it("replays the current value to a late subscriber", () => {
    const state = new GameState();
    state.score = 40;
    const published: number[] = [];

    state.score$.subscribe((score) => published.push(score));

    expect(published).toEqual([40]);
  });
});
