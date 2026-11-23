import type { HostedScene } from "@fz/phaser/host";
import { type SceneRun, runBareScene } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { COLUMNS, MOST_DEPTH } from "../rules/field";
import { wallFrom } from "../rules/level_picture";
import type { Wall } from "../rules/wall";
import {
  LIGHT_MADE_UP,
  madeUpField,
  madeUpFrames,
} from "../testing/made_up/field";
import { MADE_UP_LEGEND, type MadeUpKind } from "../testing/made_up/wall";
import { toCanvas } from "../view/field_metrics";
import type { WallGuide } from "../view/guide";
import { MOST_BAKED_UNIT, WallAtlas } from "./atlas";
import {
  type CountClearance,
  type GuideArt,
  type GuideContext,
  GuidePainter,
  MOST_STRUCK,
} from "./guide";

/** The made-up frames of a guide that rings each turn. */
const RINGING: GuideArt = {
  dot: "guide-dot",
  mostDots: 40,
  struck: "struck",
  turns: { ring: "turn-ring", most: 4 },
};

/** The made-up frames of a guide that rings none. */
const UNRINGING: GuideArt = {
  dot: "guide-dot",
  mostDots: 40,
  struck: "struck",
};

/** A wall standing from field row 5, two rows deep. */
const STANDING = wallOf(["111111111", "111111111"], 5);

/** Returns a wall made up for the specs, from a picture, its lowest row in a field row. */
function wallOf(
  picture: readonly string[],
  lowestRow: number,
): Wall<MadeUpKind> {
  return wallFrom(picture, MADE_UP_LEGEND, { lowestRow });
}

/** Returns a guide of dots alone, each whole. */
function dotsAt(...places: readonly [number, number][]): WallGuide {
  return {
    dots: places.map(([x, y]) => ({ x, y })),
    turns: [],
    struck: [],
  };
}

/** Says no dot crowds a count, and how many times it was asked. */
class ClearCount implements CountClearance {
  asked = 0;

  crowdsCount(): boolean {
    this.asked++;
    return false;
  }
}

/** Describes a guide painted in a scene and the context it was drawn from. */
interface Painted {
  readonly run: SceneRun<HostedScene>;
  readonly painter: GuidePainter<MadeUpKind>;
  readonly layer: GameObjects.Layer;
  readonly atlas: WallAtlas<typeof LIGHT_MADE_UP>;
  readonly context: GuideContext<MadeUpKind>;
}

/**
 * Paints a guide over {@link STANDING} on a canvas of some CSS pixels, in a
 * scene running till the test finishes, as a game's art draws it, its
 * dots kept clear of the count as the clearance says.
 */
async function paintGuide(
  guide: WallGuide | null,
  {
    art = RINGING,
    clearance = new ClearCount(),
    width = 400,
    height = 400,
  }: {
    readonly art?: GuideArt;
    readonly clearance?: CountClearance;
    readonly width?: number;
    readonly height?: number;
  } = {},
): Promise<Painted> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  const { scene } = run;
  const { shape, metrics } = madeUpField(width, height);
  const atlas = new WallAtlas(scene, madeUpFrames, LIGHT_MADE_UP, metrics);
  const layer = scene.add.layer();
  const painter = new GuidePainter<MadeUpKind>(scene, layer, art, clearance);
  const context: GuideContext<MadeUpKind> = {
    view: { wall: STANDING, wallDrop: 1 },
    guide,
    shape,
    metrics,
    baked: atlas.scale,
    palette: atlas.palette,
    now: 0,
    motion: true,
  };
  painter.draw(context);
  return { run, painter, layer, atlas, context };
}

/** Returns the images of a set that show. */
function shown(images: readonly GameObjects.Image[]): GameObjects.Image[] {
  return images.filter((image) => image.visible);
}

/** Returns whether an image stands within half a device pixel of a place on the field, in a painted layout. */
function standsAt(
  painted: Painted,
  image: GameObjects.Image | undefined,
  x: number,
  y: number,
): boolean {
  const place = toCanvas(painted.context.metrics, x, y);
  return (
    image !== undefined &&
    Math.abs(image.x - place.x) <= 0.5 &&
    Math.abs(image.y - place.y) <= 0.5
  );
}

