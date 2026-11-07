import { LEGEND, brickOf } from "./legend";

describe("brickOf", () => {
  it("lays a brick out with its kind's hits", () => {
    expect(brickOf({ kind: "ghost" }, 3)).toEqual({
      kind: "ghost",
      hits: 2,
      tint: 3,
      capsule: null,
    });
  });

  it("lays a brick out with the hits and the capsule its spec gives", () => {
    expect(brickOf({ kind: "gift", hits: 1, capsule: "life" }, 0)).toEqual({
      kind: "gift",
      hits: 1,
      tint: 0,
      capsule: "life",
    });
  });

  it("lays out a brick that never breaks with no hits", () => {
    expect(brickOf({ kind: "steel" }, 0).hits).toBe(0);
  });
});

describe("the shared legend", () => {
  it.each(["2", "3", "4"])("draws a tough brick of %s hits as %s", (digit) => {
    expect(LEGEND[digit]).toEqual({ kind: "tough", hits: Number(digit) });
  });
});
