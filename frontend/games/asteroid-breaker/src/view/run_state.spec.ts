import type { WaveTally } from "../rules/field/scoring";
import { type Run, createRun, startWave } from "../rules/run/run";
import { FULL_STEP } from "../rules/sparks/charge";
import { STATIC_MOST } from "../rules/tuning";
import type { FrameChange } from "./run_frames";
import { type RunState, newRunState, withFrame } from "./run_state";
import { TALLY_COUNT_MS } from "./tally";

/** A run waiting at its first wave for its first move. */
const RUN: Run = createRun({ id: 1, seed: 7, speed: "normal", wave: 1 });

/** The numbers in use off `tuning.ts`'s, as the debug menu tuned them. */
const RETUNED = true;

/** The numbers in use as `tuning.ts` writes them. */
const AS_WRITTEN = false;

/** What a frame that changed nothing hands the shell: its field yet to move, its pilot at rest. */
const QUIET: FrameChange = {
  run: null,
  moved: false,
  cameHome: [],
  multiplier: null,
  step: null,
  face: "rest",
  lift: 0,
  tally: null,
  opens: null,
  countMs: 0,
  buzz: null,
};

/** What a frame of a wave under way hands the shell that changed nothing of it. */
const PLAYED: FrameChange = { ...QUIET, moved: true, multiplier: 1, step: 0 };

/** What a frame of a wave under way hands the shell as static rises to its first step. */
const RISEN: FrameChange = { ...PLAYED, multiplier: 2, step: 1 };

/** What a frame of a cleared wave hands the shell, where motion is welcome. */
const CLEARED_FRAME: FrameChange = { ...QUIET, countMs: 16 };

/** How a cleared wave's points added up. */
const TALLY: WaveTally = {
  rocks: 400,
  sparks: 30,
  static: 80,
  strays: 0,
  cleared: 500,
  clean: 250,
};

/** Returns a run's state as it begins, with what a spec gives of its own. */
function stateOf(own: Partial<RunState> = {}): RunState {
  return { ...newRunState(RUN), ...own };
}

describe("newRunState", () => {
  it("begins a run with none of its static, its cards or its marks, flown on no tuned numbers, its pilot at rest", () => {
    expect(newRunState(RUN)).toEqual({
      run: RUN,
      tuned: false,
      multiplier: 1,
      step: 0,
      face: "rest",
      lift: 0,
      tally: null,
      clearedOpen: false,
      tallyMs: 0,
      newBest: false,
      clearedAll: false,
      broughtHome: [],
      resultOpen: false,
      resultClosed: false,
    });
  });

  it("begins a run with the static it carries", () => {
    const state = newRunState({ ...RUN, charge: 25 });

    expect([state.multiplier, state.step]).toEqual([3, 2]);
  });

  it("begins a run taken up with the static its field holds, rather than the run's", () => {
    const state = newRunState({ ...RUN, charge: 25 }, STATIC_MOST);

    expect([state.multiplier, state.step]).toEqual([4, FULL_STEP]);
  });
});

