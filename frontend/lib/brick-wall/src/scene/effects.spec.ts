import type { HostedScene } from "@fz/phaser/host";
import { type SceneRun, runBareScene } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { thirdsOf } from "../rules/wall";
import {
  LIGHT_MADE_UP,
  madeUpField,
  madeUpFrames,
} from "../testing/made_up/field";
import { RING_FROM } from "../view/easing";
import { toCanvas } from "../view/field_metrics";
import { FLASH_MS, RING_MS, SHARDS } from "../view/timing";
import { MOST_BAKED_UNIT, WallAtlas } from "./atlas";
import {
  type EffectsArt,
  EffectsPainter,
  FLASH_ALPHA,
  FLASH_THICKNESS,
  MOST_FLASHES,
  MOST_RINGS,
  MOST_SHARDS_FLYING,
  MOST_STREAKS,
  SHARD_FALL,
  SHARD_SPEED,
  StripFlashes,
  burstOf,
  stillShowing,
} from "./effects";
import type { PaintContext } from "./painter";

/** How long a made-up streak takes to fade. */
const STREAK_MS = 200;

/** The made-up frames that burst from the wall. */
const ART: EffectsArt = {
  shard: "shard",
  streak: "streak",
  ring: "ring",
  streakMs: STREAK_MS,
};

/** Describes the effects painted in a scene and the context they are drawn from. */
interface Painted {
  readonly run: SceneRun<HostedScene>;
  readonly painter: EffectsPainter;
  readonly layer: GameObjects.Layer;
  readonly atlas: WallAtlas<typeof LIGHT_MADE_UP>;
  readonly context: PaintContext<unknown>;
}

/**
 * Paints the effects on a canvas of some CSS pixels, laid out for it, in a
 * scene running till the test finishes, nothing bursting yet.
 */
