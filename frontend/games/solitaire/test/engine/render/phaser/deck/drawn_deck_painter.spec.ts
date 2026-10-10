import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Textures } from "phaser";
import {
  DrawnDeckHost,
  DrawnDeckPainter,
  DrawnDeckServices,
  DrawnDeckTextures,
  PaintSurface,
  createBrowserCanvas,
  phaserDrawnDeckTextures,
} from "@/engine/render/phaser/deck/drawn_deck_painter";
import {
  CardAtlas,
  cardAtlasTextureKey,
} from "@/engine/render/phaser/deck/card_deck_atlas";
import {
  DeckPaintContext,
  DrawnDeckPlan,
  ImageFrame,
} from "@/engine/render/phaser/deck/drawn_card_deck";

/** The mobile deck at 0.75x, which a 3x phone draws Klondike from. */
const MOBILE: CardAtlas = { deckId: "mobile", artScale: 0.75 };

/** The texture the mobile deck's built atlas is registered under. */
const MOBILE_KEY = cardAtlasTextureKey(MOBILE);

/** A layout scale no built atlas matches, as on a 390 px phone at 3x. */
const PHONE_SCALE = 0.73;

/** How long the scale must hold before the deck is drawn. */
const SETTLE_MS = DrawnDeckPainter.SETTLE_MS;

/** A frame of each kind: a face and a back with SVG, a placeholder without. */
const FRAMES = ["card-hearts-ace", "card-back-blue", "card-placeholder"];

/** Stands in for the board, recording which texture its cards draw from. */
class FakeHost implements DrawnDeckHost {
  public cardTextureKey = MOBILE_KEY;
  public readonly drawnFrom: [string, number][] = [];

  drawCardsFrom(textureKey: string, artScale: number): void {
    this.cardTextureKey = textureKey;
    this.drawnFrom.push([textureKey, artScale]);
  }
}

/** Stands in for the texture cache, holding the built atlases it is given. */
class FakeTextures implements DrawnDeckTextures {
  public readonly present = new Set<string>([MOBILE_KEY]);
  public readonly added = new Map<string, DrawnDeckPlan>();

  exists(textureKey: string): boolean {
    return this.present.has(textureKey);
  }
  frameNames(): string[] {
    return FRAMES;
  }
  frame(textureKey: string): ImageFrame | null {
    if (!this.present.has(textureKey)) return null;
    return {
      image: {} as CanvasImageSource,
      x: 0,
      y: 0,
      width: 165,
      height: 230,
    };
  }
  addCanvas(
    textureKey: string,
    _canvas: HTMLCanvasElement,
    plan: DrawnDeckPlan,
  ): void {
    this.present.add(textureKey);
    this.added.set(textureKey, plan);
  }
  remove(textureKey: string): void {
    this.present.delete(textureKey);
  }
}

/** A canvas whose 2D context paints nothing. */
function blankSurface(): PaintSurface {
  const ignore = (): void => {};
  const context = {
    drawImage: ignore,
    save: ignore,
    restore: ignore,
    beginPath: ignore,
    rect: ignore,
    clip: ignore,
    roundRect: ignore,
    stroke: ignore,
  } as unknown as DeckPaintContext;
  return { canvas: {} as HTMLCanvasElement, context };
}

