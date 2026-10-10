import { afterEach, describe, it, expect, vi } from "vitest";
import {
  DeckPaintContext,
  DrawnDeckPlan,
  ImageFrame,
  loadSvgImage,
  paintDrawnDeck,
  planDrawnDeck,
  sizeSvg,
} from "@/engine/render/phaser/deck/drawn_card_deck";
import { cardFrameTexels } from "@/engine/render/deck/card_art_scale";
import { Size } from "@/engine/render/layout/geometry";

/** As many frames as a deck's atlas holds: 56 cards and 11 placeholders. */
const ATLAS_FRAMES = Array.from({ length: 67 }, (_, index) => `frame-${index}`);

/** One drawImage call, with whatever the context was set to when it was made. */
interface DrawCall {
  readonly args: unknown[];
  readonly smoothing: boolean;
  readonly quality: string;
}

/** One stroke, with the line it was drawn in. */
interface StrokeCall {
  readonly lineWidth: number;
  readonly composite: string;
  readonly roundRect: number[];
}

/** Stands in for a canvas's 2D context, recording what was painted. */
class FakeContext {
  public readonly draws: DrawCall[] = [];
  public readonly strokes: StrokeCall[] = [];
  public globalCompositeOperation = "source-over";
  public lineWidth = 1;
  public strokeStyle = "";
  public imageSmoothingEnabled = false;
  public imageSmoothingQuality = "low";
  private lastRoundRect: number[] = [];

  drawImage(...args: unknown[]): void {
    this.draws.push({
      args,
      smoothing: this.imageSmoothingEnabled,
      quality: this.imageSmoothingQuality,
    });
  }
  save(): void {}
  restore(): void {
    this.globalCompositeOperation = "source-over";
  }
  beginPath(): void {}
  rect(): void {}
  clip(): void {}
  roundRect(...args: number[]): void {
    this.lastRoundRect = args;
  }
  stroke(): void {
    this.strokes.push({
      lineWidth: this.lineWidth,
      composite: this.globalCompositeOperation,
      roundRect: this.lastRoundRect,
    });
  }
}

/** Returns a plan for a deck of a few frames at a density. */
function planFor(names: string[], artScale: number): DrawnDeckPlan {
  const plan = planDrawnDeck(names, artScale);
  if (!plan) throw new Error("The deck should fit");
  return plan;
}

/** Paints a plan, the frames named in `vectors` from SVG and the rest copied. */
async function paint(
  plan: DrawnDeckPlan,
  vectors: Record<string, string>,
): Promise<FakeContext> {
  const context = new FakeContext();
  const atlasPage = { source: "atlas" };
  await paintDrawnDeck(
    context as unknown as DeckPaintContext,
    plan,
    vectors,
    (): ImageFrame => ({
      image: atlasPage as unknown as CanvasImageSource,
      x: 10,
      y: 20,
      width: 165,
      height: 230,
    }),
    (svg: string, size: Size) =>
      Promise.resolve({
        source: `${svg}@${size.width}x${size.height}`,
      } as unknown as CanvasImageSource),
  );
  return context;
}

describe("planDrawnDeck", () => {
  it("sizes every frame as a built atlas would round it", () => {
    const plan = planFor(ATLAS_FRAMES, 0.73);

    expect(plan.frame).toEqual(cardFrameTexels(0.73));
  });

  it("lays the frames out in rows, a gutter apart", () => {
    // 161 x 224 frames: 25 fit across 4096, so 67 take three rows of 23.
    const plan = planFor(ATLAS_FRAMES, 0.73);

    expect({
      canvas: [plan.width, plan.height],
      first: plan.slots[0],
      second: plan.slots[1],
      secondRow: plan.slots[23],
    }).toEqual({
      canvas: [2 + 23 * 163, 2 + 3 * 226],
      first: { name: "frame-0", x: 2, y: 2 },
      second: { name: "frame-1", x: 165, y: 2 },
      secondRow: { name: "frame-23", x: 2, y: 228 },
    });
  });

  it("gives up on a deck too large for one canvas", () => {
    expect(planDrawnDeck(ATLAS_FRAMES, 2)).toBeNull();
  });

  it("has nothing to lay out for no frames", () => {
    expect(planDrawnDeck([], 0.73)).toBeNull();
  });
});

