import type { WaveTally } from "../rules/field/scoring";
import { type Run, createRun, startWave } from "../rules/run/run";
import type { FrameChange } from "./run_frames";
import { type RunState, newRunState, withFrame } from "./run_state";

/** A run waiting at its first wave for its first move. */
const RUN: Run = createRun({ id: 1, seed: 7, speed: "normal", wave: 1 });

/** The numbers in use off `tuning.ts`'s, as the debug menu tuned them. */
const RETUNED = true;

/** The numbers in use as `tuning.ts` writes them. */
const AS_WRITTEN = false;

/** What a frame that changed nothing hands the shell: its field yet to move. */
const QUIET: FrameChange = {
  run: null,
  moved: false,
  cameHome: [],
  chain: null,
  tally: null,
  opens: null,
};

/** What a frame of a wave under way hands the shell that changed nothing of it. */
const PLAYED: FrameChange = { ...QUIET, moved: true, chain: 1 };

/** How a cleared wave's points added up. */
const TALLY: WaveTally = {
  rocks: 400,
  chains: 80,
  strays: 0,
  cleared: 500,
  clean: 250,
};

/** Returns a run's state as it begins, with what a spec gives of its own. */
function stateOf(own: Partial<RunState> = {}): RunState {
  return { ...newRunState(RUN), ...own };
}

describe("newRunState", () => {
  it("begins a run with none of its chain, its cards or its marks, flown on no tuned numbers", () => {
    expect(newRunState(RUN)).toEqual({
      run: RUN,
      tuned: false,
      chain: 1,
      tally: null,
      clearedOpen: false,
      newBest: false,
      clearedAll: false,
      broughtHome: [],
      resultOpen: false,
      resultClosed: false,
    });
  });
});

describe("withFrame", () => {
  describe("a frame that changes nothing", () => {
    it("returns the same state while the field waits for its first move", () => {
      const state = stateOf();

      expect(withFrame(state, QUIET, AS_WRITTEN)).toBe(state);
    });

    it("returns the same state while the wave plays on, its chain as it was", () => {
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

  describe("the chain", () => {
    it("takes the chain the frame counts", () => {
      const after = withFrame(stateOf(), { ...PLAYED, chain: 2 }, AS_WRITTEN);

      expect(after.chain).toBe(2);
    });

    it("keeps the chain through a frame that leaves it, as a paused one does", () => {
      const state = stateOf({ chain: 2 });

      expect(withFrame(state, QUIET, AS_WRITTEN)).toBe(state);
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

      const after = withFrame(state, { ...PLAYED, chain: 2 }, AS_WRITTEN);

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

  it("keeps what the frame doesn't touch: its marks and a result card put away", () => {
    const state = stateOf({
      newBest: true,
      clearedAll: true,
      resultClosed: true,
    });

    const after = withFrame(state, { ...PLAYED, chain: 2 }, AS_WRITTEN);

    expect(after).toMatchObject({
      newBest: true,
      clearedAll: true,
      resultClosed: true,
    });
  });
});
