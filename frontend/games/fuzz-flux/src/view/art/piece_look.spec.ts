import type { Fuzzball, Piece } from "../../rules/catalog/pieces";
import { lookAt } from "../timeline/looks";
import type { Sampled } from "../timeline/timeline";
import { BURRED_SCALE } from "./elements/burr";
import { eyesSeatOf } from "./eyes";
import { FRAMES } from "./frame_names";
import { eyesShiftOf } from "./piece_frames";
import { DIM_DEPTH, type ImageLook, PieceLook, opacityOf } from "./piece_look";

/** Returns a plain red fuzzball, but as a spec changes it. */
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

/** A wisp, whose second fur sits its eyes apart from the plain fuzzball's. */
const WISP = fuzzball({ special: "wisp" });

/** Returns a piece's sampled record, as a resting one's but as a spec changes it. */
function sampled(change: Partial<Sampled> = {}): Sampled {
  return {
    ...lookAt({ x: 1, y: 1 }),
    shown: true,
    face: "rest",
    drawn: null,
    ...change,
  };
}

/** Returns how a piece is drawn as it is sampled. */
function lookOf(piece: Piece, change: Partial<Sampled> = {}): PieceLook {
  return new PieceLook().of(sampled(change), piece);
}

/** Returns how a piece's body and the body over it show. */
function bodiesOf(look: PieceLook): readonly ImageLook[] {
  return [{ ...look.body }, { ...look.second }];
}

