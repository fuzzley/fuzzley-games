// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import type { HostedScene } from "@fz/phaser/host";
import type { SceneRun } from "@fz/phaser/testing";
import {
  type DrawnDeckHost,
  DrawnDeckPainter,
  type DrawnDeckServices,
  type DrawnDeckTextures,
  browserDrawnDeckServices,
  createBrowserCanvas,
  phaserDrawnDeckTextures,
} from "@/engine/render/phaser/deck/drawn_deck_painter";
import {
  type CardAtlas,
  cardAtlasTextureKey,
} from "@/engine/render/phaser/deck/card_deck_atlas";
import { loadCardDeckVectors } from "@/engine/render/phaser/deck/card_deck_vectors";
import type { DrawnDeckPlan } from "@/engine/render/phaser/deck/drawn_card_deck";
import mobileAtlas from "@/engine/render/assets/sprites/atlas/mobile/0.75x/card_assets_atlas.json";
import { runSceneWithAtlases } from "@test/support/atlas_scene";

/** The mobile deck at 0.75x, which a 3x phone draws Klondike from. */
const MOBILE: CardAtlas = { deckId: "mobile", artScale: 0.75 };

/** The texture the mobile deck's built atlas is registered under. */
const MOBILE_KEY = cardAtlasTextureKey(MOBILE);

/** Every frame of the mobile deck's built atlas, as the atlas lists them. */
const MOBILE_FRAMES = mobileAtlas.textures.flatMap((page) => page.frames);

/** A layout scale no built atlas matches, as on a 390 px phone at 3x. */
const PHONE_SCALE = 0.73;

/** How long the scale must hold before the deck is drawn. */
const SETTLE_MS = DrawnDeckPainter.SETTLE_MS;

/** Stands in for the board, recording which texture its cards draw from. */
class FakeHost implements DrawnDeckHost {
  public cardTextureKey = MOBILE_KEY;
  public readonly drawnFrom: [string, number][] = [];

  drawCardsFrom(textureKey: string, artScale: number): void {
    this.cardTextureKey = textureKey;
    this.drawnFrom.push([textureKey, artScale]);
  }
}

/** Resolves on a later task, once the tasks queued before it have run. */
async function nextTask(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

/** A scene that has loaded the mobile deck's built atlas. */
let run: SceneRun<HostedScene>;

beforeEach(async () => {
  run = await runSceneWithAtlases([MOBILE]);
});

afterEach(() => {
  run.destroy();
});

describe("DrawnDeckPainter", () => {
  let host: FakeHost;
  let createCanvas: Mock<DrawnDeckServices["createCanvas"]>;
  let loadSvg: Mock<DrawnDeckServices["loadSvg"]>;
  let painter: DrawnDeckPainter;
  /** How many loads the painter is waiting on. */
  let loading: number;

  /** Counts a load the painter waits on until it settles. */
  function tracked<T>(load: Promise<T>): Promise<T> {
    loading++;
    return load.finally(() => {
      loading--;
    });
  }

  beforeAll(async () => {
    // Imported once beforehand, so a drawing takes no longer than its images.
    await loadCardDeckVectors("mobile");
  });

  beforeEach(() => {
    host = new FakeHost();
    loading = 0;
    const browser = browserDrawnDeckServices(run.scene.textures);
    createCanvas = vi.fn((width: number, height: number) =>
      browser.createCanvas(width, height),
    );
    loadSvg = vi.fn((svg, size) => tracked(browser.loadSvg(svg, size)));
    painter = new DrawnDeckPainter(host, {
      ...browser,
      loadVectors: (deckId) => tracked(browser.loadVectors(deckId)),
      createCanvas,
      loadSvg,
    });
  });

  /** Waits until every drawing the painter started has finished. */
  async function settle(): Promise<void> {
    do await nextTask();
    while (loading > 0);
    await nextTask();
  }

  /** Holds a scale for long enough to draw, and lets the drawing finish. */
  async function holdScale(
    atlas: CardAtlas,
    layoutScale: number,
    fromMs = 0,
  ): Promise<void> {
    painter.follow(atlas, layoutScale, fromMs);
    painter.follow(atlas, layoutScale, fromMs + SETTLE_MS);
    await settle();
  }

  /** Returns the key of the drawing the cards draw from, if they do. */
  function drawnKey(): string | undefined {
    return host.drawnFrom.at(-1)?.[0];
  }

  /** Returns whether the scene holds a texture. */
  function exists(textureKey: string): boolean {
    return run.scene.textures.exists(textureKey);
  }

  it("waits for the scale to hold before drawing", async () => {
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, PHONE_SCALE, SETTLE_MS - 1);
    await settle();

    expect(host.drawnFrom).toEqual([]);
  });

  it("draws the deck once the scale has held, and the cards draw from it", async () => {
    await holdScale(MOBILE, PHONE_SCALE);

    const key = drawnKey() ?? "";
    expect({
      artScale: host.drawnFrom.at(-1)?.[1],
      frames: run.scene.textures.get(key).getFrameNames(),
    }).toEqual({
      artScale: PHONE_SCALE,
      frames: MOBILE_FRAMES.map((frame) => frame.filename),
    });
  });

  it("draws every frame with vectors from them, and the rest from the atlas", async () => {
    await holdScale(MOBILE, PHONE_SCALE);

    const vectors = await loadCardDeckVectors("mobile");
    expect(loadSvg).toHaveBeenCalledTimes(Object.keys(vectors ?? {}).length);
  });

  it("draws each frame at the board's size of it", async () => {
    await holdScale(MOBILE, PHONE_SCALE);

    const frame = run.scene.textures.getFrame(
      drawnKey() ?? "",
      "card-back-blue",
    );
    expect([frame.width, frame.height]).toEqual([
      Math.round((165 / 0.75) * PHONE_SCALE),
      Math.round((230 / 0.75) * PHONE_SCALE),
    ]);
  });

  it("starts waiting again when the scale changes", async () => {
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, 0.7, 200);
    painter.follow(MOBILE, 0.7, 300);
    await settle();

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
      released: !exists(drawn),
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
      released: !exists(drawn),
    }).toEqual({ swaps, released: true });
  });

  it("throws away a drawing the board moved on from while it was made", async () => {
    const before = run.scene.textures.getTextureKeys();
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, PHONE_SCALE, SETTLE_MS);
    painter.follow(MOBILE, 0.7, SETTLE_MS + 16);
    await settle();

    expect({
      drawnFrom: host.drawnFrom,
      textures: run.scene.textures.getTextureKeys(),
    }).toEqual({ drawnFrom: [], textures: before });
  });

  it("does not try a drawing again once it has failed", async () => {
    createCanvas.mockReturnValue(null);
    await holdScale(MOBILE, PHONE_SCALE);

    painter.follow(MOBILE, PHONE_SCALE, 2000);
    painter.follow(MOBILE, PHONE_SCALE, 2000 + SETTLE_MS);
    await settle();

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

    expect(exists(drawn)).toBe(false);
  });

  it("keeps nothing it finishes drawing after the board has ended", async () => {
    const before = run.scene.textures.getTextureKeys();
    painter.follow(MOBILE, PHONE_SCALE, 0);
    painter.follow(MOBILE, PHONE_SCALE, SETTLE_MS);

    painter.dispose();
    await settle();

    expect(run.scene.textures.getTextureKeys()).toEqual(before);
  });
});

