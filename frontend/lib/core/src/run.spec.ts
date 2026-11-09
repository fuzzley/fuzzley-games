import { RUN_KEYS, type RunStage, hasEnded, isUnderWay } from "./run";

describe("RUN_KEYS", () => {
  it.each([
    ["Escape", "pause"],
    ["KeyP", "toggle"],
    ["Enter", "go"],
    ["NumpadEnter", "go"],
  ])("has %s ask the run to %s", (code, command) => {
    expect(RUN_KEYS[code]).toBe(command);
  });

  it("holds no other key", () => {
    expect(Object.keys(RUN_KEYS)).toHaveLength(4);
  });
});

describe("isUnderWay", () => {
  it.each<RunStage>(["playing", "paused"])(
    "says a run %s is under way",
    (stage) => {
      expect(isUnderWay(stage)).toBe(true);
    },
  );

  it.each<RunStage>(["ready", "cleared", "over", "won"])(
    "says a run %s isn't",
    (stage) => {
      expect(isUnderWay(stage)).toBe(false);
    },
  );
});

describe("hasEnded", () => {
  it.each<RunStage>(["over", "won"])("says a run %s has ended", (stage) => {
    expect(hasEnded(stage)).toBe(true);
  });

  it.each<RunStage>(["ready", "playing", "paused", "cleared"])(
    "says a run %s hasn't",
    (stage) => {
      expect(hasEnded(stage)).toBe(false);
    },
  );
});
