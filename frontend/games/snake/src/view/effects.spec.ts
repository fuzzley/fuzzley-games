import { runFrom } from "../testing/run_picture";
import type { Run } from "../rules/run";
import { NO_EFFECTS, effectsOf } from "./effects";

const BOARD = [".....", ".>>@.", ".....", ".....", "....*"];

/** Returns a run whose last step did something. */
function after(last: Run["last"], change: Partial<Run> = {}): Run {
  return { ...runFrom(BOARD, { steps: 4 }), last, ...change };
}

describe("effectsOf", () => {
  it("scatters crumbs where an apple was eaten, pops the next, and plays its sound", () => {
    expect(effectsOf(after("ate"), false, true)).toEqual({
      ...NO_EFFECTS,
      crumbs: { x: 3, y: 1 },
      pop: { x: 4, y: 4 },
      sound: "eat",
    });
  });

  it("shakes and fades at a crash, with its sound", () => {
    expect(effectsOf(after("crashed"), false, true)).toEqual({
      ...NO_EFFECTS,
      shake: true,
      fade: true,
      sound: "crash",
    });
  });

  it("plays the new best's sound at a crash that set one", () => {
    expect(effectsOf(after("crashed"), true, true).sound).toBe("best");
  });

  it("plays the new best's sound at a full board", () => {
    expect(effectsOf(after("won"), false, true)).toMatchObject({
      sound: "best",
      crumbs: { x: 3, y: 1 },
    });
  });

  it("calls for nothing after a plain step", () => {
    expect(effectsOf(after("moved"), false, true)).toBe(NO_EFFECTS);
  });

  it("pops the first apple as a run begins", () => {
    expect(effectsOf(after(null, { steps: 0 }), false, true)).toEqual({
      ...NO_EFFECTS,
      pop: { x: 4, y: 4 },
    });
  });

  it("calls for nothing on a run taken up part way", () => {
    expect(effectsOf(after(null), false, true)).toBe(NO_EFFECTS);
  });

  it.each([
    ["ate", { crumbs: null, pop: null, sound: "eat" }],
    ["crashed", { shake: false, fade: true }],
    ["won", { crumbs: null, sound: "best" }],
  ] as const)(
    "leaves out motion after %s where it is unwelcome",
    (last, left) => {
      expect(effectsOf(after(last), false, false)).toMatchObject(left);
    },
  );

  it("leaves out the first apple's pop where motion is unwelcome", () => {
    expect(effectsOf(after(null, { steps: 0 }), false, false)).toBe(NO_EFFECTS);
  });
});