async function paintEffects(width = 400, height = 400): Promise<Painted> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  const { scene } = run;
  const { shape, metrics } = madeUpField(width, height);
  const atlas = new WallAtlas(scene, madeUpFrames, LIGHT_MADE_UP, metrics);
  const layer = scene.add.layer();
  const painter = new EffectsPainter(scene, layer, ART);
  painter.layout(metrics);
  const context: PaintContext<unknown> = {
    view: null,
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

/** Draws a frame at a time in the scene's time. */
function drawAt(painted: Painted, now: number): void {
  painted.context.now = now;
  painted.painter.draw(painted.context);
}

/** Lays the field out again on a canvas of some CSS pixels, the atlas baked for it, the effects laid out for it. */
function layOut(painted: Painted, width: number, height: number): void {
  const { shape, metrics } = madeUpField(width, height);
  const { atlas, context, painter } = painted;
  atlas.bakeFor(context.palette, metrics);
  context.shape = shape;
  context.metrics = metrics;
  context.baked = atlas.scale;
  painter.layout(metrics);
}

/** Returns how many of a set of images show. */
function showing(images: readonly GameObjects.GameObject[]): number {
  return images.filter((image) => "visible" in image && image.visible).length;
}

/** Returns a number rounded to a tenth, to read a fade halfway through. */
function tenths(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Returns the shards alive, each where it is, how large and in what tint. */
function aliveShards(
  painter: EffectsPainter,
): { x: number; y: number; scale: number; tint: number }[] {
  const shards: { x: number; y: number; scale: number; tint: number }[] = [];
  painter.shards.forEachAlive((shard) => {
    shards.push({
      x: shard.x,
      y: shard.y,
      scale: shard.scaleX,
      tint: shard.tint,
    });
  }, null);
  return shards;
}

describe("burstOf", () => {
  it("makes a burst's record over its image, hidden, at its first place, unturned and one cell long, played never", async () => {
    const run = await runBareScene();
    onTestFinished(() => {
      run.destroy();
    });
    const image = run.scene.add.image(0, 0, "__DEFAULT");

    const burst = burstOf(image);

    expect({ ...burst, image: burst.image === image }).toEqual({
      image: true,
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
      angle: 0,
      length: 1,
    });
    expect(image.visible).toBe(false);
  });
});

describe("stillShowing", () => {
  it.each([
    [0, 0, 0],
    [0, 299, 0],
    [0, 300, null],
    [100, 500, null],
  ])(
    "keeps a kind started at %i shown at %i for 300 ms as started at %s",
    (started, now, kept) => {
      expect(stillShowing(started, now, 300)).toBe(kept);
    },
  );
});

describe("EffectsPainter", () => {
  describe("the shards", () => {
    it("throw a broken brick's shards from its place on the field, tinted in its color", async () => {
      const { painter, context } = await paintEffects();
      const place = toCanvas(context.metrics, 8.5, 5.5);

      painter.shatter(8.5, 5.5, 0x336699, context.metrics);

      expect(aliveShards(painter)).toEqual(
        Array.from({ length: SHARDS }, () => ({
          ...place,
          scale: 1,
          tint: 0x336699,
        })),
      );
    });

    it("show the shards scaled up past the atlas's largest unit", async () => {
      const { painter, context } = await paintEffects(1300, 1800);
      const scale = context.metrics.unit / MOST_BAKED_UNIT;

      painter.shatter(4.5, 3.5, 0x336699, context.metrics);

      expect({
        scaledUp: scale > 1,
        scales: aliveShards(painter).map((shard) => shard.scale),
      }).toEqual({
        scaledUp: true,
        scales: Array.from({ length: SHARDS }, () => scale),
      });
    });

    it("throw no more shards at once than the pool made once holds", async () => {
      const { painter, context } = await paintEffects();
      const made = painter.shards.getParticleCount();

      for (let brick = 0; brick < MOST_SHARDS_FLYING; brick++) {
        painter.shatter(4.5, 3.5, 0x336699, context.metrics);
      }

      expect({
        made,
        alive: painter.shards.getAliveParticleCount(),
        after: painter.shards.getParticleCount(),
      }).toEqual({
        made: MOST_SHARDS_FLYING,
        alive: MOST_SHARDS_FLYING,
        after: MOST_SHARDS_FLYING,
      });
    });

    it("fly as fast and fall as fast as the field's unit has them, laid out anew", async () => {
      const painted = await paintEffects();

      layOut(painted, 600, 500);

      const { unit } = painted.context.metrics;
      const { shards } = painted.painter;
      expect({
        speed: shards.ops.speedX.propertyValue,
        fall: shards.gravityY,
      }).toEqual({
        speed: { min: SHARD_SPEED.least * unit, max: SHARD_SPEED.most * unit },
        fall: SHARD_FALL * unit,
      });
    });
  });

  describe("a streak", () => {
    it("is drawn through its place, turned the way something flew across the field and up it", async () => {
      const painted = await paintEffects();

      painted.painter.streak(8.5, 5.5, -0.8, 0.6, 0);
      drawAt(painted, 0);

      const [streak] = painted.painter.streaks.all.filter(
        ({ image }) => image.visible,
      );
      expect({
        x: streak?.image.x,
        y: streak?.image.y,
        rotation: streak?.image.rotation,
        scale: [streak?.image.scaleX, streak?.image.scaleY],
        frame: streak?.image.frame.name,
      }).toEqual({
        ...toCanvas(painted.context.metrics, 8.5, 5.5),
        rotation: Math.atan2(-0.6, -0.8),
        scale: [1, 1],
        frame: ART.streak,
      });
    });

    it("is scaled with the field's unit past the atlas's largest", async () => {
      const painted = await paintEffects(1300, 1800);
      const scale = painted.context.metrics.unit / MOST_BAKED_UNIT;

      painted.painter.streak(4.5, 3.5, 0, 1, 0);
      drawAt(painted, 0);

      const [streak] = painted.painter.streaks.all;
      expect([streak?.image.scaleX, streak?.image.scaleY]).toEqual([
        scale,
        scale,
      ]);
    });

    it("fades through the game's streak's time, then hides", async () => {
      const painted = await paintEffects();
      painted.painter.streak(8.5, 5.5, 0, 1, 0);
      drawAt(painted, STREAK_MS / 2);
      const [streak] = painted.painter.streaks.all;
      const halfway = streak?.image.alpha ?? 0;

      drawAt(painted, STREAK_MS);

      expect({
        halfway: tenths(halfway),
        after: streak?.image.visible,
      }).toEqual({ halfway: 0.5, after: false });
    });
  });

  describe("a ring", () => {
    it("spreads from its place, from a quarter its size", async () => {
      const painted = await paintEffects();

      painted.painter.ring(8.5, 5.5, 0);
      drawAt(painted, 0);

      const [ring] = painted.painter.rings.all.filter(
        ({ image }) => image.visible,
      );
      expect({
        x: ring?.image.x,
        y: ring?.image.y,
        scale: ring?.image.scale,
        frame: ring?.image.frame.name,
      }).toEqual({
        ...toCanvas(painted.context.metrics, 8.5, 5.5),
        scale: RING_FROM,
        frame: ART.ring,
      });
    });

    it("fades as it spreads, then hides", async () => {
      const painted = await paintEffects();
      painted.painter.ring(8.5, 5.5, 0);
      drawAt(painted, RING_MS / 2);
      const [ring] = painted.painter.rings.all;
      const halfway = ring?.image.alpha ?? 0;

      drawAt(painted, RING_MS);

      expect({ halfway: tenths(halfway), after: ring?.image.visible }).toEqual({
        halfway: 0.5,
        after: false,
      });
    });
  });

  it.each<
    [
      string,
      number,
      (painter: EffectsPainter, now: number) => void,
      (painter: EffectsPainter) => readonly GameObjects.GameObject[],
    ]
  >([
    [
      "streak",
      STREAK_MS,
      (painter, now) => {
        painter.streak(8.5, 5.5, 0, 1, now);
      },
      (painter) => painter.streaks.all.map(({ image }) => image),
    ],
    [
      "ring",
      RING_MS,
      (painter, now) => {
        painter.ring(8.5, 5.5, now);
      },
      (painter) => painter.rings.all.map(({ image }) => image),
    ],
  ])(
    "shows a second %s through its own time, past the end of the first's, then hides it",
    async (_, ms, play, imagesOf) => {
      const painted = await paintEffects();
      const { painter } = painted;
      play(painter, 0);
      drawAt(painted, 0);
      const one = showing(imagesOf(painter));
      play(painter, ms / 2);
      drawAt(painted, ms / 2);
      const both = showing(imagesOf(painter));
      drawAt(painted, ms * 1.25);
      const second = showing(imagesOf(painter));

      drawAt(painted, ms * 2);

      expect({
        both,
        second,
        after: showing(imagesOf(painter)),
      }).toEqual({ both: 2 * one, second: one, after: 0 });
    },
  );

  describe("the jump line's flash", () => {
    it("flashes along the jump line, in its color, then fades", async () => {
      const painted = await paintEffects();
      const { flash } = painted.painter;
      const { metrics, shape } = painted.context;
      painted.painter.flashLine(0);
      drawAt(painted, 0);
      const flashed = {
        x: flash.x,
        y: flash.y,
        width: flash.width,
        height: flash.height,
        alpha: flash.fillAlpha,
        color: flash.fillColor,
      };
      drawAt(painted, FLASH_MS / 2);
      const halfway = flash.fillAlpha;

      drawAt(painted, FLASH_MS);

      expect({
        flashed,
        halfway: tenths(halfway),
        after: flash.visible,
      }).toEqual({
        flashed: {
          x: metrics.x + metrics.width / 2,
          y: metrics.y + thirdsOf(shape.depth).jump * metrics.unit,
          width: metrics.width,
          height: FLASH_THICKNESS * metrics.unit,
          alpha: FLASH_ALPHA,
          color: LIGHT_MADE_UP.jumpLine,
        },
        halfway: tenths(FLASH_ALPHA / 2),
        after: false,
      });
    });

    it("follows the jump line of a field laid out anew while it flashes", async () => {
      const painted = await paintEffects();
      painted.painter.flashLine(0);
      drawAt(painted, 0);

      layOut(painted, 300, 700);
      drawAt(painted, FLASH_MS / 2);

      const { metrics, shape } = painted.context;
      expect({
        y: painted.painter.flash.y,
        width: painted.painter.flash.width,
      }).toEqual({
        y: metrics.y + thirdsOf(shape.depth).jump * metrics.unit,
        width: metrics.width,
      });
    });

    it("shows none before the line flashes", async () => {
      const { painter } = await paintEffects();

      expect(painter.flash.visible).toBe(false);
    });
  });

  it("holds as many of each as may show at once, made once", async () => {
    const { painter } = await paintEffects();

    expect({
      rings: painter.rings.all.length,
      streaks: painter.streaks.all.length,
      shards: painter.shards.getParticleCount(),
    }).toEqual({
      rings: MOST_RINGS,
      streaks: MOST_STREAKS,
      shards: MOST_SHARDS_FLYING,
    });
  });

  it("draws in its layer from the back: the jump line's flash, the streaks, the shards and the rings", async () => {
    const { painter, layer } = await paintEffects();
    const placeOf = (object: GameObjects.GameObject | undefined): number =>
      object ? layer.getIndex(object) : -1;

    expect(
      [
        placeOf(painter.flash),
        placeOf(painter.streaks.all[0]?.image),
        placeOf(painter.shards),
        placeOf(painter.rings.all[0]?.image),
      ].map((place, at, places) => at === 0 || place > (places[at - 1] ?? 0)),
    ).toEqual([true, true, true, true]);
  });

  it("shows nothing before anything bursts", async () => {
    const { painter } = await paintEffects();

    expect({
      images: showing([
        painter.flash,
        ...painter.streaks.all.map(({ image }) => image),
        ...painter.rings.all.map(({ image }) => image),
      ]),
      shards: painter.shards.getAliveParticleCount(),
    }).toEqual({ images: 0, shards: 0 });
  });
});

/** Describes strips flashing in a scene and the context they are drawn from. */
interface Flashing {
  readonly run: SceneRun<HostedScene>;
  readonly strips: StripFlashes;
  readonly context: PaintContext<unknown>;
}

/** Makes the strips that flash on a canvas of 400 × 400 CSS pixels, in a scene running till the test finishes, none flashing yet. */
async function flashStrips(): Promise<Flashing> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  const { shape, metrics } = madeUpField(400, 400);
  const strips = new StripFlashes(run.scene, run.scene.add.layer());
  const context: PaintContext<unknown> = {
    view: null,
    shape,
    metrics,
    baked: { unit: metrics.unit, pixelRatio: metrics.pixelRatio },
    palette: LIGHT_MADE_UP,
    now: 0,
    motion: true,
  };
  strips.draw(context);
  return { run, strips, context };
}

/** Draws the strips at a time in the scene's time. */
function flashAt({ strips, context }: Flashing, now: number): void {
  context.now = now;
  strips.draw(context);
}

/** Flashes every strip once, at the scene's start, so the next flash plays the first strip again. */
function flashEveryStrip({ strips }: Flashing): void {
  for (let flash = 0; flash < MOST_FLASHES; flash++) {
    strips.flash(4.5, 3, 2, 0, 0x336699, 0);
  }
}

/** Returns where a strip lies, how large, turned and in what fill. */
function stripOf(strip: GameObjects.Rectangle | undefined): unknown {
  return (
    strip && {
      x: strip.x,
      y: strip.y,
      width: strip.width,
      height: strip.height,
      // Read back as Phaser wraps it, to within a float's error.
      rotation: strip.rotation.toFixed(6),
      alpha: strip.fillAlpha,
      color: strip.fillColor,
    }
  );
}

describe("StripFlashes", () => {
  it("flashes a strip about its middle, its length and turn, in its color, then fades it", async () => {
    const flashing = await flashStrips();
    const { metrics } = flashing.context;
    flashing.strips.flash(4.5, 3, 2, Math.PI / 4, 0x336699, 0);
    flashAt(flashing, 0);
    const [{ strip } = { strip: undefined }] = flashing.strips.flashes.all;
    const flashed = stripOf(strip);
    flashAt(flashing, FLASH_MS / 2);
    const halfway = strip?.fillAlpha ?? 0;

    flashAt(flashing, FLASH_MS);

    expect({
      flashed,
      halfway: tenths(halfway),
      after: strip?.visible,
    }).toEqual({
      flashed: {
        ...toCanvas(metrics, 4.5, 3),
        width: 2 * metrics.unit,
        height: FLASH_THICKNESS * metrics.unit,
        rotation: (Math.PI / 4).toFixed(6),
        alpha: FLASH_ALPHA,
        color: 0x336699,
      },
      halfway: tenths(FLASH_ALPHA / 2),
      after: false,
    });
  });

  it("follows a field laid out anew while it flashes", async () => {
    const flashing = await flashStrips();
    flashing.strips.flash(4.5, 3, 2, 0, 0x336699, 0);
    flashAt(flashing, 0);
    const { metrics } = madeUpField(600, 500);
    flashing.context.metrics = metrics;

    flashAt(flashing, FLASH_MS / 2);

    const [{ strip } = { strip: undefined }] = flashing.strips.flashes.all;
    expect({ x: strip?.x, y: strip?.y, width: strip?.width }).toEqual({
      ...toCanvas(metrics, 4.5, 3),
      width: 2 * metrics.unit,
    });
  });

  it("sizes a strip played anew for its own length, in the same layout", async () => {
    const flashing = await flashStrips();
    const { metrics } = flashing.context;
    flashEveryStrip(flashing);
    flashAt(flashing, 0);

    flashing.strips.flash(1.5, 1, 1, 0, 0x336699, FLASH_MS);
    flashAt(flashing, FLASH_MS);

    const [{ strip } = { strip: undefined }] = flashing.strips.flashes.all;
    expect({ x: strip?.x, width: strip?.width }).toEqual({
      x: toCanvas(metrics, 1.5, 1).x,
      width: metrics.unit,
    });
  });

  it("shows a second strip through its own time, past the end of the first's, then hides it", async () => {
    const flashing = await flashStrips();
    const strips = flashing.strips.flashes.all.map(({ strip }) => strip);
    flashing.strips.flash(4.5, 3, 1, 0, 0x336699, 0);
    flashAt(flashing, 0);
    flashing.strips.flash(4.5, 4, 1, 0, 0x336699, FLASH_MS / 2);
    flashAt(flashing, FLASH_MS / 2);
    const both = showing(strips);
    flashAt(flashing, FLASH_MS * 1.25);
    const second = showing(strips);

    flashAt(flashing, FLASH_MS * 2);

    expect({ both, second, after: showing(strips) }).toEqual({
      both: 2,
      second: 1,
      after: 0,
    });
  });

  it("holds a strip for each that may flash at once, made once, none showing", async () => {
    const { strips } = await flashStrips();

    expect({
      made: strips.flashes.all.length,
      showing: showing(strips.flashes.all.map(({ strip }) => strip)),
    }).toEqual({ made: MOST_FLASHES, showing: 0 });
  });
});
