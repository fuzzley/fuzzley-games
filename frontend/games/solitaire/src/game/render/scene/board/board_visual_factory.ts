import * as Phaser from "phaser";
import { CardBackStyle } from "@/game/model/game/game_settings";

/**
 * Factory class responsible for creating and configuring Phaser sprite GameObjects
 * for playing cards and pile backgrounds.
 */
export class BoardVisualFactory {
  /**
   * The drop shadow applied to every card sprite. Field names match the
   * parameters of `FilterList.addShadow(x, y, decay, power, color, samples,
   * intensity)`, whose offset is scaled by the filter camera's size: run as an
   * internal filter that camera is the card, so the shadow stays proportional
   * to the card at every layout scale.
   */
  private static readonly CARD_SHADOW = {
    x: 0.5,
    y: 0.5,
    decay: 0.05,
    power: 0.8,
    color: 0x000000,
    samples: 6,
    intensity: 0.05,
  };

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

    // Internal, not external: an external filter is composited in screen space,
    // which makes Phaser allocate a canvas-sized framebuffer per filtered
    // object - 52 of them every frame, at whatever resolution the display runs
    // at. An internal filter works in the card's own space instead.
    const shadow = BoardVisualFactory.CARD_SHADOW;
    const filter = sprite.filters?.internal.addShadow(
      shadow.x,
      shadow.y,
      shadow.decay,
      shadow.power,
      shadow.color,
      shadow.samples,
      shadow.intensity,
    );

    // Filters override their padding with zero by default. That is harmless
    // externally, where the coverage is the whole canvas, but internally it
    // would crop the shadow to the card's own opaque bounds and hide it
    // entirely. Clearing the override lets the filter ask for the room it needs.
    filter?.setPaddingOverride(null);

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