describe("PieceLook", () => {
  it("shows a fuzzball's body in its fur at rest, as opaque as it is unfaded", () => {
    expect(bodiesOf(lookOf(fuzzball(), { fade: 0.25 }))).toEqual([
      { frame: FRAMES.body("red", "plain", "rest"), alpha: 0.75 },
      { frame: FRAMES.body("red", "plain", "on-end"), alpha: 0 },
    ]);
  });

  it("fades its fur standing on end in over its body at rest", () => {
    expect(bodiesOf(lookOf(fuzzball(), { lift: 0.25 }))).toEqual([
      { frame: FRAMES.body("red", "plain", "rest"), alpha: 1 },
      { frame: FRAMES.body("red", "plain", "on-end"), alpha: 0.25 },
    ]);
  });

  it("fades a special's second fur in over its plain body, which stays opaque under it", () => {
    expect(bodiesOf(lookOf(WISP, { furIn: 0.25 }))).toEqual([
      { frame: FRAMES.body("red", "plain", "rest"), alpha: 1 },
      { frame: FRAMES.body("red", "wisp", "rest"), alpha: 0.25 },
    ]);
  });

  it("grows a special's fur in with its fur on end, once it stands past halfway", () => {
    expect(
      bodiesOf(lookOf(WISP, { furIn: 0.25, lift: 0.5 })).map(
        ({ frame }) => frame,
      ),
    ).toEqual([
      FRAMES.body("red", "plain", "on-end"),
      FRAMES.body("red", "wisp", "on-end"),
    ]);
  });

  it("shows a piece with no frame on end in its one frame, however its fur stands", () => {
    const look = lookOf({ what: "frizzball", id: 1 }, { lift: 1 });

    expect([look.body, look.second.alpha]).toEqual([
      { frame: FRAMES.frizzball, alpha: 1 },
      0,
    ]);
  });

  it("shows what a piece wears behind it and over it, as opaque as its body", () => {
    const look = lookOf(fuzzball({ caged: true, burred: true }), {
      fade: 0.5,
    });

    expect([{ ...look.behind }, { ...look.over }]).toEqual([
      { frame: FRAMES.burr, alpha: 0.5 },
      { frame: FRAMES.cage, alpha: 0.5 },
    ]);
  });

  it("draws a burred fuzzball's body smaller, and the same piece's whole once its burr is off", () => {
    const look = new PieceLook();

    const burred = look.of(sampled(), fuzzball({ burred: true })).bodyScale;
    const bare = look.of(sampled(), fuzzball()).bodyScale;

    expect([burred, bare]).toEqual([BURRED_SCALE, 1]);
  });

  it("shows nothing behind or over a piece that wears neither", () => {
    const look = lookOf(fuzzball());

    expect([{ ...look.behind }, { ...look.over }]).toEqual([
      { frame: null, alpha: 0 },
      { frame: null, alpha: 0 },
    ]);
  });

  it("shows the eyes in the face sampled: the frizzball's in its own frames, and a brick's in none", () => {
    const pieces: readonly Piece[] = [
      fuzzball(),
      { what: "frizzball", id: 2 },
      { what: "brick", id: 3, layers: 2 },
    ];

    expect(
      pieces.map((piece) => lookOf(piece, { face: "happy" }).eyes.frame),
    ).toEqual([FRAMES.eyes("happy"), FRAMES.frizzballEyes("happy"), null]);
  });

  it("sits a fuzzball's eyes where its fur's body has them, shifted as it looks, at their seat's size", () => {
    const seat = eyesSeatOf("red", "wisp");
    const shift = eyesShiftOf(1, 0, "rest");

    const look = lookOf(WISP, { lookX: 1 });

    expect([look.eyesX, look.eyesY, look.eyesScale]).toEqual([
      expect.closeTo(seat.x + shift.x * seat.scale, 9),
      expect.closeTo(seat.y + shift.y * seat.scale, 9),
      seat.scale,
    ]);
  });

  it("moves a fuzzball's eyes from where its plain body has them to where its special's has them as its second fur grows in", () => {
    const plain = lookOf(WISP, { furIn: 0 });
    const grown = lookOf(WISP, { furIn: 1 });

    const half = lookOf(WISP, { furIn: 0.5 });

    expect([half.eyesX, half.eyesY, half.eyesScale]).toEqual([
      expect.closeTo((plain.eyesX + grown.eyesX) / 2, 9),
      expect.closeTo((plain.eyesY + grown.eyesY) / 2, 9),
      expect.closeTo((plain.eyesScale + grown.eyesScale) / 2, 9),
    ]);
  });

  it("stretches and turns where the eyes sit with the body", () => {
    const upright = lookOf(WISP);

    const turned = lookOf(WISP, { scaleX: 2, rotation: Math.PI / 2 });

    expect([turned.eyesX, turned.eyesY]).toEqual([
      expect.closeTo(-upright.eyesY, 9),
      expect.closeTo(2 * upright.eyesX, 9),
    ]);
  });

  it("works the eyes' shift out again as the piece looks another way", () => {
    const look = new PieceLook();
    look.of(sampled({ lookX: 1 }), WISP);

    const across = look.of(sampled({ lookX: -1 }), WISP).eyesX;

    expect(across).toBeCloseTo(lookOf(WISP, { lookX: -1 }).eyesX, 9);
  });

  it("lights a glowing piece's body over all the rest, as opaque as it glows and is unfaded, at most a little under wholly", () => {
    const look = lookOf(fuzzball(), { glow: 0.5, fade: 0.5 });

    expect({ ...look.glow }).toEqual({
      frame: FRAMES.body("red", "plain", "rest"),
      alpha: 0.5 * 0.5 * 0.85,
    });
  });

  it("lights no piece that glows none", () => {
    expect(lookOf(fuzzball()).glow.alpha).toBe(0);
  });

  it("draws the board's dimming over a piece neither raised nor with its fur on end past halfway, wherever it stands", () => {
    expect([
      lookOf(fuzzball(), { y: 9 }).depth,
      lookOf(fuzzball(), { y: 9, lift: 0.25 }).depth,
    ]).toEqual([
      expect.toSatisfy((depth: number) => depth < DIM_DEPTH),
      expect.toSatisfy((depth: number) => depth < DIM_DEPTH),
    ]);
  });

  it("draws a piece raised, or with its fur on end past halfway, over the board's dimming, wherever it stands", () => {
    expect([
      lookOf(fuzzball(), { y: -9, raise: 1 }).depth,
      lookOf(fuzzball(), { y: -9, lift: 0.5 }).depth,
    ]).toEqual([
      expect.toSatisfy((depth: number) => depth > DIM_DEPTH),
      expect.toSatisfy((depth: number) => depth > DIM_DEPTH),
    ]);
  });

  it("draws a piece with its fur on end under one raised", () => {
    expect(lookOf(fuzzball(), { y: 9, lift: 1 }).depth).toBeLessThan(
      lookOf(fuzzball(), { y: -9, raise: 1 }).depth,
    );
  });

  it("draws the lower of two pieces raised as far over the other", () => {
    expect(lookOf(fuzzball(), { y: 2 }).depth).toBeGreaterThan(
      lookOf(fuzzball(), { y: 1 }).depth,
    );
  });

  it("draws a piece under one raised a level more, from wherever on the board, or above it, either stands", () => {
    expect(lookOf(fuzzball(), { y: 9 }).depth).toBeLessThan(
      lookOf(fuzzball(), { y: -9, raise: 1 }).depth,
    );
  });
});

describe("opacityOf", () => {
  it("shows a sprite as opaque as it is unfaded, from wholly to not at all", () => {
    expect([-0.5, 0, 0.25, 1, 1.5].map(opacityOf)).toEqual([1, 1, 0.75, 0, 0]);
  });
});
