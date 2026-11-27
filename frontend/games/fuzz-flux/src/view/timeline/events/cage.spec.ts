import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { FRAMES } from "../../art/frame_names";
import { FEEL } from "../feel";
import type { HitOf } from "../hits";
import { cue, facing } from "../part";
import { frameFor, sampleAt } from "../sample";
import { standingOn } from "../standing";
import type { Sampled, Timeline } from "../timeline";
import { openedInBunch, uncaged } from "./cage";

/** When the specs' blast opens its cage. */
const OPENS_MS = 300;

/** When the cage's bits land, their flight over. */
const LANDS_MS = OPENS_MS + FEEL.cageBitMs;

/** How a move played by hand's first wave plays, in which a dasher's blast opens the cage of the red fuzzball, piece 2, in the middle of the top row. */
const PLAY = firstWaveOf(MOVE_FIXTURES.cageOpened);

/** The dasher's hit on the caged fuzzball. */
const OPENED: HitOf<"uncaged"> = {
  what: "uncaged",
  square: 1,
  step: 1,
  blast: 0,
  piece: 2,
};

/** The parts of the cage the blast opens. */
const PARTS = uncaged(OPENED, OPENS_MS, PLAY);

/** The timeline the board plays with them. */
const TIMELINE = timelineOfParts(PLAY.grid, PARTS);

/** Returns how each of a timeline's loose sprites looks at a moment. */
function spritesAt(timeline: Timeline, ms: number): readonly Sampled[] {
  return sampleAt(timeline, FEEL, ms, frameFor(timeline)).sprites;
}

/** Returns how far below the cage's middle each bar is drawn a time into its flight, its lean and all. */
function downsAt(sinceMs: number): readonly number[] {
  return spritesAt(TIMELINE, OPENS_MS + sinceMs).map(
    ({ y, leanY }) => y + leanY,
  );
}

/** Returns where a bar thrown up at a speed is, below where it set out, a time into its flight as a hard bit falls. */
function thrownAt(rise: number, sinceMs: number): number {
  const seconds = sinceMs / 1000;
  return -rise * seconds + (FEEL.thrownGravity * seconds ** 2) / 2;
}

/** Returns how fast each bar was thrown up, worked back from where it is a time into its flight as a hard bit falls. */
function risesOf(sinceMs: number): readonly number[] {
  return downsAt(sinceMs).map(
    (down) => (thrownAt(0, sinceMs) - down) / (sinceMs / 1000),
  );
}

