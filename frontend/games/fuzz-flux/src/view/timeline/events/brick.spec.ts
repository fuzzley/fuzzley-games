import type { BrickLayers } from "../../../rules/catalog/elements";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  spriteAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import {
  LAST_BUTTON,
  PILE_FLOOR,
  cushionHeight,
  heightUnderTop,
  topCushionOf,
} from "../../art/elements/brick";
import { FRAMES } from "../../art/frame_names";
import { FEEL } from "../feel";
import type { HitOf } from "../hits";
import { lookAt } from "../looks";
import type { Sampled, Timeline } from "../timeline";
import type { WavePlay } from "../wave_play";
import { broken, knocked } from "./brick";

/** When the hit lands, at a moment of the specs' own. */
const LANDS_MS = 300;

/** When a brick's last cushion bursts, once it has swelled. */
const BURST_MS = LANDS_MS + FEEL.lastLayerMs;

/** Where the brick, piece 2, stands: square 1 of its 3 by 3 board. */
const AT = { x: 1, y: 0 };

/** Where the top cushion of the brick of 2 layers lies, which the knock throws off. */
const TOP = { x: AT.x + topCushionOf(2).x, y: AT.y + topCushionOf(2).y };

/** Returns a knock on the brick of 2 layers beside a bunch, as though it left it some. */
function knockLeaving(layersLeft: BrickLayers): HitOf<"knocked"> {
  return {
    what: "knocked",
    square: 1,
    step: 1,
    blast: null,
    piece: 2,
    layersLeft,
  };
}

/** The knock that leaves the brick of 2 layers 1. */
const KNOCK = knockLeaving(1);

/** The hit that bursts the brick of 1 layer. */
const BREAK: HitOf<"broken"> = {
  what: "broken",
  square: 1,
  step: 1,
  blast: null,
  piece: 2,
};

/** Returns how the first wave of a knock on the brick of 2 layers plays, in some motion. */
function knockPlay(motion: WavePlay["motion"] = "full"): WavePlay {
  return { ...firstWaveOf(MOVE_FIXTURES.rollAndRefill), motion };
}

/** Returns how the first wave of a hit on the brick of 1 layer plays, in some motion. */
function breakPlay(motion: WavePlay["motion"] = "full"): WavePlay {
  return { ...firstWaveOf(MOVE_FIXTURES.brickBroken), motion };
}

/** Returns the timeline of a knock on the brick of 2 layers, in some motion. */
function knockTimeline(
  hit: HitOf<"knocked"> = KNOCK,
  motion: WavePlay["motion"] = "full",
): Timeline {
  const play = knockPlay(motion);
  return timelineOfParts(play.grid, knocked(hit, LANDS_MS, play));
}

/** Returns the timeline of the burst of the brick of 1 layer, in some motion. */
function breakTimeline(motion: WavePlay["motion"] = "full"): Timeline {
  const play = breakPlay(motion);
  return timelineOfParts(play.grid, broken(BREAK, LANDS_MS, play));
}

/** Returns what matches a number as near a value as rounding leaves it. */
function near(value: number): unknown {
  return expect.closeTo(value);
}

/** Returns how far down a sprite is drawn, in squares: its place and its lean down. */
function downOf(sprite: Sampled): number {
  return sprite.y + sprite.leanY;
}

