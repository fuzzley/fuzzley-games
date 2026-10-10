import * as Phaser from "phaser";

/** Makes the sprites for cards, the shadows they cast, and pile placeholders. */
export class PhaserCardFactory {
  /** The texture every card's shadow sprite is drawn from. */
  public static readonly SHADOW_TEXTURE_KEY = "card-shadow";

  /**
   * The drop shadow a card casts, as the arguments to `FilterList.addShadow`,
   * none of which mean what they sound like.
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
   * Room left around the card for the shadow to draw into, in design units,
   * which is this many texels per unit of the atlas's density.
   *
   * Set by hand because Phaser's own estimate assumes the light is inside the
   * texture, and cuts this shadow off part way through its fade.
   */
  private static readonly CARD_SHADOW_PADDING = { x: 16, y: 24 };

  /**
   * How every sprite the factory makes rounds its corners to whole pixels:
   * whenever the camera has `roundPixels` on, as the game config asks.
   *
   * Phaser's default rounds only a sprite drawn at its texture's own size, and
   * a card is always scaled, so it would sit between pixels and blur.
   */
  public static readonly VERTEX_ROUND_MODE = "fullAuto";

  /** The texture the card shadow was drawn into, once it has been. */
  private shadowTexture: Phaser.Textures.DynamicTexture | null = null;

  /**
   * Creates a factory that adds sprites to a scene.
   *
   * @param cardBackStyle Returns the card-back frame for a new card sprite.
   * @param textureKey Returns the texture of the deck currently on the table.
   * @param artScale Returns that texture's texels per design unit.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cardBackStyle: () => string,
    private readonly textureKey: () => string,
    private readonly artScale: () => number,
  ) {}

  /**
   * Returns the room left around the card for its shadow, in whole texels,
   * which a deck drawn at any scale would otherwise make fractional.
   */
  private shadowPadding(): { x: number; y: number } {
    const padding = PhaserCardFactory.CARD_SHADOW_PADDING;
    const artScale = this.artScale();
    return {
      x: Math.round(padding.x * artScale),
      y: Math.round(padding.y * artScale),
    };
  }

  /** Creates an interactive card sprite. */
  createCardSprite(): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      this.textureKey(),
      this.cardBackStyle(),
    );
    sprite.setOrigin(0, 0);
    sprite.setVertexRoundMode(PhaserCardFactory.VERTEX_ROUND_MODE);
    sprite.setInteractive({ useHandCursor: true });

    return sprite;
  }

  /**
   * Draws the shadow a card casts into the texture every card's shadow sprite
   * shares, redrawing it if it has been drawn before.
   *
   * Drawn once rather than filtered on every card, because a filter renders
   * its card through framebuffers of its own every frame, which a phone's GPU
   * cannot keep up with. Drawn again, resized, when the atlas changes density,
   * after which each shadow sprite needs {@link fitCardShadow}.
   */
  bakeCardShadow(): void {
    const padding = this.shadowPadding();
    const caster = this.makeCardOutline();
    const outline = this.makeCardOutline();
    const shadow = PhaserCardFactory.CARD_SHADOW;
    caster.enableFilters();
    caster.filters?.internal
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

    const texture = this.shadowTextureSized(
      caster.width + 2 * padding.x,
      caster.height + 2 * padding.y,
    );
    // Cut the card back out, leaving only the shadow it throws, so the back
    // cannot show through the antialiased edge of the card drawn over it.
    texture?.clear().draw(caster).erase(outline).render();

    caster.destroy();
    outline.destroy();
  }

  /**
   * Creates the sprite that draws a card's shadow, to be placed and scaled
   * exactly as its card is.
   */
  createCardShadow(): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(
      0,
      0,
      PhaserCardFactory.SHADOW_TEXTURE_KEY,
    );
    // Rounded as its card is, so the edge cut out of it stays under the card's.
    sprite.setVertexRoundMode(PhaserCardFactory.VERTEX_ROUND_MODE);
    this.fitCardShadow(sprite);
    return sprite;
  }

  /**
   * Fits a shadow sprite to the shadow as last drawn, which changes size with
   * the atlas's density.
   */
  fitCardShadow(sprite: Phaser.GameObjects.Sprite): void {
    const padding = this.shadowPadding();
    // Taking the texture again resizes the sprite to its frame.
    sprite.setTexture(PhaserCardFactory.SHADOW_TEXTURE_KEY);
    // Anchored at the card's corner rather than its own, so it lines up with a
    // card sprite given the same position.
    sprite.setDisplayOrigin(padding.x, padding.y);
  }

  /**
   * Returns a card back outside the display list, at the corner of the shadow
   * texture, for drawing the shadow from.
   */
  private makeCardOutline(): Phaser.GameObjects.Sprite {
    const padding = this.shadowPadding();
    const sprite = this.scene.make.sprite(
      { key: this.textureKey(), frame: this.cardBackStyle() },
      false,
    );
    sprite.setOrigin(0, 0);
    sprite.setPosition(padding.x, padding.y);
    return sprite;
  }

  /**
   * Returns the texture the shadow is drawn into at the given size, creating
   * it the first time and resizing it in place after that, so the sprites
   * drawing from it keep it.
   */
  private shadowTextureSized(
    width: number,
    height: number,
  ): Phaser.Textures.DynamicTexture | null {
    // Phaser leaves a texture already this size alone.
    if (this.shadowTexture) return this.shadowTexture.setSize(width, height);

    const textures = this.scene.textures;
    // Left by an earlier run of the scene, whose shadow sprites went with it.
    if (textures.exists(PhaserCardFactory.SHADOW_TEXTURE_KEY)) {
      textures.remove(PhaserCardFactory.SHADOW_TEXTURE_KEY);
    }
    this.shadowTexture = textures.addDynamicTexture(
      PhaserCardFactory.SHADOW_TEXTURE_KEY,
      width,
      height,
    );
    return this.shadowTexture;
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
    sprite.setVertexRoundMode(PhaserCardFactory.VERTEX_ROUND_MODE);
    sprite.setAlpha(alpha);
    if (interactive) {
      sprite.setInteractive({ useHandCursor: true });
    }
    return sprite;
  }
}
