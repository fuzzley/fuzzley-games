import { BEATS, waitingX } from "./run_state";

describe("BEATS", () => {
  it("lists the shot's release, hot or not, the wall's step and its jump, the danger line, and the level cleared or lost", () => {
    expect(BEATS).toEqual([
      "release",
      "hot-release",
      "step",
      "jump",
      "danger",
      "cleared",
      "lost",
    ]);
  });
});

describe("waitingX", () => {
  it("finds a fuzzball that heads nowhere waiting where it stands", () => {
    expect(waitingX({ x: 3.5, dx: 0, dy: 0, home: false })).toBe(3.5);
  });

  it.each([
    ["flies across", { dx: 2, dy: 0 }],
    ["flies straight up", { dx: 0, dy: 3 }],
  ])("finds none waiting while it %s", (_, speeds) => {
    expect(waitingX({ x: 3.5, ...speeds, home: false })).toBeNull();
  });

  it("finds none waiting while it drops home, heading nowhere", () => {
    expect(waitingX({ x: 3.5, dx: 0, dy: 0, home: true })).toBeNull();
  });
});