/** Lets every pending promise settle, as the browser would between frames. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("DrawnDeckPainter", () => {
  let host: FakeHost;
  let textures: FakeTextures;
  let createCanvas: ReturnType<typeof vi.fn<DrawnDeckServices["createCanvas"]>>;
  let loadSvg: ReturnType<typeof vi.fn<DrawnDeckServices["loadSvg"]>>;
  let painter: DrawnDeckPainter;

  beforeEach(() => {
    host = new FakeHost();
    textures = new FakeTextures();
    createCanvas = vi.fn<DrawnDeckServices["createCanvas"]>(() =>
      blankSurface(),
    );
    loadSvg = vi.fn<DrawnDeckServices["loadSvg"]>(() =>
      Promise.resolve({} as CanvasImageSource),
    );
    painter = new DrawnDeckPainter(host, {
      textures,
      hasVectors: (deckId) => deckId === "mobile",
      loadVectors: () =>
        Promise.resolve({
          "card-hearts-ace": "<svg/>",
          "card-back-blue": "<svg/>",
        }),
      createCanvas,
      loadSvg,
    });
  });

  /** Holds a scale for long enough to draw, and lets the drawing finish. */
  async function holdScale(
    atlas: CardAtlas,
    layoutScale: number,
    fromMs = 0,
  ): Promise<void> {
    painter.follow(atlas, layoutScale, fromMs);
    painter.follow(atlas, layoutScale, fromMs + SETTLE_MS);
    await flush();
  }

  /** Returns the key of the drawing the cards draw from, if they do. */
  function drawnKey(): string | undefined {
    return host.drawnFrom.at(-1)?.[0];
  }

  it("waits for the scale to hold before drawing", async () => {
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, PHONE_SCALE, SETTLE_MS - 1);
    await flush();

    expect(host.drawnFrom).toEqual([]);
  });

  it("draws the deck once the scale has held, and the cards draw from it", async () => {
    await holdScale(MOBILE, PHONE_SCALE);

    const key = drawnKey() ?? "";
    expect({
      artScale: host.drawnFrom.at(-1)?.[1],
      frames: textures.added.get(key)?.slots.map((slot) => slot.name),
    }).toEqual({ artScale: PHONE_SCALE, frames: FRAMES });
  });

  it("starts waiting again when the scale changes", async () => {
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, 0.7, 200);
    painter.follow(MOBILE, 0.7, 300);
    await flush();

    expect(host.drawnFrom).toEqual([]);
  });

  it("leaves a desktop deck to its built atlas", async () => {
    await holdScale({ deckId: "classic", artScale: 0.75 }, PHONE_SCALE);

    expect(createCanvas).not.toHaveBeenCalled();
  });

  it("draws nothing at a scale a built atlas already matches", async () => {
    await holdScale(MOBILE, 0.75);

    expect(createCanvas).not.toHaveBeenCalled();
  });

  it("puts the built atlas back the moment the scale changes", async () => {
    await holdScale(MOBILE, PHONE_SCALE);
    const drawn = drawnKey() ?? "";

    painter.follow(MOBILE, 0.7, 1000);

    expect({
      drawnFrom: host.drawnFrom.at(-1),
      released: !textures.exists(drawn),
    }).toEqual({ drawnFrom: [MOBILE_KEY, 0.75], released: true });
  });

  it("draws again once the new scale has held", async () => {
    await holdScale(MOBILE, PHONE_SCALE);

    await holdScale(MOBILE, 0.7, 1000);

    expect(host.drawnFrom.at(-1)?.[1]).toBe(0.7);
  });

  it("releases a drawing the cards were moved off, without moving them back", async () => {
    // As when the loader swaps in another deck's atlas.
    await holdScale(MOBILE, PHONE_SCALE);
    const drawn = drawnKey() ?? "";
    host.cardTextureKey = "cards:classic@0.75x";
    const swaps = host.drawnFrom.length;

    painter.follow(MOBILE, PHONE_SCALE, 1000);

    expect({
      swaps: host.drawnFrom.length,
      released: !textures.exists(drawn),
    }).toEqual({ swaps, released: true });
  });

  it("throws away a drawing the board moved on from while it was made", async () => {
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, PHONE_SCALE, SETTLE_MS);
    painter.follow(MOBILE, 0.7, SETTLE_MS + 16);
    await flush();

    expect({
      drawnFrom: host.drawnFrom,
      added: textures.added.size,
    }).toEqual({ drawnFrom: [], added: 0 });
  });

  it("does not try a drawing again once it has failed", async () => {
    createCanvas.mockReturnValue(null);
    await holdScale(MOBILE, PHONE_SCALE);

    painter.follow(MOBILE, PHONE_SCALE, 2000);
    painter.follow(MOBILE, PHONE_SCALE, 2000 + SETTLE_MS);
    await flush();

    expect(createCanvas).toHaveBeenCalledTimes(1);
  });

  it("keeps the built atlas when a drawing fails, and says so once", async () => {
    loadSvg.mockRejectedValue(new Error("Undecodable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await holdScale(MOBILE, PHONE_SCALE);

    await holdScale(MOBILE, PHONE_SCALE, 2000);

    expect({
      drawnFrom: host.drawnFrom,
      warnings: warn.mock.calls.length,
    }).toEqual({ drawnFrom: [], warnings: 1 });
    warn.mockRestore();
  });

  it("releases the drawing when the board ends", async () => {
    await holdScale(MOBILE, PHONE_SCALE);
    const drawn = drawnKey() ?? "";

    painter.dispose();

    expect(textures.exists(drawn)).toBe(false);
  });

  it("keeps nothing it finishes drawing after the board has ended", async () => {
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, PHONE_SCALE, SETTLE_MS);

    painter.dispose();
    await flush();

    expect(textures.added.size).toBe(0);
  });
});

