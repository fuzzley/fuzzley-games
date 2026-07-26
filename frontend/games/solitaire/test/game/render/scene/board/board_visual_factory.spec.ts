import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardVisualFactory } from "@/game/render/scene/board/board_visual_factory";
import { createMockSprite, MockSprite } from "@test/support/phaser_mocks";

describe("BoardVisualFactory", () => {
  let addSprite: ReturnType<typeof vi.fn>;
  let factory: BoardVisualFactory;

  beforeEach(() => {
    addSprite = vi.fn(() => createMockSprite());
    const scene = { add: { sprite: addSprite } } as unknown as Phaser.Scene;
    factory = new BoardVisualFactory(scene, () => "card-back-blue");
  });

  it("creates a card sprite from the card-back frame with a standard origin", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-back-blue",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
  });

  it("uses the injected card-back style for the card frame", () => {
    const redFactory = new BoardVisualFactory(
      { add: { sprite: addSprite } } as unknown as Phaser.Scene,
      () => "card-back-red",
    );

    redFactory.createCardSprite();

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-back-red",
    );
  });

  it("makes the card sprite interactive with a hand cursor", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
  });

  it("gives the card sprite a drop-shadow filter", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.filtersEnabled).toBe(true);
    expect(sprite.shadowsAdded).toEqual([
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
    // shadow, so a light inside the card casts a halo instead of a drop shadow.
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    const shadow = sprite.shadowsAdded[0];
    expect([shadow.x < 0, shadow.y < 0]).toEqual([true, true]);
  });

  it("adds the shadow internally, not as a screen-space filter", () => {
    // An external filter costs a canvas-sized framebuffer per card, every
    // frame, at whatever resolution the display runs at.
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.shadowsAdded.map((shadow) => shadow.list)).toEqual([
      "internal",
    ]);
  });

  it("gives the shadow room to draw outside the card", () => {
    // Without a padding override the shadow is cropped to the card's own opaque
    // bounds, which hides it completely.
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    const padding = sprite.shadowsAdded[0].paddingOverride;
    expect(padding && padding.every((value) => value !== 0)).toBe(true);
  });

  it("creates an interactive stock background with the given alpha", () => {
    const sprite = factory.createStockBackground(0.5) as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-placeholder-full-border-reset",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
    expect(sprite.alpha).toBe(0.5);
    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
  });

  it("creates a non-interactive tableau background with the given alpha", () => {
    const sprite = factory.createTableauBackground(
      0.4,
    ) as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-placeholder",
    );
    expect(sprite.alpha).toBe(0.4);
    expect(sprite.interactiveConfig).toBeNull();
  });

  it("creates a non-interactive foundation background with the given alpha", () => {
    const sprite = factory.createFoundationBackground(
      0.6,
    ) as unknown as MockSprite;

    expect(addSprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-placeholder-full-border-circle",
    );
    expect(sprite.alpha).toBe(0.6);
    expect(sprite.interactiveConfig).toBeNull();
  });
});