describe("phaserDrawnDeckTextures", () => {
  /** Returns the slice of the scene's texture cache a painter works with. */
  function textures(): DrawnDeckTextures {
    return phaserDrawnDeckTextures(run.scene.textures);
  }

  /** A plan of two frames on a small canvas. */
  const PLAN: DrawnDeckPlan = {
    artScale: PHONE_SCALE,
    frame: { width: 161, height: 224 },
    width: 328,
    height: 228,
    slots: [
      { name: "card-hearts-ace", x: 2, y: 2 },
      { name: "card-back-blue", x: 165, y: 2 },
    ],
  };

  it("lists a texture's frames", () => {
    expect(textures().frameNames(MOBILE_KEY)).toEqual(
      MOBILE_FRAMES.map((frame) => frame.filename),
    );
  });

  it("finds where a frame lies in its page's image", () => {
    const page = run.scene.textures.get(MOBILE_KEY).getSourceImage();

    expect(textures().frame(MOBILE_KEY, "card-back-blue")).toEqual({
      image: page,
      x: 1042,
      y: 480,
      width: 165,
      height: 230,
    });
  });

  it("finds no frame a texture lacks, nor any in a texture not loaded", () => {
    const warn = vi.spyOn(console, "warn");

    const found = [
      textures().frame(MOBILE_KEY, "card-missing"),
      textures().frame("cards:classic@1x", "card-back-blue"),
    ];

    expect([found, warn.mock.calls]).toEqual([[null, null], []]);
    warn.mockRestore();
  });

  it("registers a painted canvas with a frame for every slot", () => {
    const canvas = createBrowserCanvas(PLAN.width, PLAN.height)?.canvas;

    textures().addCanvas("drawn", canvas!, PLAN);

    const texture = run.scene.textures.get("drawn");
    expect(
      texture.getFrameNames().map((name) => {
        const frame = texture.get(name);
        return [name, frame.cutX, frame.cutY, frame.width, frame.height];
      }),
    ).toEqual([
      ["card-hearts-ace", 2, 2, 161, 224],
      ["card-back-blue", 165, 2, 161, 224],
    ]);
  });

  it("refuses a texture key already taken", () => {
    const canvas = createBrowserCanvas(PLAN.width, PLAN.height)?.canvas;

    expect(() => {
      textures().addCanvas(MOBILE_KEY, canvas!, PLAN);
    }).toThrow("taken");
  });

  it("removes a texture", () => {
    const canvas = createBrowserCanvas(PLAN.width, PLAN.height)?.canvas;
    textures().addCanvas("drawn", canvas!, PLAN);

    textures().remove("drawn");

    expect(textures().exists("drawn")).toBe(false);
  });
});

describe("createBrowserCanvas", () => {
  it("makes a canvas of a size, with its 2D context", () => {
    const surface = createBrowserCanvas(120, 80);

    expect([
      surface?.canvas.width,
      surface?.canvas.height,
      surface?.context === surface?.canvas.getContext("2d"),
    ]).toEqual([120, 80, true]);
  });
});