describe("phaserDrawnDeckTextures", () => {
  /** A frame as Phaser keeps it: its page's image and where it is cut from. */
  const FRAME = {
    source: { image: { page: 0 } },
    cutX: 4,
    cutY: 8,
    cutWidth: 165,
    cutHeight: 230,
  };

  /** Stands in for Phaser's texture cache, holding one atlas. */
  function phaserTextures(canvasTexture: { add: ReturnType<typeof vi.fn> }) {
    return {
      exists: (key: string) => key === MOBILE_KEY,
      get: () => ({ getFrameNames: () => FRAMES }),
      getFrame: (key: string, name: string) =>
        key === MOBILE_KEY && name === "card-back-blue" ? FRAME : null,
      addCanvas: vi.fn((key: string) =>
        key === "taken" ? null : canvasTexture,
      ),
      remove: vi.fn(),
    } as unknown as Textures.TextureManager;
  }

  it("lists a texture's frames", () => {
    const textures = phaserDrawnDeckTextures(phaserTextures({ add: vi.fn() }));

    expect(textures.frameNames(MOBILE_KEY)).toEqual(FRAMES);
  });

  it("finds where a frame lies in its page's image", () => {
    const textures = phaserDrawnDeckTextures(phaserTextures({ add: vi.fn() }));

    expect(textures.frame(MOBILE_KEY, "card-back-blue")).toEqual({
      image: { page: 0 },
      x: 4,
      y: 8,
      width: 165,
      height: 230,
    });
  });

  it("finds no frame a texture lacks, nor any in a texture not loaded", () => {
    const textures = phaserDrawnDeckTextures(phaserTextures({ add: vi.fn() }));

    expect([
      textures.frame(MOBILE_KEY, "card-missing"),
      textures.frame("cards:classic@1x", "card-back-blue"),
    ]).toEqual([null, null]);
  });

  it("registers a painted canvas with a frame for every slot", () => {
    const canvasTexture = { add: vi.fn() };
    const textures = phaserDrawnDeckTextures(phaserTextures(canvasTexture));
    const plan: DrawnDeckPlan = {
      artScale: PHONE_SCALE,
      frame: { width: 161, height: 224 },
      width: 328,
      height: 228,
      slots: [
        { name: "card-hearts-ace", x: 2, y: 2 },
        { name: "card-back-blue", x: 165, y: 2 },
      ],
    };

    textures.addCanvas("drawn", {} as HTMLCanvasElement, plan);

    expect(canvasTexture.add.mock.calls).toEqual([
      ["card-hearts-ace", 0, 2, 2, 161, 224],
      ["card-back-blue", 0, 165, 2, 161, 224],
    ]);
  });

  it("refuses a texture key already taken", () => {
    const textures = phaserDrawnDeckTextures(phaserTextures({ add: vi.fn() }));
    const plan: DrawnDeckPlan = {
      artScale: PHONE_SCALE,
      frame: { width: 161, height: 224 },
      width: 0,
      height: 0,
      slots: [],
    };

    expect(() =>
      textures.addCanvas("taken", {} as HTMLCanvasElement, plan),
    ).toThrow("taken");
  });
});

describe("createBrowserCanvas", () => {
  it("makes no canvas outside a browser", () => {
    expect(createBrowserCanvas(100, 100)).toBeNull();
  });
});
