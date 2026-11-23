import type { FrameChange } from "@fz/brick-wall/view/rounds_played";
import type { Round } from "../../rules/flight/events";
import { FLIGHT_RULES } from "../../rules/tuning";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
} from "../../testing/flight_fixtures";
import { FLIGHT_PACE } from "../../view/play/pace";
import { type PlayOptions, RoundPlay } from "../../view/play/round_play";
import { type FlightNews, PlayedRounds } from "./played_rounds";

// How a round plays back is the view's `RoundPlay`'s, whose spec holds it:
// this one holds what the driver and the game read of it.

const { plain, rally } = FLIGHT_FIXTURES;

/** A frame's time in these specs. */
const FRAME_MS = 10;

/** A frame at Normal, not fast-forwarded, motion welcome and the run under way. */
const NORMAL: PlayOptions = {
  pace: FLIGHT_PACE,
  speed: "normal",
  fast: false,
  motion: true,
  paused: false,
};

/** Returns a level's play, a fixture's round aimed. */
function aimed(fixture: FlightFixture): PlayedRounds {
  return new PlayedRounds(new RoundPlay(fixture.start, FLIGHT_RULES));
}

/** Returns a level's play, a fixture's round released, called out at a rally mark. */
function playing(fixture: FlightFixture, mark = 20): PlayedRounds {
  const play = aimed(fixture);
  play.callAt(mark);
  play.release(fixture.round);
  return play;
}

/** Plays frames until the flight's own news says something, and returns it. */
function playUntilHeard(play: PlayedRounds): FlightNews[] {
  for (let played = 0; played < 600_000; played += FRAME_MS) {
    play.advance(FRAME_MS, NORMAL);
    if (play.news.length > 0) return [...play.news];
  }
  throw new Error("Nothing was heard.");
}

/** Plays frames until a round's wall comes to rest, and returns what that frame came to. */
function playUntilSettled(play: PlayedRounds): FrameChange<Round> {
  for (let played = 0; played < 600_000; played += FRAME_MS) {
    const change = play.advance(FRAME_MS, NORMAL);
    if (change.settled !== null) return { ...change };
  }
  throw new Error("The round never came to rest.");
}

describe("PlayedRounds", () => {
  it("aims a level's first round from where it starts", () => {
    const play = aimed(plain);

    expect([play.phase, play.start, play.round]).toEqual([
      "aiming",
      plain.start,
      null,
    ]);
  });

  it("flies the round released", () => {
    const play = playing(plain);

    expect([play.phase, play.round]).toEqual(["flying", plain.round]);
  });

  it("scores all its flight played back once it has landed", () => {
    const play = playing(rally);

    playUntilSettled(play);

    expect(play.scored).toBe(rally.round.outcome.points);
  });

  it("says how far through its flight the playback has reached", () => {
    const play = playing(rally);

    play.advance(500, NORMAL);

    expect(play.moment).toBeCloseTo(FLIGHT_PACE.speeds.normal[0] * 0.5, 9);
  });

  it("hands on a floor bounce earned as the flight's own news", () => {
    const play = playing(rally);

    expect(playUntilHeard(play)).toEqual([
      { kind: "earned", by: "rally", rally: 10, kept: true },
    ]);
  });

  it("calls a flight out at the rally mark it was handed", () => {
    const play = playing(rally, 5);

    expect(playUntilHeard(play)).toEqual([{ kind: "called" }]);
  });

  it("calls no flight out before it is handed a rally mark", () => {
    const play = aimed(rally);
    play.release(rally.round);

    expect(playUntilHeard(play)).not.toContainEqual({ kind: "called" });
  });

  it("hands on the round whose wall comes to rest, and no card", () => {
    const play = playing(plain);

    const change = playUntilSettled(play);

    expect(change).toEqual({ settled: plain.round, opens: null });
  });

  it("hands on the flight's news no longer once the next frame says none", () => {
    const play = playing(rally);
    playUntilHeard(play);

    play.advance(FRAME_MS, NORMAL);

    expect(play.news).toEqual([]);
  });

  it("lands a flight skipped at the next frame", () => {
    const play = playing(plain);

    play.skip();
    play.advance(0, NORMAL);

    expect(play.moment).toBe(plain.round.flight.length);
  });

  it("lands a flight unseen with none of its news", () => {
    const play = playing(rally);

    play.landUnseen(NORMAL);

    expect([play.moment, play.news]).toEqual([rally.round.flight.length, []]);
  });

  it("draws the round as its play draws it", () => {
    const round = new RoundPlay(plain.start, FLIGHT_RULES);

    const play = new PlayedRounds(round);

    expect(play.view).toBe(round.view);
  });
});
