import type { FuzzballFace } from "@fz/style/fuzzball";
import type { Piece } from "../../rules/catalog/pieces";
import { FEEL, type FeelTuning } from "../timeline/feel";
import { lookAt } from "../timeline/looks";
import type { Sampled } from "../timeline/timeline";
import { blinkAt } from "./blinks";

/** How long the specs watch a fuzzball for, a minute and more of the board's time. */
const WATCH_MS = 90_000;

/** Returns a plain red fuzzball. */
function fuzzball(id: number): Piece {
  return {
    what: "fuzzball",
    id,
    kind: "red",
    special: null,
    caged: false,
    burred: false,
  };
}

/** Returns a record of a piece sampled at its square, its eyes in a face. */
function sampled(drawn: Piece | null, face: FuzzballFace): Sampled {
  return { ...lookAt({ x: 0, y: 0 }), shown: true, face, drawn };
}

/** Returns the face a piece's eyes show at a moment, from a face at rest. */
function faceAt(piece: Piece, ms: number, feel = FEEL): FuzzballFace {
  return blinkAt(feel, ms, sampled(piece, "rest")).face;
}

/** Returns each moment, to the millisecond, a fuzzball's eyes shut in a blink while it is watched. */
function blinksOf(piece: Piece, feel = FEEL): readonly number[] {
  const starts: number[] = [];
  for (let ms = 0; ms < WATCH_MS; ms++) {
    if (
      faceAt(piece, ms, feel) === "blink" &&
      faceAt(piece, ms - 1, feel) === "rest"
    ) {
      starts.push(ms);
    }
  }
  return starts;
}

/** Returns the face a piece's eyes show at each moment of a blink of the feel's length from a moment. */
function facesThrough(
  piece: Piece,
  fromMs: number,
  feel: FeelTuning,
): readonly FuzzballFace[] {
  return Array.from({ length: feel.blinkMs }, (_, ms) =>
    faceAt(piece, fromMs + ms, feel),
  );
}

/** Returns the time between each two blinks in turn, of each of some fuzzballs. */
function gapsOf(pieces: readonly Piece[]): readonly number[] {
  return pieces.flatMap((piece) => {
    const starts = blinksOf(piece);
    return starts.slice(1).map((ms, index) => ms - (starts[index] ?? 0));
  });
}

describe("blinkAt", () => {
  const gaps = gapsOf([1, 2, 3, 40, 41].map(fuzzball));

  it("blinks a fuzzball again from the feel's least to its most time after its last blink", () => {
    expect({
      least: Math.min(...gaps) > FEEL.blinkLeastMs,
      most: Math.max(...gaps) < FEEL.blinkMostMs,
    }).toEqual({ least: true, most: true });
  });

  it("spreads its blinks over that time, some sooner than a second over the least and some later than a second under the most", () => {
    expect({
      soon: gaps.some((gap) => gap < FEEL.blinkLeastMs + 1000),
      late: gaps.some((gap) => gap > FEEL.blinkMostMs - 1000),
    }).toEqual({ soon: true, late: true });
  });

  it("keeps a fuzzball's eyes shut for the feel's blink", () => {
    const [start = 0] = blinksOf(fuzzball(1));

    expect([
      faceAt(fuzzball(1), start + FEEL.blinkMs - 1),
      faceAt(fuzzball(1), start + FEEL.blinkMs),
    ]).toEqual(["blink", "rest"]);
  });

  it("keeps a blink shut past the start of the fuzzball's next stretch of time, where its blinks lie closer than a blink lasts", () => {
    const close: FeelTuning = { ...FEEL, blinkLeastMs: 50, blinkMostMs: 150 };
    const [start = 0] = blinksOf(fuzzball(1), close);

    expect(new Set(facesThrough(fuzzball(1), start, close))).toEqual(
      new Set(["blink"]),
    );
  });

  it("blinks two fuzzballs at moments of their own", () => {
    expect(blinksOf(fuzzball(1))).not.toEqual(blinksOf(fuzzball(2)));
  });

  it("blinks a fuzzball alike at a moment, whatever moments were sampled before", () => {
    const [start = 0] = blinksOf(fuzzball(7));

    expect(faceAt(fuzzball(7), start)).toBe("blink");
  });

  it("writes into the record it is given, and returns it", () => {
    const record = sampled(fuzzball(1), "rest");

    expect(blinkAt(FEEL, 0, record)).toBe(record);
  });

  it.each<[string, Piece, FuzzballFace]>([
    ["a happy fuzzball's", fuzzball(1), "happy"],
    ["a wide-eyed fuzzball's", fuzzball(1), "eep"],
    ["the frizzball's", { what: "frizzball", id: 1 }, "eep"],
    ["the frizzball's, even at rest", { what: "frizzball", id: 1 }, "rest"],
    ["a sleepyhead's", { what: "sleepyhead", id: 1 }, "sleepy"],
    ["a brick's", { what: "brick", id: 1, layers: 2 }, "rest"],
  ])("leaves %s face as it is", (_, piece, face) => {
    const [start = 0] = blinksOf(fuzzball(1));

    expect(blinkAt(FEEL, start, sampled(piece, face)).face).toBe(face);
  });

  it("leaves a loose sprite's record as it is", () => {
    expect(blinkAt(FEEL, 0, sampled(null, "rest")).face).toBe("rest");
  });
});
