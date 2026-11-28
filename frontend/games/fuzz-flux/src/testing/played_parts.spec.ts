import { lookAt } from "../view/timeline/looks";
import type {
  PieceTrack,
  SpriteTrack,
  Timeline,
} from "../view/timeline/timeline";
import { pieceAt, spriteAt } from "./played_parts";

/** Returns a red fuzzball's track, standing on the board's second square from the tap. */
function redTrack(id: number): PieceTrack {
  return {
    id,
    fromMs: 0,
    untilMs: null,
    drawn: {
      what: "fuzzball",
      id,
      kind: "red",
      special: null,
      caged: false,
      burred: false,
    },
    look: lookAt({ x: 1, y: 0 }),
    face: "rest",
    keys: {},
    becomes: [],
    faces: [],
  };
}

/** Piece 4's track, sliding a square right over its first 100 ms and gone at 150. */
const SLIDING: PieceTrack = {
  ...redTrack(4),
  untilMs: 150,
  keys: { x: [{ atMs: 0, ms: 100, to: 2, easing: "linear" }] },
};

/** Returns a timeline of some tracks, at rest at once. */
function timelineOf(parts: Partial<Timeline>): Timeline {
  return {
    pieces: [],
    sprites: [],
    effects: [],
    flights: [],
    counts: [],
    dust: [],
    marks: [],
    sounds: [],
    dim: [],
    restMs: 0,
    end: null,
    ...parts,
  };
}

/** Returns a cage's bar flying loose, from 0 until 200 ms, raised as far as given. */
function barRaised(raise: number): SpriteTrack {
  return {
    drawn: { what: "frame", frame: "cage-bar" },
    fromMs: 0,
    untilMs: 200,
    look: { ...lookAt({ x: 0, y: 0 }), raise },
    keys: { y: [{ atMs: 0, ms: 100, to: 3, easing: "linear" }] },
  };
}

describe("pieceAt", () => {
  it("reads a piece of a timeline by its id, at a moment it shows", () => {
    const timeline = timelineOf({ pieces: [redTrack(3), SLIDING] });

    expect(pieceAt(timeline, 4, 50)).toMatchObject({
      x: 1.5,
      shown: true,
    });
  });

  it("reads where a piece gone came to", () => {
    const timeline = timelineOf({ pieces: [SLIDING] });

    expect(pieceAt(timeline, 4, 200)).toMatchObject({ x: 2, shown: false });
  });

  it("throws for a piece the timeline has no track for", () => {
    const timeline = timelineOf({ pieces: [SLIDING] });

    expect(() => pieceAt(timeline, 5, 0)).toThrow(
      "The timeline has no track for piece 5.",
    );
  });
});

describe("spriteAt", () => {
  it("reads a timeline's first loose sprite, or the one at the place given", () => {
    const timeline = timelineOf({ sprites: [barRaised(1), barRaised(2)] });

    expect([
      spriteAt(timeline, 50).raise,
      spriteAt(timeline, 50, 1).raise,
    ]).toEqual([1, 2]);
  });

  it("reads where a loose sprite gone came to", () => {
    const timeline = timelineOf({ sprites: [barRaised(1)] });

    expect(spriteAt(timeline, 300)).toMatchObject({ y: 3, shown: false });
  });

  it("throws for a place the timeline has no loose sprite at", () => {
    const timeline = timelineOf({ sprites: [barRaised(1)] });

    expect(() => spriteAt(timeline, 0, 1)).toThrow(
      "The timeline has no loose sprite at 1.",
    );
  });
});
