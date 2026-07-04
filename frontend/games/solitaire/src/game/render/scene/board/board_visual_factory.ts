import * as Phaser from "phaser";

interface SceneWithModel extends Phaser.Scene {
  gameModel?: {
    settings: {
      cardBackStyle: "card-back-blue" | "card-back-red";
    };
  };
}

/**
 * Factory class responsible for creating and configuring Phaser sprite GameObjects
 * for playing cards and pile backgrounds.
 */
export class BoardVisualFactory {
  /**
   * Constructs the visual factory with the active Phaser Scene context.
   *
   * @param scene The active Phaser Scene.
   */
  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * Instantiates and configures a card sprite with standard origin and shadow filters.
   *
   * @returns The configured Sprite.
   */
  createCardSprite(): Phaser.GameObjects.Sprite {
    const boardScene = this.scene as SceneWithModel;
    const cardBack =
      boardScene.gameModel?.settings.cardBackStyle || "card-back-blue";
    const sprite = this.scene.add.sprite(0, 0, "card_assets", cardBack);
    sprite.setOrigin(0, 0);
    sprite.enableFilters();

    // Add two filters so that we get some shadow on both top left and bottom right.
    sprite.filters?.external.addShadow(0.5, 0.5, 0.05, 0.8, 0x000000, 6, 0.05);
    sprite.filters?.external.addShadow(0, 0, 0.1, 0.8, 0x000000, 6, 0.05);

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
