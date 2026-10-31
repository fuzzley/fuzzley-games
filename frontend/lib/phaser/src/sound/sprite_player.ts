import type { Scene, Sound, Types } from "phaser";
import { whenSceneEnds } from "../scene";

/**
 * Describes a sound sprite: one file of sounds, and where each lies in it,
 * the names of its sounds taken from its spritemap.
 */
export interface SoundSprite<Name extends string> {
  /** Names the sprite in Phaser's caches. */
  readonly key: string;
  /** The spritemap Phaser plays it by, as `@fz/dev/sounds` writes it. */
  readonly spritemap: {
    readonly spritemap: Readonly<Record<Name, unknown>>;
  };
  /** The file's URL, as the bundler gives it. */
  readonly url: string;
}

/** How a held sound plays: on a loop, until it is let go. */
const LOOP: Types.Sound.SoundConfig = { loop: true };

/**
 * Plays the sounds of a sprite, once it has loaded, while the player wants
 * sound.
 *
 * Make it in a scene's `create()`, so the scene never waits for the sprite;
 * a sprite that fails to load leaves the game silent, not broken. Phaser
 * keeps the sound locked until the player's first key or tap, which in a
 * game here is also what starts play.
 */
export class SpritePlayer<Name extends string> {
  /** Whether the player wanted sound when last asked, or null before. */
  private wanted: boolean | null = null;

  /** The sounds held, each looping until it is let go, by name. */
  private readonly heldSounds = new Map<Name, Sound.BaseSound>();

  constructor(
    private readonly scene: Scene,
    private readonly sprite: SoundSprite<Name>,
  ) {
    // The map itself where the typings say a URL, which Phaser reads as the
    // map, so it ships in the scene's chunk rather than as a file of its own.
    scene.load.audioSprite(
      sprite.key,
      sprite.spritemap as unknown as string,
      sprite.url,
    );
    scene.load.start();
    // A held sound belongs to the game's sound manager, which outlives the
    // scene, so it would loop on after it.
    whenSceneEnds(scene, () => {
      this.letGoOfAll();
    });
  }

  /** Whether the sprite has loaded, so a sound can be played. */
  get loaded(): boolean {
    return this.scene.cache.audio.exists(this.sprite.key);
  }

  /**
   * Mutes the game's sound, or lets it be heard, as the player wants; every
   * scene a host shows shares it.
   */
  follow(wanted: boolean): void {
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    this.scene.sound.mute = !wanted;
    if (!wanted) this.letGoOfAll();
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

  /**
   * Loops a sound while it is held and stops it once it is let go, as a key
   * held down hums; a scene calls it each frame with whether it is held.
   *
   * A sound held starts once the sprite has loaded, while the player wants
   * sound, and stops as they turn sound off or the scene ends; held again
   * while it plays, it plays on as it was.
   */
  hold(name: Name, held: boolean): void {
    const sound = this.heldSounds.get(name);
    if (!held) {
      // Destroyed, it stops, and the game's sound manager drops it.
      sound?.destroy();
      this.heldSounds.delete(name);
      return;
    }
    if (sound || !this.wanted || !this.loaded) return;
    const looping = this.scene.sound.addAudioSprite(this.sprite.key);
    looping.play(name, LOOP);
    this.heldSounds.set(name, looping);
  }

  /** Stops every sound held. */
  private letGoOfAll(): void {
    for (const sound of this.heldSounds.values()) sound.destroy();
    this.heldSounds.clear();
  }
}
