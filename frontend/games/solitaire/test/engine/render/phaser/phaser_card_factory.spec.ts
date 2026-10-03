import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { PhaserCardFactory } from "@/engine/render/phaser/phaser_card_factory";
import {
  createMockMake,
  createMockSprite,
  createMockTextures,
  MockDynamicTexture,
  MockSprite,
  MockTextures,
} from "@test/support/phaser_mocks";

/** The texture of whichever deck is on the table. */
const DECK_TEXTURE = "cards:indexed";

/** The key every card's shadow sprite draws from. */
const SHADOW_TEXTURE = PhaserCardFactory.SHADOW_TEXTURE_KEY;

describe("PhaserCardFactory", () => {
  let addSprite: ReturnType<typeof vi.fn>;
  let make: ReturnType<typeof createMockMake>;
  let textures: MockTextures;
  let scene: Phaser.Scene;
  let factory: PhaserCardFactory;

  beforeEach(() => {
    addSprite = vi.fn(
      (x?: number, y?: number, texture?: string, frame?: string) =>
        createMockSprite({ x, y, texture, frame }),
    );
    make = createMockMake();
    textures = createMockTextures(DECK_TEXTURE);
    scene = {
      add: { sprite: addSprite },
      make,
      textures,
    } as unknown as Phaser.Scene;
    factory = new PhaserCardFactory(
      scene,
      () => "card-back-blue",
      () => DECK_TEXTURE,
    );
  });

  /** Returns the texture the shadow was baked into. */
  function shadowTexture(): MockDynamicTexture {
    const texture = textures.dynamicTexture(SHADOW_TEXTURE);
    if (!texture) throw new Error("No shadow texture was created");
    return texture;
  }

  /** Returns every sprite the factory made off the display list. */
  function madeSprites(): MockSprite[] {
    return make.sprite.mock.results.map((result) => result.value as MockSprite);
  }

  it("creates a card sprite from the card-back frame with a standard origin", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      DECK_TEXTURE,
      "card-back-blue",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
  });

  it("uses the injected card-back style for the card frame", () => {
    const redFactory = new PhaserCardFactory(
      scene,
      () => "card-back-red",
      () => DECK_TEXTURE,
    );

    redFactory.createCardSprite();

    expect(addSprite).toHaveBeenCalledWith(0, 0, DECK_TEXTURE, "card-back-red");
  });

  it("makes the card sprite interactive with a hand cursor", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
  });

  it("leaves the card sprite unfiltered", () => {
    // A filter renders its card through framebuffers of its own every frame,
    // which is what made dragging crawl on a phone.
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.filtersEnabled).toBe(false);
  });

  describe("card shadow", () => {
    it("draws the shadow a card back casts", () => {
      factory.bakeCardShadow();

      const [cast] = shadowTexture().contents;
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

      const [shadow] = shadowTexture().contents[0].shadows;
      expect([shadow.x < 0, shadow.y < 0]).toEqual([true, true]);
    });

    it("casts the shadow in the card's own space, not the screen's", () => {
      // An external filter works on a framebuffer the size of the screen
      // rather than of the card.
      factory.bakeCardShadow();

      const shadows = shadowTexture().contents[0].shadows;
      expect(shadows.map((shadow) => shadow.list)).toEqual(["internal"]);
    });

    it("gives the shadow room to draw outside the card", () => {
      // Without a padding override the shadow is cropped to the card's own
      // opaque bounds, which hides it completely.
      factory.bakeCardShadow();

      const padding = shadowTexture().contents[0].shadows[0].paddingOverride;
      expect(padding && padding.every((value) => value !== 0)).toBe(true);
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

      const [cast, cut] = shadowTexture().contents;
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

      const [cast] = shadowTexture().contents;
      expect([cast.x, cast.y]).toEqual([32, 48]);
    });

    it("releases the sprites it drew the shadow with", () => {
      factory.bakeCardShadow();

      expect(madeSprites().map((sprite) => sprite.destroyed)).toEqual([
        true,
        true,
      ]);
    });

    it("redraws into the same texture, which shadow sprites already use", () => {
      factory.bakeCardShadow();
      const texture = shadowTexture();

      factory.bakeCardShadow();

      expect(shadowTexture()).toBe(texture);
      expect(texture.contents.map((stroke) => stroke.op)).toEqual([
        "draw",
        "erase",
      ]);
      expect(texture.renderCount).toBe(2);
    });

    it("replaces a shadow texture left behind by an earlier run of the scene", () => {
      const earlier = textures.addDynamicTexture(SHADOW_TEXTURE, 1, 1);

      factory.bakeCardShadow();

      expect(shadowTexture()).not.toBe(earlier);
      expect(shadowTexture().contents).toHaveLength(2);
    });

    it("draws each card's shadow from the shared texture", () => {
      factory.createCardShadow();

      expect(addSprite).toHaveBeenCalledWith(0, 0, SHADOW_TEXTURE);
    });

    it("anchors a shadow sprite at the corner of the card casting it", () => {
      // So a shadow given its card's position and scale lands exactly under it.
      const sprite = factory.createCardShadow() as unknown as MockSprite;

      expect([sprite.displayOriginX, sprite.displayOriginY]).toEqual([32, 48]);
    });
  });

  it("creates an interactive background with the given alpha", () => {
    const sprite = factory.createPileBackground(
      "card-placeholder-full-border-reset",
      0.5,
      true,
    ) as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      DECK_TEXTURE,
      "card-placeholder-full-border-reset",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
    expect(sprite.alpha).toBe(0.5);
    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
  });

  it("creates a non-interactive background with the given alpha", () => {
    const sprite = factory.createPileBackground(
      "card-placeholder",
      0.4,
      false,
    ) as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      DECK_TEXTURE,
      "card-placeholder",
    );
    expect(sprite.alpha).toBe(0.4);
    expect(sprite.interactiveConfig).toBeNull();
  });

  it("draws whatever frame the zone asked for", () => {
    const sprite = factory.createPileBackground(
      "card-placeholder-full-border-circle",
      0.6,
      false,
    ) as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      DECK_TEXTURE,
      "card-placeholder-full-border-circle",
    );
    expect(sprite.alpha).toBe(0.6);
    expect(sprite.interactiveConfig).toBeNull();
  });
});
