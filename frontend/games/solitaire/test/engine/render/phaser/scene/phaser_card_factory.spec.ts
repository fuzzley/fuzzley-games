// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Filters, GameObjects, Textures } from "phaser";
import type { HostedScene } from "@fz/phaser/host";
import type { SceneRun } from "@fz/phaser/testing";
import { PhaserCardFactory } from "@/engine/render/phaser/scene/phaser_card_factory";
import type { CardArtScale } from "@/engine/render/deck/card_art_scale";
import { cardAtlasTextureKey } from "@/engine/render/phaser/deck/card_deck_atlas";
import { runSceneWithAtlases } from "@test/support/atlas_scene";

/** The texture of whichever deck is on the table, at 2x. */
const DECK_TEXTURE = cardAtlasTextureKey({ deckId: "indexed", artScale: 2 });

/** The same deck at 1x. */
const DECK_TEXTURE_1X = cardAtlasTextureKey({ deckId: "indexed", artScale: 1 });

/** The key every card's shadow sprite draws from. */
const SHADOW_TEXTURE = PhaserCardFactory.SHADOW_TEXTURE_KEY;

/**
 * The 1x card, 220 by 307, with room for its shadow on every side, as Phaser
 * sizes a dynamic texture: each side rounded up to an even number.
 */
const EVEN_1X_SHADOW = [220 + 32, 307 + 48 + 1];

/** A shadow filter's settings, and the list it was added to. */
interface ShadowSettings {
  readonly x: number;
  readonly y: number;
  readonly decay: number;
  readonly power: number;
  readonly color: number;
  readonly samples: number;
  readonly intensity: number;
  readonly list: "internal" | "external";
  readonly paddingOverride: readonly number[];
}

/** What was drawn into, or erased from, the shadow texture, as it was then. */
interface Stroke {
  readonly op: "draw" | "erase";
  readonly texture: string;
  readonly frame: string | number;
  readonly x: number;
  readonly y: number;
  readonly shadows: readonly ShadowSettings[];
}

/** Returns the settings of each shadow filter in a list. */
function shadowsIn(
  list: GameObjects.Components.FilterList | undefined,
  name: ShadowSettings["list"],
): ShadowSettings[] {
  return (list?.list ?? []).flatMap((filter) => {
    if (!(filter instanceof Filters.Shadow)) return [];
    const padding = filter.paddingOverride;
    return [
      {
        x: filter.x,
        y: filter.y,
        decay: filter.decay,
        power: filter.power,
        color: filter.color,
        samples: filter.samples,
        intensity: filter.intensity,
        list: name,
        paddingOverride: [
          padding.left,
          padding.top,
          padding.right,
          padding.bottom,
        ],
      },
    ];
  });
}

/**
 * Records each sprite drawn into or erased from a dynamic texture, with the
 * filters it had then, since the factory lets it go once the shadow is drawn.
 */
function recordStrokes(): Stroke[] {
  const strokes: Stroke[] = [];
  // Phaser erases by drawing, which is no stroke of its own.
  let depth = 0;
  for (const op of ["draw", "erase"] as const) {
    // Called below with the texture it belongs to.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = Textures.DynamicTexture.prototype[op];
    vi.spyOn(Textures.DynamicTexture.prototype, op).mockImplementation(
      function (this: Textures.DynamicTexture, entries: unknown) {
        if (depth === 0 && entries instanceof GameObjects.Sprite) {
          strokes.push({
            op,
            texture: entries.texture.key,
            frame: entries.frame.name,
            x: entries.x,
            y: entries.y,
            shadows: [
              ...shadowsIn(entries.filters?.internal, "internal"),
              ...shadowsIn(entries.filters?.external, "external"),
            ],
          });
        }
        depth++;
        try {
          return original.call(this, entries);
        } finally {
          depth--;
        }
      },
    );
  }
  return strokes;
}