describe("knocked", () => {
  it.each([
    [3, "knock-3"],
    [2, "knock-2"],
    [1, "knock-1"],
  ] as const)(
    "knocks a layer off with a note a step higher the fewer it leaves: %i left, %s",
    (left, sound) => {
      expect(knockTimeline(knockLeaving(left)).sounds).toEqual([
        { atMs: LANDS_MS, sound, cents: 0, volume: 1 },
      ]);
    },
  );

  it("draws the brick with the layers it has left as the hit lands", () => {
    expect(pieceAt(knockTimeline(), 2, LANDS_MS).drawn).toEqual({
      what: "brick",
      id: 2,
      layers: 1,
    });
  });

  it("ducks the cushions left onto the square's floor, under the height they filled, a little wider, wobbling", () => {
    const height = FEEL.pileDuck * heightUnderTop(2);

    expect(pieceAt(knockTimeline(), 2, LANDS_MS)).toMatchObject({
      scaleX: FEEL.pileSpread,
      scaleY: near(height),
      y: near(AT.y + PILE_FLOOR * (1 - height)),
      wobble: FEEL.pileWobble,
    });
  });

  it("springs them up to fill the square again", () => {
    expect(pieceAt(knockTimeline(), 2, LANDS_MS + FEEL.pileMs)).toMatchObject({
      scaleX: near(1),
      scaleY: near(1),
      y: near(AT.y),
      wobble: 0,
    });
  });

  it("tumbles the top cushion off from where the pile drew it, while it tumbles", () => {
    expect(knockTimeline().sprites).toMatchObject([
      {
        drawn: { what: "frame", frame: FRAMES.cushion(2) },
        fromMs: LANDS_MS,
        untilMs: LANDS_MS + FEEL.cushionMs,
        look: lookAt(TOP),
      },
    ]);
  });

  it("knocks it up and off to the left, the way the brick's even id gives, turning, and lets it fall", () => {
    const timeline = knockTimeline();
    const topMs = (1000 * FEEL.cushionRiseSpeed) / FEEL.thrownGravity;
    const top = spriteAt(timeline, LANDS_MS + topMs);
    const end = spriteAt(timeline, LANDS_MS + FEEL.cushionMs);

    expect({
      left: end.x < TOP.x,
      up: downOf(top) < TOP.y,
      falls: downOf(end) > downOf(top),
      turned: end.rotation < 0,
    }).toEqual({ left: true, up: true, falls: true, turned: true });
  });

  it("throws it up at the feel's speed, the feel's gravity slowing it", () => {
    const seconds = FEEL.cushionRiseSpeed / FEEL.thrownGravity / 2;

    expect(
      downOf(spriteAt(knockTimeline(), LANDS_MS + seconds * 1000)),
    ).toBeCloseTo(
      TOP.y -
        FEEL.cushionRiseSpeed * seconds +
        (FEEL.thrownGravity * seconds ** 2) / 2,
    );
  });

  it("plumps a thin cushion up out from under the pile's weight by the feel's share, for its width", () => {
    const plumped = spriteAt(
      knockTimeline(knockLeaving(3)),
      LANDS_MS + FEEL.cushionPlumpMs,
    );

    expect(plumped.scaleY / plumped.scaleX).toBeCloseTo(FEEL.cushionPlump);
  });

  it("plumps a fat one up no taller than the feel's most", () => {
    const plumped = spriteAt(knockTimeline(), LANDS_MS + FEEL.cushionPlumpMs);

    expect((plumped.scaleY / plumped.scaleX) * cushionHeight(2)).toBeCloseTo(
      FEEL.cushionMostHeight,
    );
  });

  it("shrinks it by the feel's share as it flies, fading it only toward its end", () => {
    const timeline = knockTimeline();

    expect([
      spriteAt(timeline, LANDS_MS + FEEL.cushionMs / 4).fade,
      spriteAt(timeline, LANDS_MS + FEEL.cushionMs),
    ]).toMatchObject([0, { scaleX: near(1 - FEEL.cushionShrink), fade: 1 }]);
  });

  it("throws tufts of its felt after it", () => {
    expect(knockTimeline().effects).toEqual([
      {
        what: "fluff",
        atMs: LANDS_MS,
        at: TOP,
        tuft: FRAMES.cushionTuft(2),
        count: FEEL.cushionTufts,
        power: FEEL.cushionTuftPower,
      },
    ]);
  });

  it("throws for a knock that leaves 4 layers, more than any knock leaves", () => {
    const play = knockPlay();

    expect(() => knocked(knockLeaving(4), LANDS_MS, play)).toThrow(RangeError);
  });

  describe("with Less motion", () => {
    it("fades the cushion where it lies", () => {
      const timeline = knockTimeline(KNOCK, "less");

      expect([
        timeline.sprites[0]?.untilMs,
        spriteAt(timeline, LANDS_MS + FEEL.lessMotionCushionMs),
      ]).toMatchObject([
        LANDS_MS + FEEL.lessMotionCushionMs,
        { ...lookAt(TOP), fade: 1 },
      ]);
    });

    it("takes the pile's new shape with no duck, no spread and no wobble", () => {
      const timeline = knockTimeline(KNOCK, "less");
      const under = heightUnderTop(2);

      expect([
        pieceAt(timeline, 2, LANDS_MS),
        pieceAt(timeline, 2, LANDS_MS + FEEL.lessMotionPileMs),
      ]).toMatchObject([
        {
          scaleX: 1,
          scaleY: near(under),
          y: near(AT.y + PILE_FLOOR * (1 - under)),
          wobble: 0,
        },
        { scaleY: near(1), y: near(AT.y) },
      ]);
    });
  });
});

