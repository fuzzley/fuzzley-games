import { MOVE_FIXTURES } from "../testing/move_fixtures";
import { drawnPlay, playOf } from "../testing/scene_shell";
import { FEEL } from "../view/timeline/feel";
import { PlayClock } from "./play_clock";

const BUNCH = playOf(MOVE_FIXTURES.bunch);
const REFUSED = playOf(MOVE_FIXTURES.refused);

/** A level's end a tap may hurry from 100 ms in, its card at 500 ms and its star at 600 ms. */
const ENDING = drawnPlay({
  restMs: 400,
  end: { cardMs: 500, starsMs: [600], hurriedFromMs: 100 },
});

/** Returns a clock that has played the level's end a time in, by frames of 16 ms, and been hurried then. */
function hurriedAt(ms: number): PlayClock {
  const clock = advanced(Array<number>(ms / 16).fill(16), ENDING);
  clock.hurry();
  return clock;
}

/** Returns a clock moved on by each frame's time with a play, from the scene's start unless it is handed one already running. */
function advanced(
  frames: readonly number[],
  play = BUNCH,
  clock = new PlayClock(),
): PlayClock {
  for (const deltaMs of frames) clock.advance(play, deltaMs);
  return clock;
}

/** Returns a clock that has run two frames with the bunch, a play before the one a spec follows. */
function runningClock(): PlayClock {
  return advanced([16, 16]);
}

describe("PlayClock", () => {
  it("runs on by each frame's time", () => {
    const clock = advanced([16, 17, 16]);

    expect(clock.nowMs).toBe(49);
  });

  it("stands a new play as far into its timeline as the clock has run since the frame that first met it", () => {
    const running = runningClock();

    const clock = advanced([16, 17, 16], REFUSED, running);

    expect({ nowMs: clock.nowMs, playedMs: clock.playedMs }).toEqual({
      nowMs: 81,
      playedMs: 49,
    });
  });

  it("plays from the moment the frame before stood at", () => {
    const clock = advanced([16, 16, 20]);

    expect({ sinceMs: clock.sinceMs, playedMs: clock.playedMs }).toEqual({
      sinceMs: 32,
      playedMs: 52,
    });
  });

  it("plays a new play from its start", () => {
    const running = runningClock();

    const clock = advanced([16], REFUSED, running);

    expect(clock.sinceMs).toBe(0);
  });

  it("stands a play that lands at once past its rest, with nothing of it to play", () => {
    const running = runningClock();

    const clock = advanced([16], { ...BUNCH, landed: true }, running);

    expect({
      past: clock.sinceMs > BUNCH.timeline.restMs,
      since: clock.sinceMs,
    }).toEqual({ past: true, since: clock.playedMs });
  });

  it("takes the moments of the play's timeline from the one the frame before stood at, up to the one it stands at", () => {
    const clock = advanced([16, 16]);

    expect([15, 16, 31, 32].map((atMs) => clock.starts(atMs))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("takes nothing of a play that lands at once", () => {
    const clock = advanced([16], { ...BUNCH, landed: true }, runningClock());

    expect(clock.starts(BUNCH.timeline.restMs)).toBe(false);
  });

  it("takes the moments of the scene's own time from its time the frame before, up to its time now", () => {
    const clock = advanced([16, 20]);

    expect([15, 16, 35, 36].map((atMs) => clock.reaches(atMs))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("finds a moment of the play's timeline on the scene's clock", () => {
    const clock = advanced([16, 16], REFUSED, runningClock());

    expect(clock.nowOf(20)).toBe(52);
  });

  it("runs the play and the scene's time as many times as fast as the feel hurries, once a tap hurries the play past the moment its end lets it", () => {
    const clock = advanced([16], ENDING, hurriedAt(128));

    expect([clock.playedMs, clock.nowMs]).toEqual([
      128 + 16 * FEEL.hurriedPace,
      128 + 16 * FEEL.hurriedPace,
    ]);
  });

  it("hurries nothing before the moment its end lets a tap hurry it from", () => {
    const clock = advanced([16], ENDING, hurriedAt(64));

    expect(clock.playedMs).toBe(80);
  });

  it("hurries nothing of a play whose timeline lets no tap hurry it", () => {
    const clock = advanced([16, 16], BUNCH);
    clock.hurry();

    advanced([16], BUNCH, clock);

    expect(clock.playedMs).toBe(48);
  });

  it("runs at the frames' pace again once the play is past the last of its end's beats", () => {
    const clock = advanced(Array<number>(8).fill(16), ENDING, hurriedAt(128));

    advanced([16], ENDING, clock);

    expect(clock.playedMs).toBe(128 + 8 * 16 * FEEL.hurriedPace + 16);
  });

  it("hurries no play after the one it hurried", () => {
    const clock = advanced([16], REFUSED, hurriedAt(128));

    expect(clock.playedMs).toBe(16);
  });
});
