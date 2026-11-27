import type { Piece } from "../../rules/catalog/pieces";
import { lookAt, restingFace } from "./looks";

describe("lookAt", () => {
  it("stands a sprite at its place, at its size, with its second fur grown in", () => {
    expect(lookAt({ x: 2, y: 5 })).toEqual({
      x: 2,
      y: 5,
      leanX: 0,
      leanY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      fade: 0,
      lift: 0,
      lookX: 0,
      lookY: 0,
      glow: 0,
      furIn: 1,
      raise: 0,
      wobble: 0,
    });
  });
});

describe("restingFace", () => {
  it.each<[string, Piece, string]>([
    [
      "a plain fuzzball",
      {
        what: "fuzzball",
        id: 1,
        kind: "red",
        special: null,
        caged: false,
        burred: false,
      },
      "rest",
    ],
    [
      "a burred fuzzball",
      {
        what: "fuzzball",
        id: 1,
        kind: "red",
        special: null,
        caged: false,
        burred: true,
      },
      "cross",
    ],
    ["the frizzball", { what: "frizzball", id: 1 }, "eep"],
    ["a sleepyhead", { what: "sleepyhead", id: 1 }, "sleepy"],
    ["a brick", { what: "brick", id: 1, layers: 2 }, "rest"],
  ])("rests %s's eyes in its face", (_, piece, face) => {
    expect(restingFace(piece)).toBe(face);
  });
});