describe("withFrame", () => {
  describe("a frame that changes nothing", () => {
    it("returns the same state while the field waits for its first move", () => {
      const state = stateOf();

      expect(withFrame(state, QUIET, AS_WRITTEN)).toBe(state);
    });

    it("returns the same state while the wave plays on, its static as it was", () => {
      const state = stateOf();

      expect(withFrame(state, PLAYED, AS_WRITTEN)).toBe(state);
    });

    it("returns the same state, a run already flown on tuned numbers flown on them still", () => {
      const state = stateOf({ tuned: true });

      expect(withFrame(state, PLAYED, RETUNED)).toBe(state);
    });
  });

  it("takes the run the frame changed", () => {
    const started = startWave(RUN);

    const after = withFrame(stateOf(), { ...PLAYED, run: started }, AS_WRITTEN);

    expect(after.run).toBe(started);
  });

  describe("the numbers it is flown on", () => {
    it("flies a run on tuned numbers from a frame that moves its field on them", () => {
      const after = withFrame(stateOf(), PLAYED, RETUNED);

      expect(after.tuned).toBe(true);
    });

    it("flies a run on no tuned numbers while its field hasn't moved, though they are tuned", () => {
      const state = stateOf();

      expect(withFrame(state, QUIET, RETUNED)).toBe(state);
    });

    it("keeps a run flown on tuned numbers flown on them, though they are put back", () => {
      const after = withFrame(stateOf({ tuned: true }), PLAYED, AS_WRITTEN);

      expect(after.tuned).toBe(true);
    });
  });

  describe("static", () => {
    it("takes the multiplier and the step the frame shows", () => {
      const after = withFrame(stateOf(), RISEN, AS_WRITTEN);

      expect([after.multiplier, after.step]).toEqual([2, 1]);
    });

    it("takes a step alone that leaves the multiplier as it was, as full does", () => {
      const state = stateOf({ multiplier: 4, step: 3 });

      const after = withFrame(
        state,
        { ...PLAYED, multiplier: 4, step: 4 },
        AS_WRITTEN,
      );

      expect(after.step).toBe(4);
    });

    it("keeps static through a frame that leaves it, as a paused one does", () => {
      const state = stateOf({ multiplier: 2, step: 1 });

      expect(withFrame(state, QUIET, AS_WRITTEN)).toBe(state);
    });
  });

  describe("the pilot at the controls", () => {
    it("takes the face the frame shows", () => {
      const after = withFrame(
        stateOf(),
        { ...PLAYED, face: "set" },
        AS_WRITTEN,
      );

      expect(after.face).toBe("set");
    });

    it("takes the lift the frame shows the fur at", () => {
      const after = withFrame(stateOf(), { ...PLAYED, lift: 2 }, AS_WRITTEN);

      expect(after.lift).toBe(2);
    });

    it("returns the same state through a frame that shows the same face and lift", () => {
      const state = stateOf({ face: "sleepy", lift: 1 });

      const after = withFrame(
        state,
        { ...QUIET, face: "sleepy", lift: 1 },
        AS_WRITTEN,
      );

      expect(after).toBe(state);
    });
  });

  describe("the strays brought home", () => {
    it("adds the pilots the frame brought home after those before, in the order they came", () => {
      const state = stateOf({ broughtHome: [3] });

      const after = withFrame(
        state,
        { ...PLAYED, cameHome: [4, 5] },
        AS_WRITTEN,
      );

      expect(after.broughtHome).toEqual([3, 4, 5]);
    });

    it("keeps none of the frame's own record, which the next frame writes over", () => {
      const cameHome = [4];
      const after = withFrame(stateOf(), { ...PLAYED, cameHome }, AS_WRITTEN);

      cameHome.length = 0;

      expect(after.broughtHome).toEqual([4]);
    });

    it("keeps those before through a frame that changes the run but brings none home", () => {
      const broughtHome = [3];
      const state = stateOf({ broughtHome });

      const after = withFrame(
        state,
        { ...PLAYED, run: startWave(RUN) },
        AS_WRITTEN,
      );

      expect(after.broughtHome).toBe(broughtHome);
    });
  });

  describe("the cards", () => {
    it("takes a cleared wave's tally, and opens no card before its wait", () => {
      const after = withFrame(
        stateOf(),
        { ...QUIET, tally: TALLY },
        AS_WRITTEN,
      );

      expect(after).toMatchObject({
        tally: TALLY,
        clearedOpen: false,
        resultOpen: false,
      });
    });

    it("keeps the last wave's tally through a frame that clears none", () => {
      const state = stateOf({ tally: TALLY });

      const after = withFrame(state, RISEN, AS_WRITTEN);

      expect(after.tally).toBe(TALLY);
    });

    it("opens the Cleared card at the frame that opens it", () => {
      const after = withFrame(
        stateOf(),
        { ...QUIET, opens: "cleared" },
        AS_WRITTEN,
      );

      expect(after).toMatchObject({ clearedOpen: true, resultOpen: false });
    });

    it("opens the result card at the frame that opens it", () => {
      const after = withFrame(
        stateOf(),
        { ...QUIET, opens: "result" },
        AS_WRITTEN,
      );

      expect(after).toMatchObject({ clearedOpen: false, resultOpen: true });
    });

    it("keeps a card open through a frame that changes the run", () => {
      const state = stateOf({ clearedOpen: true, resultOpen: true });

      const after = withFrame(
        state,
        { ...QUIET, run: startWave(RUN) },
        AS_WRITTEN,
      );

      expect(after).toMatchObject({ clearedOpen: true, resultOpen: true });
    });
  });

  describe("the Cleared card's sum", () => {
    it("counts nothing up before the card opens", () => {
      const state = stateOf();

      expect(withFrame(state, CLEARED_FRAME, AS_WRITTEN)).toBe(state);
    });

    it("counts the frame that opens the card", () => {
      const after = withFrame(
        stateOf(),
        { ...CLEARED_FRAME, opens: "cleared" },
        AS_WRITTEN,
      );

      expect(after.tallyMs).toBe(16);
    });

    it("counts up by each frame's time while the card shows", () => {
      const state = stateOf({ clearedOpen: true, tallyMs: 100 });

      const after = withFrame(state, CLEARED_FRAME, AS_WRITTEN);

      expect(after.tallyMs).toBe(116);
    });

    it("counts up no further than the whole count", () => {
      const state = stateOf({ clearedOpen: true, tallyMs: TALLY_COUNT_MS - 1 });

      const after = withFrame(state, CLEARED_FRAME, AS_WRITTEN);

      expect(after.tallyMs).toBe(TALLY_COUNT_MS);
    });

    it("returns the same state once the sum is whole", () => {
      const state = stateOf({ clearedOpen: true, tallyMs: TALLY_COUNT_MS });

      expect(withFrame(state, CLEARED_FRAME, AS_WRITTEN)).toBe(state);
    });
  });

  it("keeps what the frame doesn't touch: its marks and a result card put away", () => {
    const state = stateOf({
      newBest: true,
      clearedAll: true,
      resultClosed: true,
    });

    const after = withFrame(state, RISEN, AS_WRITTEN);

    expect(after).toMatchObject({
      newBest: true,
      clearedAll: true,
      resultClosed: true,
    });
  });
});
