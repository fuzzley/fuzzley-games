import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardVisualFactory } from "@/game/render/scene/board/board_visual_factory";

interface MockSprite extends Phaser.GameObjects.Sprite {
  originX: number;
  originY: number;
  interactiveConfig: { useHandCursor: boolean } | null;
  filtersEnabled: boolean;
  shadowsAdded: {
    x: number;
    y: number;
    decay: number;
    intensity: number;
    color: number;
    blur: number;
    opacity: number;
  }[];
}

// Mock phaser entirely
vi.mock("phaser", () => {
  const createMockSprite = (x = 0, y = 0, texture = "", frame = "") => {
    const sprite = {
      x,
      y,
      alpha: 1,
      originX: 0,
      originY: 0,
      interactiveConfig: null as unknown as { useHandCursor: boolean } | null,
      filtersEnabled: false,
      shadowsAdded: [] as {
        x: number;
        y: number;
        decay: number;
        intensity: number;
        color: number;
        blur: number;
        opacity: number;
      }[],
      setOrigin: vi.fn().mockImplementation(function (
        this: { originX: number; originY: number },
        x: number,
        y: number,
      ) {
        this.originX = x;
        this.originY = y;
        return this;
      }),
      setAlpha: vi.fn().mockImplementation(function (
        this: { alpha: number },
        alpha: number,
      ) {
        this.alpha = alpha;
        return this;
      }),
      setInteractive: vi.fn().mockImplementation(function (
        this: { interactiveConfig: unknown },
        config: unknown,
      ) {
        this.interactiveConfig = config as { useHandCursor: boolean } | null;
        return this;
      }),
      enableFilters: vi.fn().mockImplementation(function (this: {
        filtersEnabled: boolean;
      }) {
        this.filtersEnabled = true;
        return this;
      }),
      filters: {
        external: {
          addShadow: vi.fn().mockImplementation(function (
            x: number,
            y: number,
            decay: number,
            intensity: number,
            color: number,
            blur: number,
            opacity: number,
          ) {
            sprite.shadowsAdded.push({
              x,
              y,
              decay,
              intensity,
              color,
              blur,
              opacity,
            });
            return sprite;
          }),
        },
      },
      texture,
      frame,
    };
    return sprite as unknown as Phaser.GameObjects.Sprite;
  };

  return {
    Scene: class MockScene {
      add = {
        sprite: vi.fn((x, y, texture, frame) =>
          createMockSprite(x, y, texture, frame),
        ),
      };
    },
  };
});

describe("BoardVisualFactory", () => {
  let mockScene: Phaser.Scene;
  let factory: BoardVisualFactory;

  beforeEach(() => {
    mockScene = new Phaser.Scene({ key: "test-scene" });
    factory = new BoardVisualFactory(mockScene);
  });

  it("createCardSprite creates a card sprite with standard origin, interactive inputs, and shadow filters", () => {
    // Act
    const sprite = factory.createCardSprite() as unknown as MockSprite;

    // Assert
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-back-blue",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
    expect(sprite.filtersEnabled).toBe(true);
    expect(sprite.shadowsAdded).toHaveLength(2);
    expect(sprite.shadowsAdded[0]).toEqual({
      x: 0.5,
      y: 0.5,
      decay: 0.05,
      intensity: 0.8,
      color: 0x000000,
      blur: 6,
      opacity: 0.05,
    });
    expect(sprite.shadowsAdded[1]).toEqual({
      x: 0,
      y: 0,
      decay: 0.1,
      intensity: 0.8,
      color: 0x000000,
      blur: 6,
      opacity: 0.05,
    });
  });

  it("createStockBackground creates stock pile background with origin, alpha, and interactive input", () => {
    // Arrange
    const alpha = 0.5;

    // Act
    const sprite = factory.createStockBackground(
      alpha,
    ) as unknown as MockSprite;

    // Assert
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-placeholder-full-border-reset",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
    expect(sprite.alpha).toBe(alpha);
    expect(sprite.interactiveConfig).toEqual({ useHandCursor: true });
  });

  it("createTableauBackground creates tableau pile background with origin and alpha", () => {
    // Arrange
    const alpha = 0.4;

    // Act
    const sprite = factory.createTableauBackground(
      alpha,
    ) as unknown as MockSprite;

    // Assert
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-placeholder",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
    expect(sprite.alpha).toBe(alpha);
    expect(sprite.interactiveConfig).toBeNull();
  });

  it("createFoundationBackground creates foundation pile background with origin and alpha", () => {
    // Arrange
    const alpha = 0.6;

    // Act
    const sprite = factory.createFoundationBackground(
      alpha,
    ) as unknown as MockSprite;

    // Assert
    expect(mockScene.add.sprite).toHaveBeenCalledWith(
      0,
      0,
      "card_assets",
      "card-placeholder-full-border-circle",
    );
    expect(sprite.originX).toBe(0);
    expect(sprite.originY).toBe(0);
    expect(sprite.alpha).toBe(alpha);
    expect(sprite.interactiveConfig).toBeNull();
  });
});
