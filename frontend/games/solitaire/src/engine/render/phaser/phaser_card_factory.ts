import * as Phaser from "phaser";

/** Makes the sprites for cards and pile placeholders. */
export class PhaserCardFactory {
  /**
   * The drop shadow applied to every card sprite, as the arguments to
   * `FilterList.addShadow`, none of which mean what they sound like.
   *
   * - `x` and `y` place a light in the card's 0-to-1 texture space; off the
   *   top-left corner, it throws the shadow down and to the right.
   * - Each of the `samples` steps travels `decay / 12 * intensity` towards the
   *   light, so those three set the shadow's reach; 12 samples is the most.
   * - `samples * power` is roughly how dark the shadow gets at its deepest.
   */
  private static readonly CARD_SHADOW = {
    x: -1.5,
    y: -2,
    decay: 0.22,
    power: 0.04,
    color: 0x000000,
    samples: 12,
    intensity: 0.1,
  };

  /**
   * Room left around the card for the shadow to draw into, in texels.
   *
   * Set by hand because Phaser's own estimate assumes the light is inside the
   * texture, and cuts this shadow off part way through its fade.
   */
  private static readonly CARD_SHADOW_PADDING = { x: 32, y: 48 };

  /**
   * Creates a factory that adds sprites to a scene.
   *
   * @param cardBackStyle Returns the card-back frame for a new card sprite.
   * @param textureKey Returns the texture of the deck currently on the table.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cardBackStyle: () => string,
    private readonly textureKey: () => string,
  ) {}

  /** Creates an interactive card sprite with a drop shadow. */
  createCardSprite(): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      this.textureKey(),
      this.cardBackStyle(),
    );
    sprite.setOrigin(0, 0);
    sprite.enableFilters();

    // Internal, because an external filter needs a canvas-sized framebuffer for
    // every card, every frame.
    const shadow = PhaserCardFactory.CARD_SHADOW;
    const padding = PhaserCardFactory.CARD_SHADOW_PADDING;
    sprite.filters?.internal
      .addShadow(
        shadow.x,
        shadow.y,
        shadow.decay,
        shadow.power,
        shadow.color,
        shadow.samples,
        shadow.intensity,
      )
      ?.setPaddingOverride(-padding.x, -padding.y, padding.x, padding.y);

    sprite.setInteractive({ useHandCursor: true });

    return sprite;
  }

  /**
   * Creates a pile's placeholder sprite.
   *
   * @param frame The atlas frame the pile's zone declared for its placeholder.
   * @param interactive Whether the slot responds to the pointer.
   */
  createPileBackground(
    frame: string,
    alpha: number,
    interactive: boolean,
  ): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(0, 0, this.textureKey(), frame);
    sprite.setOrigin(0, 0);
    sprite.setAlpha(alpha);
    if (interactive) {
      sprite.setInteractive({ useHandCursor: true });
    }
    return sprite;
  }
}
