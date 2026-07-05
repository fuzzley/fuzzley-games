import * as Phaser from "phaser";
import { CardBackStyle } from "@/game/model/game/game_settings";

/**
 * Factory class responsible for creating and configuring Phaser sprite GameObjects
 * for playing cards and pile backgrounds.
 */
export class BoardVisualFactory {
  /** Drop shadows applied to every card sprite (top-left and bottom-right). */
  private static readonly CARD_SHADOWS = [
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
  ];

  /**
   * Constructs the visual factory with the active Phaser Scene context.
   *
   * @param scene The active Phaser Scene.
   * @param cardBackStyle Supplies the current card-back frame to use for new
   *   card sprites. Injected so the factory needs no knowledge of the game
   *   model or scene internals.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cardBackStyle: () => CardBackStyle,
  ) {}

  /**
   * Instantiates and configures a card sprite with standard origin and shadow filters.
   *
   * @returns The configured Sprite.
   */
  createCardSprite(): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      "card_assets",
      this.cardBackStyle(),
    );
    sprite.setOrigin(0, 0);
    sprite.enableFilters();

    // Add two filters so that we get some shadow on both top left and bottom right.
    for (const shadow of BoardVisualFactory.CARD_SHADOWS) {
      sprite.filters?.external.addShadow(
        shadow.x,
        shadow.y,
        shadow.decay,
        shadow.intensity,
        shadow.color,
        shadow.blur,
        shadow.opacity,
      );
    }

    // Make card sprite interactive for pointer events
    sprite.setInteractive({ useHandCursor: true });

    return sprite;
  }

  /**
   * Instantiates the stock pile placeholder sprite.
   *
   * @param alpha Transparency level for the background.
   * @returns The configured Stock Pile Sprite.
   */
  createStockBackground(alpha: number): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      "card_assets",
      "card-placeholder-full-border-reset",
    );
    sprite.setOrigin(0, 0);
    sprite.setAlpha(alpha);
    sprite.setInteractive({ useHandCursor: true });
    return sprite;
  }

  /**
   * Instantiates a tableau pile placeholder sprite.
   *
   * @param alpha Transparency level for the background.
   * @returns The configured Tableau Pile Sprite.
   */
  createTableauBackground(alpha: number): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      "card_assets",
      "card-placeholder",
    );
    sprite.setOrigin(0, 0);
    sprite.setAlpha(alpha);
    return sprite;
  }

  /**
   * Instantiates a foundation pile placeholder sprite.
   *
   * @param alpha Transparency level for the background.
   * @returns The configured Foundation Pile Sprite.
   */
  createFoundationBackground(alpha: number): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      "card_assets",
      "card-placeholder-full-border-circle",
    );
    sprite.setOrigin(0, 0);
    sprite.setAlpha(alpha);
    return sprite;
  }
}
