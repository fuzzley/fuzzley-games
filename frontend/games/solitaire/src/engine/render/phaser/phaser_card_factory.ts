import * as Phaser from "phaser";

/**
 * Factory class responsible for creating and configuring Phaser sprite GameObjects
 * for playing cards and pile backgrounds.
 */
export class PhaserCardFactory {
  /**
   * The drop shadow applied to every card sprite.
   *
   * Field names match the parameters of `FilterList.addShadow(x, y, decay,
   * power, color, samples, intensity)`, none of which mean what they sound
   * like. From the filter's shader:
   *
   * - `x` and `y` place a light in the filter texture's coordinate space, where
   *   the texture spans 0 to 1. They are not an offset. Putting the light off
   *   the top-left corner throws the shadow down and to the right.
   * - Each of `samples` steps travels `decay / 12 * intensity` of the way
   *   towards the light, so those three together set how far the shadow
   *   reaches. Twelve is the shader's ceiling on `samples`; spending all of
   *   them buys a smoother gradient rather than a longer one.
   * - `power` is what one sample contributes where it lands on the card, so
   *   `samples * power` is roughly how dark the shadow gets at its deepest.
   *
   * The reach is a fraction of the filter texture, which for an internal filter
   * is the card, so the shadow stays proportional to the card at every layout
   * scale.
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
   * Phaser sizes this itself from `x * width * decay * intensity`, which
   * assumes the light sits inside the texture. This one is outside it, so the
   * distance to it — and with it the shadow's reach — grows across the card,
   * and Phaser's estimate comes out short enough to cut the gradient off part
   * way through its fade.
   */
  private static readonly CARD_SHADOW_PADDING = { x: 32, y: 48 };

  /**
   * Constructs the visual factory with the active Phaser Scene context.
   *
   * @param scene The active Phaser Scene.
   * @param cardBackStyle Supplies the current card-back frame to use for new
   *   card sprites. Injected so the factory needs no knowledge of the game
   *   model or scene internals.
   * @param textureKey Supplies the texture of the deck currently on the table.
   *   Read per sprite rather than captured, so a sprite made after the player
   *   changes deck is drawn from the deck they changed to.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cardBackStyle: () => string,
    private readonly textureKey: () => string,
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
      this.textureKey(),
      this.cardBackStyle(),
    );
    sprite.setOrigin(0, 0);
    sprite.enableFilters();

    // Internal, not external: an external filter is composited in screen space,
    // which makes Phaser allocate a canvas-sized framebuffer per filtered
    // object - 52 of them every frame, at whatever resolution the display runs
    // at. An internal filter works in the card's own space instead.
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

    // Make card sprite interactive for pointer events
    sprite.setInteractive({ useHandCursor: true });

    return sprite;
  }

  /**
   * Instantiates a pile's background placeholder sprite.
   *
   * Which artwork marks a slot is the zone's business, not the factory's, so
   * the frame is passed in rather than chosen here by pile role.
   *
   * @param frame The atlas frame the zone declared for its placeholder.
   * @param alpha Transparency level for the background.
   * @param interactive Whether the slot responds to the pointer at all. Only a
   *   slot that does something when clicked needs to.
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
