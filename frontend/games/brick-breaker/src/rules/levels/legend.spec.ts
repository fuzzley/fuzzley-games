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

  it("lays a portal out with its pair", () => {
    expect(brickOf({ kind: "portal", pair: 1 }, 0).pair).toBe(1);
  });

  it("lays a slider out heading its way", () => {
    expect(brickOf({ kind: "slider", heading: -1 }, 0).heading).toBe(-1);
  });
});

describe("the shared legend", () => {
  it.each(["2", "3", "4"])("draws a tough brick of %s hits as %s", (digit) => {
    expect(LEGEND[digit]).toEqual({ kind: "tough", hits: Number(digit) });
  });

  it("draws a plated brick of one hit as u and of two as U", () => {
    expect([LEGEND["u"], LEGEND["U"]]).toEqual([
      { kind: "plated" },
      { kind: "plated", hits: 2 },
    ]);
  });

  it("draws a portal of the first pair as @ and of the second as %", () => {
    expect([LEGEND["@"], LEGEND["%"]]).toEqual([
      { kind: "portal", pair: 0 },
      { kind: "portal", pair: 1 },
    ]);
  });

  it("draws a slider heading right as > and left as <", () => {
    expect([LEGEND[">"], LEGEND["<"]]).toEqual([
      { kind: "slider", heading: 1 },
      { kind: "slider", heading: -1 },
    ]);
  });
});
