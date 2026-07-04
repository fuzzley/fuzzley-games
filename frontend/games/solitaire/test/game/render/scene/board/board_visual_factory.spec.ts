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
    factory = new BoardVisualFactory(scene);
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

  it("makes the card sprite interactive with a hand cursor", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
  });

  it("gives the card sprite two drop-shadow filters", () => {
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    expect(sprite.filtersEnabled).toBe(true);
    expect(sprite.shadowsAdded).toEqual([
      {
        x: 0.5,
        y: 0.5,
        decay: 0.05,
        intensity: 0.8,
        color: 0x000000,
        blur: 6,
        opacity: 0.05,
      },
      {
        x: 0,
        y: 0,
        decay: 0.1,
        intensity: 0.8,
        color: 0x000000,
        blur: 6,
        opacity: 0.05,
      },
    ]);
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
