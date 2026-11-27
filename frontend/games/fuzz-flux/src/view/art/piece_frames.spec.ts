import { lookOffset, restingLook } from "@fz/style/fuzzball";
import type { Fuzzball, Piece } from "../../rules/catalog/pieces";
import { BURRED_SCALE } from "./elements/burr";
import { EYES_GRID, EYES_LOOK, eyesSeatOf } from "./eyes";
import { FRIZZBALL_EYES_SEAT } from "./frizzball";
import {
  behindFrameOf,
  bodyFrameOf,
  bodyScaleOf,
  eyesFrameOf,
  eyesSeatOn,
  eyesShiftOf,
  furOf,
  overFrameOf,
  standsOnEnd,
} from "./piece_frames";

/** A plain red fuzzball, caged and burred as a spec says. */
function fuzzball(change: Partial<Fuzzball> = {}): Fuzzball {
  return {
    what: "fuzzball",
    id: 1,
    kind: "red",
    special: null,
    caged: false,
    burred: false,
    ...change,
  };
}

const FRIZZBALL: Piece = { what: "frizzball", id: 2 };
const SLEEPYHEAD: Piece = { what: "sleepyhead", id: 3 };
const BRICK: Piece = { what: "brick", id: 4, layers: 3 };

describe("a piece's frames", () => {
  it("wears a special's second fur, or its own alone", () => {
    expect([
      furOf(fuzzball()),
      furOf(fuzzball({ special: "wisp" })),
      furOf(FRIZZBALL),
    ]).toEqual(["plain", "wisp", "plain"]);
  });

  it("draws a fuzzball's body in its kind, in a fur, as its fur stands", () => {
    expect(bodyFrameOf(fuzzball(), "puffer", "on-end")).toBe(
      "body-red-puffer-on-end",
    );
  });

  it("draws every other piece's body in a frame of its own", () => {
    expect(
      [FRIZZBALL, SLEEPYHEAD, BRICK].map((piece) =>
        bodyFrameOf(piece, "plain", "rest"),
      ),
    ).toEqual(["frizzball", "sleepyhead", "brick-3"]);
  });

  it("has a frame with its fur on end for a fuzzball alone", () => {
    expect([fuzzball(), FRIZZBALL, SLEEPYHEAD, BRICK].map(standsOnEnd)).toEqual(
      [true, false, false, false],
    );
  });

  it("draws the frizzball's eyes in its own frames, a fuzzball's in the house's, and a sleepyhead's and a brick's in none, the sleepyhead's shut in its body", () => {
    expect(
      [fuzzball(), FRIZZBALL, SLEEPYHEAD, BRICK].map((piece) =>
        eyesFrameOf(piece, "happy"),
      ),
    ).toEqual(["eyes-happy", "frizzball-eyes-happy", null, null]);
  });

  it("sits a fuzzball's eyes where its kind's body sits in a fur, and the frizzball's on its own", () => {
    expect([
      eyesSeatOn(fuzzball(), "wisp"),
      eyesSeatOn(FRIZZBALL, "plain"),
    ]).toEqual([eyesSeatOf("red", "wisp"), FRIZZBALL_EYES_SEAT]);
  });

  it("draws a burred fuzzball's body smaller, inside its ring, and any other piece's whole", () => {
    expect([
      bodyScaleOf(fuzzball({ burred: true })),
      bodyScaleOf(fuzzball({ caged: true })),
      bodyScaleOf(FRIZZBALL),
    ]).toEqual([BURRED_SCALE, 1, 1]);
  });

  it("sits a burred amber fuzzball's eyes, low on its body, as much nearer its square's middle and as much smaller as its body is drawn", () => {
    const plain = eyesSeatOf("amber", "plain");

    expect(
      eyesSeatOn(fuzzball({ kind: "amber", burred: true }), "plain"),
    ).toEqual({
      x: plain.x * BURRED_SCALE,
      y: plain.y * BURRED_SCALE,
      scale: plain.scale * BURRED_SCALE,
    });
  });

  it("seats a sleepyhead and a brick, which wear no eyes of a face, at the square's middle, at a fuzzball's size", () => {
    expect([
      eyesSeatOn(SLEEPYHEAD, "plain"),
      eyesSeatOn(BRICK, "plain"),
    ]).toEqual([
      { x: 0, y: 0, scale: 1 },
      { x: 0, y: 0, scale: 1 },
    ]);
  });

  it("shifts a piece's eyes the way it looks, by the house's look on the design's grid", () => {
    const offset = lookOffset({ x: -1, y: 0.5 }, EYES_LOOK);

    expect(eyesShiftOf(-1, 0.5, "happy")).toEqual({
      x: offset.x * EYES_GRID,
      y: offset.y * EYES_GRID,
    });
  });

  it("shifts the eyes of a piece looking nowhere as its face's own look has them", () => {
    const offset = lookOffset(restingLook("plead"), EYES_LOOK);

    expect(eyesShiftOf(0, 0, "plead")).toEqual({
      x: offset.x * EYES_GRID,
      y: offset.y * EYES_GRID,
    });
  });

  it("draws a burr behind a burred fuzzball, and a cage over a caged one", () => {
    expect([
      behindFrameOf(fuzzball({ burred: true })),
      overFrameOf(fuzzball({ caged: true })),
    ]).toEqual(["burr", "cage"]);
  });

  it("draws the frizzball's sparks behind it, and nothing over it", () => {
    expect([behindFrameOf(FRIZZBALL), overFrameOf(FRIZZBALL)]).toEqual([
      "frizzball-sparks",
      null,
    ]);
  });

  it("draws nothing behind or over a piece that wears neither", () => {
    expect([
      behindFrameOf(fuzzball()),
      overFrameOf(fuzzball()),
      behindFrameOf(BRICK),
      overFrameOf(SLEEPYHEAD),
    ]).toEqual([null, null, null, null]);
  });
});
