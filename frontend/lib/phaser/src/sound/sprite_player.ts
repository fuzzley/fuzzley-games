import { type Scene, Sound, type Types } from "phaser";
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
 * The most plays of one sound of a sprite that sound at once: one more
 * starts the one that started longest ago over.
 */
export const MOST_AT_ONCE = 4;

/** Describes a sound made once to play one sound of a sprite, again and again. */
interface Pooled {
  readonly sound: Sound.BaseSound;
  /**
   * What its marker's config held as it was made, put back before each
   * play: Phaser writes a play's config into its marker's, so a play then
   * starts from the marker's own, as on a sound just made. It holds every
   * key Phaser gives a marker's config; a spatial `source` a play is given
   * stays with the marker.
   */
  readonly marked: Types.Sound.SoundConfig;
  /** When it last started, as the count of the player's plays then. */
  started: number;
}

/** Returns whether a sound of a pool is free to play: neither playing nor paused. */
function isFree({ sound }: Pooled): boolean {
  return !sound.isPlaying && !sound.isPaused;
}

/** Returns whether a sound of a pool was destroyed, by the player or another. */
function isGone({ sound }: Pooled): boolean {
  return sound.pendingRemove;
}

/** Returns whether a sound of a pool is still the game's to play. */
function isKept(pooled: Pooled): boolean {
  return !isGone(pooled);
}

/** Returns the one of two sounds of a pool that started first. */
function earlier(first: Pooled, second: Pooled): Pooled {
  return second.started < first.started ? second : first;
}

/**
 * Plays the sounds of a sprite, once it has loaded, while the player wants
 * sound.
 *
 * Make it in a scene's `create()`, so the scene never waits for the sprite;
 * a sprite that fails to load leaves the game silent, not broken. Phaser
 * keeps the sound locked until the player's first key or tap, which in a
 * game here is also what starts play.
 *
 * Each sound plays on a sound object made once and played again, rather
 * than one Phaser makes for each play: as many of a sound as play at once,
 * up to `MOST_AT_ONCE`, each made as plays first overlap that far, so a
 * frame's plays make no sound object once the game has played a while.
 */
export class SpritePlayer<Name extends string> {
  /** Whether the player wanted sound when last asked, or null before. */
  private wanted: boolean | null = null;

  /** The sounds held, each looping until it is let go, by name. */
  private readonly heldSounds = new Map<Name, Sound.BaseSound>();

  /** How a risen sound is played, made once and changed for each: Phaser copies it as the sound starts. */
  private readonly risen: Types.Sound.SoundConfig = { detune: 0 };

  /** The sounds made to play each sound of the sprite on, by name. */
  private readonly pools = new Map<Name, Pooled[]>();

  /** How many sounds the player has played, which orders when each started. */
  private plays = 0;

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
    // A held sound, and a sound made for plays, belongs to the game's sound
    // manager, which outlives the scene, so a held one would loop on after
    // it, and those made for plays would stay.
    whenSceneEnds(scene, () => {
      this.letGoOfAll();
      this.letGoOfPools();
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
   * a config such as a `detune` in cents, which holds for that play alone.
   */
  play(name: Name, config?: Types.Sound.SoundConfig): void {
    if (!this.wanted || !this.loaded) return;
    const pooled = this.pooledFor(name);
    pooled.started = ++this.plays;
    const { sound, marked } = pooled;
    const marker = sound.markers[name];
    if (marker?.config) Object.assign(marker.config, marked);
    sound.play(name, config);
  }

  /**
   * Plays a sound risen by some cents, through `play()`.
   *
   * It is a function made once, so a scene hands it to
   * `FrameSounds.playEach()` each frame making no function or config of its
   * own.
   */
  readonly playRisen = (name: Name, detune: number): void => {
    this.risen.detune = detune;
    this.play(name, this.risen);
  };

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

  /**
   * Returns a sound of a sound's pool to play it on: one free, or, while
   * fewer than `MOST_AT_ONCE` play, one made for it, or else the one that
   * started longest ago.
   */
  private pooledFor(name: Name): Pooled {
    let pool = this.pools.get(name);
    // One destroyed by another, as the sound manager's `removeAll()`
    // destroys each, is dropped, the pool made anew only then.
    if (pool === undefined || pool.some(isGone)) {
      pool = pool === undefined ? [] : pool.filter(isKept);
      this.pools.set(name, pool);
    }
    const free = pool.find(isFree);
    if (free !== undefined) return free;
    if (pool.length < MOST_AT_ONCE) {
      const sound = this.scene.sound.addAudioSprite(this.sprite.key);
      const made = {
        sound,
        marked: { ...sound.markers[name]?.config },
        started: 0,
      };
      pool.push(made);
      return made;
    }
    return pool.reduce(earlier);
  }

  /**
   * Lets go of the sounds made for plays: each at once where it is done,
   * neither playing nor paused, or else as it ends, as Phaser lets go of a
   * sound it plays by itself; a paused one, as HTML5 Audio pauses each
   * while the page is away, plays on once the page is back.
   */
  private letGoOfPools(): void {
    for (const pool of this.pools.values()) {
      for (const { sound } of pool) {
        if (sound.isPlaying || sound.isPaused) {
          sound.once(Sound.Events.COMPLETE, () => {
            sound.destroy();
          });
        } else {
          sound.destroy();
        }
      }
    }
    this.pools.clear();
  }
}
