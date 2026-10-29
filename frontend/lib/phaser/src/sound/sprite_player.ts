import type { Scene, Types } from "phaser";

/** Describes a sound sprite: one file of sounds, and where each lies in it. */
export interface SoundSprite {
  /** Names the sprite in Phaser's caches. */
  readonly key: string;
  /** The spritemap Phaser plays it by, as `@fz/dev/sounds` writes it. */
  readonly spritemap: object;
  /** The file's URL, as the bundler gives it. */
  readonly url: string;
}

/**
 * Plays the sounds of a sprite, once it has loaded, while the player wants
 * sound.
 *
 * The sprite loads after the scene has drawn, so the scene never waits for
 * it, and a sprite that fails to load leaves the game silent, not broken.
 * Phaser keeps the sound locked until the player's first key or tap, which
 * in a game here is also what starts play.
 */
export class SpritePlayer<Name extends string = string> {
  /** Whether the player wanted sound when last asked, or null before. */
  private wanted: boolean | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly sprite: SoundSprite,
  ) {
    // The map itself where the typings say a URL, which Phaser reads as the
    // map, so it ships in the scene's chunk rather than as a file of its own.
    scene.load.audioSprite(
      sprite.key,
      sprite.spritemap as unknown as string,
      sprite.url,
    );
    scene.load.start();
  }

  /** Whether the sprite has loaded, so a sound can be played. */
  get loaded(): boolean {
    return this.scene.cache.audio.exists(this.sprite.key);
  }

  /** Mutes the scene, or lets it be heard, as the player wants. */
  follow(wanted: boolean): void {
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    this.scene.sound.mute = !wanted;
  }

  /**
   * Plays a sound, if the sprite has loaded and the player wants sound, with
   * a config such as a `detune` in cents.
   */
  play(name: Name, config?: Types.Sound.SoundConfig): void {
    if (this.wanted && this.loaded) {
      this.scene.sound.playAudioSprite(this.sprite.key, name, config);
    }
  }
}
