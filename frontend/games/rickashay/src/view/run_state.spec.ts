import { FLIGHT_FIXTURES } from "../testing/flight_fixtures";
import {
  BEATS,
  type FlightSoFar,
  type PlayState,
  type RoundChange,
  type RoundNews,
  type RunState,
  newRunState,
  withFrame,
  withNewsSaid,
} from "./run_state";

const { plain } = FLIGHT_FIXTURES;

/** A run as the specs stand one in, the rules' own still to come. */
interface SpecRun {
  readonly id: number;
}

/** The run on the board. */
const RUN: SpecRun = { id: 1 };

/** A flight before its release. */
const NOTHING_FLOWN: FlightSoFar = { rally: 0, held: 0, turns: 0, points: 0 };

/** A frame's change that came to nothing. */
const NOTHING: RoundChange = { news: [], opens: null };

/** The plain shot's level, its round aimed. */
const AIMED: PlayState = {
  start: plain.start,
  round: null,
  phase: "aiming",
  soFar: NOTHING_FLOWN,
};

/** The plain shot's level, its round in the air. */
const FLYING: PlayState = { ...AIMED, round: plain.round, phase: "flying" };

/** The state of the plain shot's level as it begins. */
const BEGUN: RunState<SpecRun> = newRunState(RUN, AIMED);

/** The rally's floor bounce, as the announcer says it. */
const EARNED: RoundNews = {
  kind: "earned",
  by: "rally",
  rally: 10,
  kept: true,
};

/** The plain shot's round, ended. */
const ENDED: RoundNews = { kind: "ended", round: plain.round };

describe("newRunState", () => {
  it("begins a run with its play as it stands, nothing to say, no card and no new best", () => {
    expect(newRunState(RUN, AIMED)).toEqual({
      run: RUN,
      start: plain.start,
      round: null,
      phase: "aiming",
      soFar: NOTHING_FLOWN,
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

  it("keeps the same state for a frame whose count of the flight says the same in a record of its own", () => {
    const play = { ...AIMED, soFar: { ...NOTHING_FLOWN } };

    expect(withFrame(BEGUN, play, NOTHING)).toBe(BEGUN);
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

  it("takes in the round aimed next, from where it starts", () => {
    const next = withFrame(
      BEGUN,
      { ...AIMED, start: plain.round.next },
      NOTHING,
    );

    expect(next.start).toBe(plain.round.next);
  });

  it.each([
    ["rally", { rally: 3 }],
    ["held", { held: 1 }],
    ["turns", { turns: 5 }],
    ["points", { points: 30 }],
  ] as const)("takes in the flight's %s played back so far", (_, counted) => {
    const soFar = { ...NOTHING_FLOWN, ...counted };

    const state = withFrame(BEGUN, { ...FLYING, soFar }, NOTHING);

    expect(state.soFar).toEqual(soFar);
  });

  it("adds a frame's news to what is still to say, in order", () => {
    const earned = withFrame(BEGUN, FLYING, { news: [EARNED], opens: null });

    const ended = withFrame(earned, FLYING, {
      news: [{ kind: "called" }, ENDED],
      opens: null,
    });

    expect(ended.news).toEqual([EARNED, { kind: "called" }, ENDED]);
  });

  it("opens the card a frame's wait ran out", () => {
    const state = withFrame(BEGUN, AIMED, { news: [], opens: "cleared" });

    expect(state.card).toBe("cleared");
  });

  it("keeps a card open through the frames after it", () => {
    const opened = withFrame(BEGUN, AIMED, { news: [], opens: "result" });

    const later = withFrame(opened, FLYING, NOTHING);

    expect(later.card).toBe("result");
  });

  it("changes nothing it was handed", () => {
    const news = [EARNED];

    withFrame({ ...BEGUN, news }, FLYING, { news: [ENDED], opens: null });

    expect(news).toEqual([EARNED]);
  });
});

describe("withNewsSaid", () => {
  it("empties the news once it is said", () => {
    const state = withFrame(BEGUN, FLYING, { news: [EARNED], opens: null });

    expect(withNewsSaid(state).news).toEqual([]);
  });

  it("keeps the same state when there was no news", () => {
    expect(withNewsSaid(BEGUN)).toBe(BEGUN);
  });
});

describe("BEATS", () => {
  it("lists the wall's step and its jump, the danger line, and the level cleared or lost", () => {
    expect(BEATS).toEqual(["step", "jump", "danger", "cleared", "lost"]);
  });
});
