import { LEVELS } from "../rules/levels/levels";
import { type Run, createRun } from "../rules/run/run";
import { FLIGHT_FIXTURES } from "../testing/flight_fixtures";
import {
  type PlayState,
  type RoundChange,
  type RunState,
  newRunState,
  withFrame,
  withNewsSaid,
} from "./run_state";

const { plain, lost } = FLIGHT_FIXTURES;

/** A frame's change that came to nothing. */
const NOTHING: RoundChange = { freed: [], settled: null, opens: null };

/** The plain shot's level, its round aimed. */
const AIMED: PlayState = { start: plain.start, round: null, phase: "aiming" };

/** The plain shot's level, its round in the air. */
const FLYING: PlayState = { ...AIMED, round: plain.round, phase: "flying" };

/** A run waiting for its first move on the first level. */
const RUN: Run = createRun({ id: 1, level: 1, depth: 11 }, LEVELS);

/** The state of the plain shot's level as it begins. */
const BEGUN: RunState = newRunState(RUN, plain.start, false);

/** The state of the plain shot's level, its round in the air. */
const FLOWN: RunState = { ...BEGUN, round: plain.round, phase: "flying" };

describe("newRunState", () => {
  it("begins a run with its round aimed, nothing to say, no card and no new best", () => {
    expect(newRunState(RUN, plain.start, true)).toEqual({
      run: RUN,
      start: plain.start,
      round: null,
      phase: "aiming",
      card: null,
      resultClosed: false,
      news: [],
      tuned: true,
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
      round: plain.round,
      phase: "flying",
    });
  });

  it("takes in where the round stands", () => {
    const flying = withFrame(BEGUN, FLYING, NOTHING);

    const settling = withFrame(
      flying,
      { ...FLYING, phase: "settling" },
      NOTHING,
    );

    expect(settling.phase).toBe("settling");
  });

  it("takes in a round aimed again from another start", () => {
    const again = withFrame(
      BEGUN,
      { ...AIMED, start: plain.round.next },
      NOTHING,
    );

    expect(again.start).toBe(plain.round.next);
  });

  it("takes in another round in play", () => {
    const another = withFrame(FLOWN, { ...FLYING, round: lost.round }, NOTHING);

    expect(another.round).toBe(lost.round);
  });

  it("takes in the next round aimed", () => {
    const flying = withFrame(BEGUN, FLYING, NOTHING);

    const next = withFrame(
      flying,
      { start: plain.round.next, round: null, phase: "aiming" },
      NOTHING,
    );

    expect([next.start, next.round]).toEqual([plain.round.next, null]);
  });

  it("adds the friends a frame freed to the news, in order", () => {
    const state = withFrame(FLOWN, FLYING, { ...NOTHING, freed: [3, 5] });

    expect(state.news).toEqual([
      { kind: "freed", ink: 3 },
      { kind: "freed", ink: 5 },
    ]);
  });

  it("adds the round a frame brought to rest to the news, after the friends it freed", () => {
    const state = withFrame(BEGUN, FLYING, {
      ...NOTHING,
      freed: [3],
      settled: plain.round,
    });

    expect(state.news).toEqual([
      { kind: "freed", ink: 3 },
      { kind: "ended", round: plain.round },
    ]);
  });

  it("keeps the news not yet said", () => {
    const freed = withFrame(BEGUN, FLYING, { ...NOTHING, freed: [3] });

    const ended = withFrame(freed, FLYING, {
      ...NOTHING,
      settled: plain.round,
    });

    expect(ended.news).toEqual([
      { kind: "freed", ink: 3 },
      { kind: "ended", round: plain.round },
    ]);
  });

  it("keeps the same news for a frame that adds none", () => {
    const freed = withFrame(BEGUN, FLYING, { ...NOTHING, freed: [3] });

    const settling = withFrame(
      freed,
      { ...FLYING, phase: "settling" },
      NOTHING,
    );

    expect(settling.news).toBe(freed.news);
  });

  it("opens the card a frame opened", () => {
    const settling: PlayState = {
      start: lost.start,
      round: lost.round,
      phase: "settling",
    };

    const state = withFrame(
      { ...newRunState(RUN, lost.start, false), ...settling },
      settling,
      { ...NOTHING, opens: "result" },
    );

    expect(state.card).toBe("result");
  });

  it("keeps the rest of the run's state", () => {
    const kept: RunState = { ...BEGUN, tuned: true, newBest: true };

    const flying = withFrame(kept, FLYING, NOTHING);

    expect([flying.run, flying.tuned, flying.newBest]).toEqual([
      RUN,
      true,
      true,
    ]);
  });

  it("keeps the card open", () => {
    const opened = withFrame(BEGUN, FLYING, { ...NOTHING, opens: "cleared" });

    const after = withFrame(opened, FLYING, { ...NOTHING, freed: [3] });

    expect(after.card).toBe("cleared");
  });
});

describe("withNewsSaid", () => {
  it("forgets the news once it is said", () => {
    const freed = withFrame(BEGUN, FLYING, { ...NOTHING, freed: [3] });

    expect(withNewsSaid(freed)).toEqual({ ...freed, news: [] });
  });

  it("keeps the same state when there was nothing to say", () => {
    expect(withNewsSaid(BEGUN)).toBe(BEGUN);
  });
});