describe("GuidePainter", () => {
  describe("the dots", () => {
    it("draw a dot at each of the guide's places, within half a pixel of it, on whole pixels", async () => {
      const painted = await paintGuide(dotsAt([3.3, 2.2], [4.1, 3.7]));
      const dots = shown(painted.painter.dots);

      expect({
        frames: dots.map((dot) => dot.frame.name),
        placed: [
          standsAt(painted, dots[0], 3.3, 2.2),
          standsAt(painted, dots[1], 4.1, 3.7),
        ],
        whole: dots.every(
          (dot) =>
            Number.isInteger(dot.x - dot.displayWidth / 2) &&
            Number.isInteger(dot.y - dot.displayHeight / 2),
        ),
      }).toEqual({
        frames: [RINGING.dot, RINGING.dot],
        placed: [true, true],
        whole: true,
      });
    });

    it("show each dot as strongly as the guide says, and whole where it says nothing", async () => {
      const { painter } = await paintGuide({
        dots: [
          { x: 1, y: 1 },
          { x: 2, y: 2, alpha: 0.4 },
          { x: 3, y: 3 },
        ],
        turns: [],
        struck: [],
      });

      expect(shown(painter.dots).map((dot) => dot.alpha)).toEqual([1, 0.4, 1]);
    });

    it("leave out a dot that would crowd the jump line's count, as the count says", async () => {
      // A count, made up, that every dot right of the field's middle crowds.
      const middle = toCanvas(madeUpField(400, 400).metrics, 4.5, 0).x;
      const painted = await paintGuide(dotsAt([1, 9], [4, 9], [7, 9]), {
        clearance: {
          crowdsCount: (x) => x > middle,
        },
      });

      expect(
        painted.painter.dots.slice(0, 3).map((dot) => dot.visible),
      ).toEqual([true, true, false]);
    });

    it("show scaled up past the atlas's largest unit, a whole number of pixels wide", async () => {
      const painted = await paintGuide(dotsAt([3, 3]), {
        width: 1300,
        height: 1800,
      });
      const scale = painted.context.metrics.unit / MOST_BAKED_UNIT;
      const [dot] = painted.painter.dots;

      expect({ scaledUp: scale > 1, side: dot?.displayWidth }).toEqual({
        scaledUp: true,
        side: Math.round((dot?.width ?? 0) * scale),
      });
    });
  });

  describe("the rings", () => {
    it("ring each turn of the shot, where a game rings them", async () => {
      const painted = await paintGuide({
        dots: [],
        turns: [
          { x: 0.3, y: 4 },
          { x: 8.7, y: 7.5 },
        ],
        struck: [],
      });
      const rings = shown(painted.painter.rings);

      expect({
        frames: rings.map((ring) => ring.frame.name),
        placed: [
          standsAt(painted, rings[0], 0.3, 4),
          standsAt(painted, rings[1], 8.7, 7.5),
        ],
      }).toEqual({
        frames: [RINGING.turns?.ring, RINGING.turns?.ring],
        placed: [true, true],
      });
    });

    it("are none for a game that rings no turn, whatever turns the guide has", async () => {
      const { painter } = await paintGuide(
        { dots: [], turns: [{ x: 0.3, y: 4 }], struck: [] },
        { art: UNRINGING },
      );

      expect(painter.rings).toEqual([]);
    });
  });

  describe("the marks", () => {
    it("mark each brick the shot would strike, over its cell", async () => {
      const painted = await paintGuide({ dots: [], turns: [], struck: [8, 2] });
      const marks = shown(painted.painter.marks);

      expect({
        frames: marks.map((mark) => mark.frame.name),
        places: marks.map((mark) => ({ x: mark.x, y: mark.y })),
      }).toEqual({
        frames: [RINGING.struck, RINGING.struck],
        places: [
          toCanvas(painted.context.metrics, 8.5, 5.5),
          toCanvas(painted.context.metrics, 2.5, 5.5),
        ],
      });
    });

    it("mark no brick waiting over the ceiling", async () => {
      // Wall cell 9 stands in field row 6; on a field 6 deep, over its ceiling.
      const painted = await paintGuide(null);
      painted.context.shape = { ...painted.context.shape, depth: 6 };
      painted.context.guide = { dots: [], turns: [], struck: [0, 9] };

      painted.painter.draw(painted.context);

      expect(shown(painted.painter.marks)).toHaveLength(1);
    });

    it("show scaled up past the atlas's largest unit", async () => {
      const painted = await paintGuide(
        { dots: [], turns: [], struck: [8] },
        { width: 1300, height: 1800 },
      );
      const [mark] = painted.painter.marks;

      expect(mark?.scale).toBe(painted.context.metrics.unit / MOST_BAKED_UNIT);
    });
  });

  it("draws a shot's guide: its dots, fading past its last turn, a ring at each turn and a mark on each brick it strikes", async () => {
    // A shot off the left wall at 4 and the right at 7.5, its guide running
    // on 1.5 units past the last turn as its dots fade.
    const guide: WallGuide = {
      dots: [
        { x: 2, y: 3 },
        { x: 4.5, y: 6 },
        { x: 7.7, y: 8, alpha: 0.5 },
        { x: 7.4, y: 8.5, alpha: 0 },
      ],
      turns: [
        { x: 0.3, y: 4 },
        { x: 8.7, y: 7.5 },
      ],
      struck: [8],
    };

    const { painter } = await paintGuide(guide);

    expect({
      dots: painter.dots.slice(0, 5).map((dot) => [dot.visible, dot.alpha]),
      rings: shown(painter.rings).length,
      marks: shown(painter.marks).length,
    }).toEqual({
      dots: [
        [true, 1],
        [true, 1],
        [true, 0.5],
        [true, 0],
        [false, 1],
      ],
      rings: 2,
      marks: 1,
    });
  });

  it("draws the guide anew as the wall moves under the same guide", async () => {
    const painted = await paintGuide({ dots: [], turns: [], struck: [8] });

    painted.context.view = { wall: { ...STANDING, lowestRow: 4 }, wallDrop: 1 };
    painted.painter.draw(painted.context);

    const [mark] = painted.painter.marks;
    expect({ x: mark?.x, y: mark?.y }).toEqual(
      toCanvas(painted.context.metrics, 8.5, 4.5),
    );
  });

  it("moves the same guide with the field as it is laid out anew", async () => {
    const painted = await paintGuide(dotsAt([3.3, 2.2]));
    const { shape, metrics } = madeUpField(600, 500);
    painted.atlas.bakeFor(painted.context.palette, metrics);
    painted.context.shape = shape;
    painted.context.metrics = metrics;
    painted.context.baked = painted.atlas.scale;

    painted.painter.draw(painted.context);

    expect(standsAt(painted, painted.painter.dots[0], 3.3, 2.2)).toBe(true);
  });

  it("draws the same guide anew on a field reshaped deeper, its marks over the ceiling shown again", async () => {
    const painted = await paintGuide(null);
    painted.context.shape = { ...painted.context.shape, depth: 6 };
    painted.context.guide = { dots: [], turns: [], struck: [0, 9] };
    painted.painter.draw(painted.context);
    const before = shown(painted.painter.marks).length;

    painted.context.shape = { ...painted.context.shape, depth: 11 };
    painted.painter.draw(painted.context);

    expect([before, shown(painted.painter.marks).length]).toEqual([1, 2]);
  });

  it("draws nothing again in a frame where the guide, the wall and the layout stand as they were", async () => {
    const clearance = new ClearCount();
    const painted = await paintGuide(dotsAt([3, 3], [4, 4]), { clearance });
    const asked = clearance.asked;

    painted.painter.draw({ ...painted.context, now: 16 });

    expect([asked, clearance.asked]).toEqual([2, 2]);
  });

  it("hides the guide where none shows, and keeps it hidden as the wall changes", async () => {
    const painted = await paintGuide({
      dots: [{ x: 3, y: 3 }],
      turns: [{ x: 0.3, y: 4 }],
      struck: [8],
    });
    painted.context.guide = null;
    painted.painter.draw(painted.context);

    painted.context.view = { wall: { ...STANDING, lowestRow: 4 }, wallDrop: 1 };
    painted.painter.draw(painted.context);

    expect([
      shown(painted.painter.dots).length,
      shown(painted.painter.rings).length,
      shown(painted.painter.marks).length,
    ]).toEqual([0, 0, 0]);
  });

  it("holds the most dots its art says, a ring for each turn it rings and a mark for each brick a line crosses on the deepest field, made once", async () => {
    const { painter } = await paintGuide(null);

    expect({
      dots: painter.dots.length,
      rings: painter.rings.length,
      marks: painter.marks.length,
      most: MOST_STRUCK,
    }).toEqual({
      dots: RINGING.mostDots,
      rings: RINGING.turns?.most,
      marks: MOST_STRUCK,
      most: MOST_DEPTH + COLUMNS,
    });
  });

  it("draws in its layer from the back: the marks, the rings and the dots", async () => {
    const { painter, layer } = await paintGuide(null);
    const placeOf = (image: GameObjects.Image | undefined): number =>
      image ? layer.getIndex(image) : -1;

    expect([
      placeOf(painter.marks.at(-1)) < placeOf(painter.rings[0]),
      placeOf(painter.rings.at(-1)) < placeOf(painter.dots[0]),
    ]).toEqual([true, true]);
  });
});