describe("paintDrawnDeck", () => {
  it("draws a frame from its SVG at exactly the frame's size", async () => {
    const plan = planFor(["card-a"], 0.73);

    const context = await paint(plan, { "card-a": "<svg/>" });

    expect(context.draws.map((draw) => draw.args)).toEqual([
      [{ source: "<svg/>@161x224" }, 2, 2, 161, 224],
    ]);
  });

  it("copies a frame it has no SVG for from the built atlas, smoothly", async () => {
    const plan = planFor(["card-back-classic-blue"], 0.73);

    const context = await paint(plan, {});

    expect(context.draws).toEqual([
      {
        args: [{ source: "atlas" }, 10, 20, 165, 230, 2, 2, 161, 224],
        smoothing: true,
        quality: "high",
      },
    ]);
  });

  it("stamps the card edge, atop the frame, on a frame drawn from SVG", async () => {
    const plan = planFor(["card-a"], 0.73);

    const context = await paint(plan, { "card-a": "<svg/>" });

    expect(context.strokes.map((stroke) => stroke.composite)).toEqual([
      "source-atop",
    ]);
  });

  it.each([
    [0.5, 1],
    [0.73, 1],
    [1, 2],
    [1.5, 3],
  ])(
    "stamps the edge at %s a whole %s pixels wide, inset by half",
    async (artScale, widthPx) => {
      const plan = planFor(["card-a"], artScale);

      const context = await paint(plan, { "card-a": "<svg/>" });

      const [stroke] = context.strokes;
      expect([stroke.lineWidth, stroke.roundRect[0]]).toEqual([
        widthPx,
        2 + widthPx / 2,
      ]);
    },
  );

  it("leaves a copied frame's edge, which the atlas has already", async () => {
    const plan = planFor(["card-placeholder"], 0.73);

    const context = await paint(plan, {});

    expect(context.strokes).toEqual([]);
  });

  it("refuses a frame it has no artwork for", async () => {
    const plan = planFor(["card-missing"], 0.73);

    const painting = paintDrawnDeck(
      new FakeContext() as unknown as DeckPaintContext,
      plan,
      {},
      () => null,
      () => Promise.reject(new Error("No SVG should load")),
    );

    await expect(painting).rejects.toThrow("card-missing");
  });
});

describe("sizeSvg", () => {
  const SVG =
    '<svg width="220" height="307" viewBox="0 0 220 307" ' +
    'xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';

  it("sets the document to draw at the size, stretching its artwork", () => {
    expect(sizeSvg(SVG, { width: 161, height: 224 })).toBe(
      '<svg width="161" height="224" preserveAspectRatio="none" ' +
        'viewBox="0 0 220 307" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M0 0"/></svg>',
    );
  });
});

describe("loadSvgImage", () => {
  /** Stands in for the browser's Image, decoding whatever it is pointed at. */
  class DecodingImage {
    static latest: DecodingImage | null = null;
    public src = "";

    constructor(
      public readonly width: number,
      public readonly height: number,
    ) {
      DecodingImage.latest = this;
    }

    decode(): Promise<void> {
      return Promise.resolve();
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("decodes the SVG into an image of the size, then lets go of its URL", async () => {
    vi.stubGlobal("Image", DecodingImage);
    const revoke = vi.spyOn(URL, "revokeObjectURL");

    const image = await loadSvgImage("<svg>", { width: 161, height: 224 });

    const decoded = image as unknown as DecodingImage;
    expect({
      size: [decoded.width, decoded.height],
      revoked: revoke.mock.calls.map(([url]) => url),
    }).toEqual({ size: [161, 224], revoked: [decoded.src] });
  });
});