describe("uncaged", () => {
  it("opens the cage as the hit lands, to its sound, and has the fuzzball yip a moment later", () => {
    expect(TIMELINE.sounds.map(({ atMs, sound }) => [atMs, sound])).toEqual([
      [OPENS_MS, "cage"],
      [OPENS_MS + FEEL.yipAfterMs, "yip"],
    ]);
  });

  it("counts the cage for the cages' goal as it opens", () => {
    expect(PARTS).toContainEqual({
      what: "counted",
      atMs: OPENS_MS,
      counts: { what: "cage" },
    });
  });

  it("draws the fuzzball out of its cage from then on", () => {
    expect([
      pieceAt(TIMELINE, 2, OPENS_MS - 1).drawn,
      pieceAt(TIMELINE, 2, OPENS_MS).drawn,
    ]).toMatchObject([{ caged: true }, { caged: false }]);
  });

  it("has the fuzzball stretch up happy, narrower and taller, then spring back", () => {
    expect([
      pieceAt(TIMELINE, 2, OPENS_MS + FEEL.freedUpMs),
      pieceAt(TIMELINE, 2, OPENS_MS + FEEL.freedUpMs + FEEL.freedDownMs),
    ]).toMatchObject([
      { face: "happy", scaleX: FEEL.freedNarrow, scaleY: FEEL.freedStretch },
      { scaleX: 1, scaleY: 1 },
    ]);
  });

  it("rests the fuzzball's eyes as a free one's once it has looked happy a while", () => {
    expect([
      pieceAt(TIMELINE, 2, OPENS_MS + FEEL.freedHappyMs - 1).face,
      pieceAt(TIMELINE, 2, OPENS_MS + FEEL.freedHappyMs).face,
    ]).toEqual(["happy", "rest"]);
  });

  it("leaves a face the fuzzball takes meanwhile, as another blast's look, rather than resting its eyes", () => {
    const timeline = timelineOfParts(PLAY.grid, [
      ...PARTS,
      facing(2, OPENS_MS + FEEL.freedUpMs, "eep"),
    ]);

    expect(pieceAt(timeline, 2, OPENS_MS + FEEL.freedHappyMs).face).toBe("eep");
  });

  it("bursts the cage into its bars, set out across its square, upright, as long as they fly", () => {
    expect({
      tracks: TIMELINE.sprites.map(({ drawn, fromMs, untilMs }) => ({
        drawn,
        fromMs,
        untilMs,
      })),
      setOut: spritesAt(TIMELINE, OPENS_MS).map(({ x, y, rotation }) => ({
        x,
        y,
        rotation,
      })),
    }).toEqual({
      tracks: Array.from({ length: FEEL.cageBits }, () => ({
        drawn: { what: "frame", frame: FRAMES.cageBar },
        fromMs: OPENS_MS,
        untilMs: LANDS_MS,
      })),
      setOut: [-2, -1, 0, 1, 2].map((out) => ({
        x: 1 + out * FEEL.cageBitGapSquares,
        y: 0,
        rotation: 0,
      })),
    });
  });

  it("flies each bar aside and spins it, faster the farther out it sets out", () => {
    const seconds = FEEL.cageBitMs / 1000 - 0.001;

    expect(
      spritesAt(TIMELINE, LANDS_MS - 1).map(({ x, rotation }) => ({
        x: x.toFixed(9),
        rotation: rotation.toFixed(9),
      })),
    ).toEqual(
      [-2, -1, 0, 1, 2].map((out) => ({
        x: (
          1 +
          out * (FEEL.cageBitGapSquares + FEEL.cageBitAside * seconds)
        ).toFixed(9),
        rotation: (out * FEEL.cageBitSpin * seconds).toFixed(9),
      })),
    );
  });

  it("throws each bar up at the feel's rise or faster, by a share of its spread, each its own", () => {
    const rises = risesOf(FEEL.cageBitMs / 2);

    expect({
      within: rises.every(
        (rise) =>
          rise > FEEL.cageBitRise - 1e-9 &&
          rise < FEEL.cageBitRise + FEEL.cageBitRiseSpread,
      ),
      apart: new Set(rises).size,
    }).toEqual({ within: true, apart: FEEL.cageBits });
  });

  it("flies each bar as a thrown bit flies, slowing as it rises under a hard bit's fall and falling faster after", () => {
    const rises = risesOf(FEEL.cageBitMs / 2);
    const moments = [0.25, 0.75, 0.99].map((share) => share * FEEL.cageBitMs);

    expect(
      moments.map((sinceMs) => downsAt(sinceMs).map((down) => down.toFixed(9))),
    ).toEqual(
      moments.map((sinceMs) =>
        rises.map((rise) => thrownAt(rise, sinceMs).toFixed(9)),
      ),
    );
  });

  it("fades each bar only toward its landing, as a loose bit fades", () => {
    const fadeMs = FEEL.cageBitMs / FEEL.looseBitFade;

    expect(
      [LANDS_MS - fadeMs, LANDS_MS - fadeMs / 2].map((ms) =>
        spritesAt(TIMELINE, ms).map(({ fade }) => fade),
      ),
    ).toEqual([
      Array.from({ length: FEEL.cageBits }, () => 0),
      Array.from({ length: FEEL.cageBits }, () => 0.5),
    ]);
  });

  it("plays it all with Less motion as well", () => {
    expect(uncaged(OPENED, OPENS_MS, { ...PLAY, motion: "less" })).toEqual(
      PARTS,
    );
  });

  it("throws a RangeError for a hit on a square with no caged fuzzball", () => {
    expect(() => uncaged({ ...OPENED, square: 0 }, OPENS_MS, PLAY)).toThrow(
      RangeError,
    );
  });
});

describe("openedInBunch", () => {
  const play = firstWaveOf(MOVE_FIXTURES.cageBunched);

  it("opens the cage of a fuzzball a bunch takes in a moment before it leaves, as a blast does", () => {
    const opensMs = 500 - FEEL.hopShedLeadMs;

    expect(openedInBunch(standingOn(play.grid, 1), 500, FEEL)).toMatchObject([
      cue("cage", opensMs),
      {
        what: "becomes",
        piece: 2,
        atMs: opensMs,
        drawn: { id: 2, caged: false },
      },
      { what: "counted", atMs: opensMs, counts: { what: "cage" } },
      ...Array.from({ length: FEEL.cageBits }, () => ({
        what: "sprite",
        sprite: { fromMs: opensMs },
      })),
    ]);
  });

  it("opens none for a fuzzball with no cage", () => {
    expect(openedInBunch(standingOn(play.grid, 0), 500, FEEL)).toEqual([]);
  });
});