describe("broken", () => {
  it("bursts with its own sound as the hit lands", () => {
    expect(breakTimeline().sounds).toEqual([
      { atMs: LANDS_MS, sound: "break", cents: 0, volume: 1 },
    ]);
  });

  it("swells the last cushion, then takes it off as it bursts", () => {
    const timeline = breakTimeline();

    expect([
      pieceAt(timeline, 2, BURST_MS),
      timeline.pieces.find(({ id }) => id === 2)?.untilMs,
    ]).toMatchObject([
      { scaleX: FEEL.lastLayerScale, scaleY: FEEL.lastLayerScale },
      BURST_MS,
    ]);
  });

  it("bursts it into tufts of its felt and a thin white ring", () => {
    expect(breakTimeline().effects).toEqual([
      {
        what: "fluff",
        atMs: BURST_MS,
        at: AT,
        tuft: FRAMES.cushionTuft(1),
        count: FEEL.lastLayerTufts,
        power: FEEL.lastLayerTuftPower,
      },
      {
        what: "ring",
        atMs: BURST_MS,
        ms: FEEL.ringMs,
        at: AT,
        radius: FEEL.lastLayerRingSquares,
        ink: "white",
      },
    ]);
  });

  it("throws its button up from where the cushion drew it as it bursts", () => {
    expect(breakTimeline().sprites).toMatchObject([
      {
        drawn: { what: "frame", frame: FRAMES.button },
        fromMs: BURST_MS,
        untilMs: BURST_MS + FEEL.buttonMs,
        look: lookAt({ x: AT.x + LAST_BUTTON.x, y: AT.y + LAST_BUTTON.y }),
      },
    ]);
  });

  it("throws the button up and off to the left, and lets it fall, fading", () => {
    const timeline = breakTimeline();
    const from = AT.y + LAST_BUTTON.y;
    const topMs = (1000 * FEEL.buttonRiseSpeed) / FEEL.thrownGravity;
    const top = spriteAt(timeline, BURST_MS + topMs);
    const end = spriteAt(timeline, BURST_MS + FEEL.buttonMs);

    expect({
      left: end.x < AT.x,
      up: downOf(top) < from,
      falls: downOf(end) > downOf(top),
      faded: end.fade,
    }).toEqual({ left: true, up: true, falls: true, faded: 1 });
  });

  it("counts it for the bricks' goal as it bursts", () => {
    const play = breakPlay();

    expect(broken(BREAK, LANDS_MS, play)).toContainEqual({
      what: "counted",
      atMs: BURST_MS,
      counts: { what: "brick" },
    });
  });

  it("bursts it with no swell with Less motion", () => {
    const timeline = breakTimeline("less");

    expect([
      pieceAt(timeline, 2, BURST_MS - 1),
      timeline.pieces.find(({ id }) => id === 2)?.untilMs,
    ]).toMatchObject([{ scaleX: 1, scaleY: 1 }, BURST_MS]);
  });
});