describe("PhaserCardFactory", () => {
  let run: SceneRun<HostedScene>;
  let factory: PhaserCardFactory;
  /** The density of the deck on the table, 2 unless a test says otherwise. */
  let artScale: CardArtScale;
  /** What the factory drew into the shadow texture. */
  let strokes: Stroke[];

  beforeEach(async () => {
    run = await runSceneWithAtlases([
      { deckId: "indexed", artScale: 2 },
      { deckId: "indexed", artScale: 1 },
    ]);
    artScale = 2;
    factory = factoryWithBack("card-back-blue");
    strokes = recordStrokes();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    run.destroy();
  });

  /** Returns a factory for the scene that deals cards with a back. */
  function factoryWithBack(back: string): PhaserCardFactory {
    return new PhaserCardFactory(
      run.scene,
      () => back,
      () => (artScale === 1 ? DECK_TEXTURE_1X : DECK_TEXTURE),
      () => artScale,
    );
  }

  /** Returns the texture the shadow was baked into. */
  function shadowTexture(): Textures.DynamicTexture {
    const texture = run.scene.textures.get(SHADOW_TEXTURE);
    if (!(texture instanceof Textures.DynamicTexture)) {
      throw new Error("No shadow texture was created");
    }
    return texture;
  }

  it("creates a card sprite from the card-back frame with a standard origin", () => {
    const sprite = factory.createCardSprite();

    expect({
      texture: sprite.texture.key,
      frame: sprite.frame.name,
      origin: [sprite.originX, sprite.originY],
    }).toEqual({
      texture: DECK_TEXTURE,
      frame: "card-back-blue",
      origin: [0, 0],
    });
  });

  it("uses the injected card-back style for the card frame", () => {
    const sprite = factoryWithBack("card-back-red").createCardSprite();

    expect(sprite.frame.name).toBe("card-back-red");
  });

  it("makes the card sprite interactive with a hand cursor", () => {
    const sprite = factory.createCardSprite();

    expect(sprite.input?.cursor).toBe("pointer");
  });

  it("leaves the card sprite unfiltered", () => {
    // A filter renders its card through framebuffers of its own every frame,
    // which is what made dragging crawl on a phone.
    const sprite = factory.createCardSprite();

    expect(sprite.filters).toBeFalsy();
  });

  describe("card shadow", () => {
    it("draws the shadow a card back casts", () => {
      factory.bakeCardShadow();

      const [cast] = strokes;
      expect(cast).toMatchObject({
        op: "draw",
        texture: DECK_TEXTURE,
        frame: "card-back-blue",
      });
      expect(cast.shadows).toEqual([
        {
          x: -1.5,
          y: -2,
          decay: 0.22,
          power: 0.04,
          color: 0x000000,
          samples: 12,
          intensity: 0.1,
          list: "internal",
          paddingOverride: [-32, -48, 32, 48],
        },
      ]);
    });

    it("places the shadow's light outside the card so it falls clear of it", () => {
      // x and y position a light in texture space rather than offsetting the
      // shadow, so a light inside the card casts a halo instead of a drop
      // shadow.
      factory.bakeCardShadow();

      const [shadow] = strokes[0].shadows;
      expect([shadow.x < 0, shadow.y < 0]).toEqual([true, true]);
    });

    it("casts the shadow in the card's own space, not the screen's", () => {
      // An external filter works on a framebuffer the size of the screen
      // rather than of the card.
      factory.bakeCardShadow();

      expect(strokes[0].shadows.map((shadow) => shadow.list)).toEqual([
        "internal",
      ]);
    });

    it("gives the shadow room to draw outside the card", () => {
      // Without a padding override the shadow is cropped to the card's own
      // opaque bounds, which hides it completely.
      factory.bakeCardShadow();

      const padding = strokes[0].shadows[0].paddingOverride;
      expect(padding.every((value) => value !== 0)).toBe(true);
    });

    it("sizes the texture to the card with that room on every side", () => {
      factory.bakeCardShadow();

      const texture = shadowTexture();
      expect([texture.width, texture.height]).toEqual([440 + 64, 614 + 96]);
    });

    it("cuts the card out, leaving only the shadow it throws", () => {
      // Left in, the card would show through the antialiased edge of whichever
      // card the shadow is drawn under.
      factory.bakeCardShadow();

      const [cast, cut] = strokes;
      expect(cut).toEqual({
        op: "erase",
        texture: DECK_TEXTURE,
        frame: "card-back-blue",
        x: cast.x,
        y: cast.y,
        shadows: [],
      });
    });

    it("draws the card inside the room left for its shadow", () => {
      factory.bakeCardShadow();

      const [cast] = strokes;
      expect([cast.x, cast.y]).toEqual([32, 48]);
    });

    it("releases the sprites it drew the shadow with", () => {
      const made = vi.spyOn(run.scene.make, "sprite");

      factory.bakeCardShadow();

      const sprites = made.mock.results.map(
        (result) => result.value as GameObjects.Sprite,
      );
      expect(sprites.map((sprite) => sprite.scene)).toEqual([
        undefined,
        undefined,
      ]);
    });

    it("redraws into the same texture, which shadow sprites already use", () => {
      factory.bakeCardShadow();
      const texture = shadowTexture();

      factory.bakeCardShadow();

      expect({
        same: shadowTexture() === texture,
        strokes: strokes.map((stroke) => stroke.op),
      }).toEqual({ same: true, strokes: ["draw", "erase", "draw", "erase"] });
    });

    it("replaces a shadow texture left behind by an earlier run of the scene", () => {
      const earlier = run.scene.textures.addDynamicTexture(
        SHADOW_TEXTURE,
        1,
        1,
      );

      factory.bakeCardShadow();

      expect([shadowTexture() === earlier, shadowTexture().width]).toEqual([
        false,
        440 + 64,
      ]);
    });

    it("draws each card's shadow from the shared texture", () => {
      factory.bakeCardShadow();

      const sprite = factory.createCardShadow();

      expect(sprite.texture.key).toBe(SHADOW_TEXTURE);
    });

    it("anchors a shadow sprite at the corner of the card casting it", () => {
      // So a shadow given its card's position and scale lands exactly under it.
      factory.bakeCardShadow();

      const sprite = factory.createCardShadow();

      expect([sprite.displayOriginX, sprite.displayOriginY]).toEqual([32, 48]);
    });

    describe("from a 1x atlas", () => {
      beforeEach(() => {
        artScale = 1;
      });

      it("leaves the same room in design units, so half the texels", () => {
        factory.bakeCardShadow();

        const [cast] = strokes;
        expect({
          padding: cast.shadows[0].paddingOverride,
          card: [cast.x, cast.y],
        }).toEqual({ padding: [-16, -24, 16, 24], card: [16, 24] });
      });

      it("sizes the texture to the 1x card with that room on every side", () => {
        factory.bakeCardShadow();

        const texture = shadowTexture();
        expect([texture.width, texture.height]).toEqual(EVEN_1X_SHADOW);
      });

      it("anchors a shadow sprite at the 1x card's corner", () => {
        factory.bakeCardShadow();

        const sprite = factory.createCardShadow();

        expect([sprite.displayOriginX, sprite.displayOriginY]).toEqual([
          16, 24,
        ]);
      });
    });

    it("leaves whole texels of room at a fractional density", () => {
      artScale = 0.75;

      const sprite = factory.createCardShadow();

      expect([sprite.displayOriginX, sprite.displayOriginY]).toEqual([12, 18]);
    });

    describe("when the atlas changes density", () => {
      it("resizes the texture the shadow sprites already use", () => {
        factory.bakeCardShadow();
        const texture = shadowTexture();
        artScale = 1;

        factory.bakeCardShadow();

        expect({
          same: shadowTexture() === texture,
          size: [texture.width, texture.height],
        }).toEqual({ same: true, size: EVEN_1X_SHADOW });
      });

      it("refits a shadow sprite to the corner of the card at the new density", () => {
        factory.bakeCardShadow();
        const sprite = factory.createCardShadow();
        artScale = 1;
        factory.bakeCardShadow();

        factory.fitCardShadow(sprite);

        expect({
          texture: sprite.texture.key,
          size: [sprite.width, sprite.height],
          origin: [sprite.displayOriginX, sprite.displayOriginY],
        }).toEqual({
          texture: SHADOW_TEXTURE,
          size: EVEN_1X_SHADOW,
          origin: [16, 24],
        });
      });
    });
  });

  it("creates an interactive background with the given alpha", () => {
    const sprite = factory.createPileBackground(
      "card-placeholder-full-border-reset",
      0.5,
      true,
    );

    expect({
      texture: sprite.texture.key,
      frame: sprite.frame.name,
      origin: [sprite.originX, sprite.originY],
      alpha: sprite.alpha,
      cursor: sprite.input?.cursor,
    }).toEqual({
      texture: DECK_TEXTURE,
      frame: "card-placeholder-full-border-reset",
      origin: [0, 0],
      alpha: 0.5,
      cursor: "pointer",
    });
  });

  it("creates a non-interactive background with the given alpha", () => {
    const sprite = factory.createPileBackground("card-placeholder", 0.4, false);

    expect([sprite.frame.name, sprite.alpha, sprite.input]).toEqual([
      "card-placeholder",
      0.4,
      null,
    ]);
  });

  describe("rounding to whole pixels", () => {
    // Phaser's default rounds only unscaled sprites, and these are always
    // scaled, so without it they sit between pixels and blur.
    const ROUND_WITH_THE_CAMERA = "fullAuto";

    it("rounds a card's corners whenever the camera rounds pixels", () => {
      const sprite = factory.createCardSprite();

      expect(sprite.vertexRoundMode).toBe(ROUND_WITH_THE_CAMERA);
    });

    it("rounds a shadow's corners as its card's are", () => {
      const sprite = factory.createCardShadow();

      expect(sprite.vertexRoundMode).toBe(ROUND_WITH_THE_CAMERA);
    });

    it("rounds a placeholder's corners as a card's are", () => {
      const sprite = factory.createPileBackground(
        "card-placeholder",
        0.5,
        false,
      );

      expect(sprite.vertexRoundMode).toBe(ROUND_WITH_THE_CAMERA);
    });
  });

  it("draws whatever frame the zone asked for", () => {
    const sprite = factory.createPileBackground(
      "card-placeholder-full-border-circle",
      0.6,
      false,
    );

    expect([sprite.frame.name, sprite.alpha]).toEqual([
      "card-placeholder-full-border-circle",
      0.6,
    ]);
  });

  it("draws its sprites and shadow without error frame after frame", () => {
    factory.bakeCardShadow();
    factory.createCardShadow();
    factory.createCardSprite();

    expect(() => {
      run.advance(48);
    }).not.toThrow();
  });
});
