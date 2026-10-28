import type { Scene } from "phaser";
import type { SoundName } from "../view/effects";
import spritemap from "./sounds/sounds.json";
import spriteUrl from "./sounds/sounds.wav?url";

/** The sounds' key in Phaser's caches. */
export const SOUNDS_KEY = "snake-sounds";

/**
 * Plays the board's sounds from their sprite, once it has loaded, while the
 * player wants sound.
 *
 * The sprite loads after the board has drawn, so the board never waits for
 * it, and a sprite that fails to load leaves the game silent, not broken.
 * Phaser keeps the sound locked until the player's first key or tap, which
 * is also what starts a run.
 */
export class SoundPlayer {
  /** Whether the player wanted sound when last asked, or null before. */
  private wanted: boolean | null = null;

  constructor(private readonly scene: Scene) {
    // The map itself where the typings say a URL, which Phaser reads as the
    // map, so it ships in this chunk rather than as a file of its own.
    scene.load.audioSprite(
      SOUNDS_KEY,
      spritemap as unknown as string,
      spriteUrl,
    );
    scene.load.start();
  }

  /** Whether the sprite has loaded, so a sound can be played. */
  get loaded(): boolean {
    return this.scene.cache.audio.exists(SOUNDS_KEY);
  }

  /** Mutes the board, or lets it be heard, as the player wants. */
  follow(wanted: boolean): void {
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    this.scene.sound.mute = !wanted;
  }

  /** Plays a sound, if the sprite has loaded and the player wants sound. */
  play(name: SoundName): void {
    if (this.wanted && this.loaded) {
      this.scene.sound.playAudioSprite(SOUNDS_KEY, name);
    }
  }
}
