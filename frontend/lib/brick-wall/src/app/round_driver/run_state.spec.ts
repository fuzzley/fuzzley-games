import { createRun } from "../../rules/run";
import type { FrameChange, PlayState } from "../../view/rounds_played";
import {
  type RunState,
  newRunState,
  withFrame,
  withNewsSaid,
} from "./run_state";

/** Where a made-up round starts: its field's depth, and how many rounds came before it. */
interface Start {
  readonly depth: number;
  readonly round: number;
}

/** A made-up round played: the points it scored and where the next starts. */
interface Round {
  readonly points: number;
  readonly next: Start;
}

/** Where the first made-up round starts. */
const FIRST: Start = { depth: 11, round: 0 };

/** A made-up round from the first start. */
const PLAYED: Round = { points: 10, next: { depth: 11, round: 1 } };

/** Another made-up round from the first start. */
const OTHER: Round = { points: 20, next: { depth: 11, round: 1 } };

/** A frame's change that came to nothing. */
const NOTHING: FrameChange<Round> = { settled: null, opens: null };

/** The first round aimed. */
const AIMED: PlayState<Start, Round> = {
  start: FIRST,
  round: null,
  phase: "aiming",
  scored: 0,
};

/** The first round in the air. */
const FLYING: PlayState<Start, Round> = {
  ...AIMED,
  round: PLAYED,
  phase: "flying",
};

/** A run waiting for its first move on a made-up level. */
const RUN = createRun(
  { id: 1, level: 1, depth: 11 },
  [{ data: { id: "ash" } }],
  { pars: { ash: { "11": 3 } }, untallied: 0 },
);

/** The state of the run as it begins. */
const BEGUN: RunState<number, Start, Round> = newRunState(RUN, FIRST);

/** The state of the run, its first round in the air. */
const FLOWN: RunState<number, Start, Round> = {
  ...BEGUN,
  round: PLAYED,
  phase: "flying",
};

describe("newRunState", () => {
  it("begins a run with its round aimed, nothing scored, nothing to say, no card and no new best", () => {
    expect(newRunState(RUN, FIRST)).toEqual({
      run: RUN,
      start: FIRST,
      round: null,
      phase: "aiming",
      scored: 0,
      card: null,
      resultClosed: false,
      news: [],
      newBest: false,
    });
  });
});

describe("withFrame", () => {
  it("keeps the same state for a frame that changed nothing", () => {
    expect(withFrame(BEGUN, AIMED, NOTHING)).toBe(BEGUN);
  });

  it("takes in a round released", () => {
    expect(withFrame(BEGUN, FLYING, NOTHING)).toEqual({
      ...BEGUN,
      round: PLAYED,
      phase: "flying",
    });
  });

  it("takes in where the round stands", () => {
    const settling = withFrame(
      FLOWN,
      { ...FLYING, phase: "settling" },
      NOTHING,
    );

    expect(settling.phase).toBe("settling");
  });

  it("takes in the points the flight has played back so far", () => {
    const scored = withFrame(FLOWN, { ...FLYING, scored: 30 }, NOTHING);

    expect(scored.scored).toBe(30);
  });

  it("takes in a round aimed again from another start", () => {
    const again = withFrame(BEGUN, { ...AIMED, start: PLAYED.next }, NOTHING);

    expect(again.start).toBe(PLAYED.next);
  });

  it("takes in another round in play", () => {
    const another = withFrame(FLOWN, { ...FLYING, round: OTHER }, NOTHING);

    expect(another.round).toBe(OTHER);
  });

  it("adds the round a frame brought to rest to the news", () => {
    const state = withFrame(FLOWN, FLYING, { ...NOTHING, settled: PLAYED });

    expect(state.news).toEqual([PLAYED]);
  });

  it("keeps the news not yet said, in order", () => {
    const first = withFrame(FLOWN, FLYING, { ...NOTHING, settled: PLAYED });

    const second = withFrame(first, FLYING, { ...NOTHING, settled: OTHER });

    expect(second.news).toEqual([PLAYED, OTHER]);
  });

  it("keeps the same news for a frame that adds none", () => {
    const ended = withFrame(FLOWN, FLYING, { ...NOTHING, settled: PLAYED });

    const settling = withFrame(
      ended,
      { ...FLYING, phase: "settling" },
      NOTHING,
    );

    expect(settling.news).toBe(ended.news);
  });

  it("opens the card a frame opened", () => {
    const state = withFrame(FLOWN, FLYING, { ...NOTHING, opens: "result" });

    expect(state.card).toBe("result");
  });

  it("keeps the card open", () => {
    const opened = withFrame(BEGUN, FLYING, { ...NOTHING, opens: "cleared" });

    const after = withFrame(opened, { ...FLYING, scored: 5 }, NOTHING);

    expect(after.card).toBe("cleared");
  });

  it("keeps the rest of the run's state", () => {
    const kept = { ...BEGUN, resultClosed: true, newBest: true };

    const flying = withFrame(kept, FLYING, NOTHING);

    expect([flying.run, flying.resultClosed, flying.newBest]).toEqual([
      RUN,
      true,
      true,
    ]);
  });
});

describe("withNewsSaid", () => {
  it("forgets the news once it is said", () => {
    const ended = withFrame(FLOWN, FLYING, { ...NOTHING, settled: PLAYED });

    expect(withNewsSaid(ended)).toEqual({ ...ended, news: [] });
  });

  it("keeps the same state when there was nothing to say", () => {
    expect(withNewsSaid(BEGUN)).toBe(BEGUN);
  });
});
