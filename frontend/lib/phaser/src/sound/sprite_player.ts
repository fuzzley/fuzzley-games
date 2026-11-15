import { keysOf } from "@fz/core/records";
import {
  DUCK,
  type Duck,
  NO_TAKE,
  ROOM,
  type SoundLevel,
  type SoundMix,
  VOICES,
  type Voice,
  type VoiceLimits,
  duckedGainUnder,
  ducksOthers,
  isDucked,
  isVaried,
  nextTake,
  panOf,
  takeMarkers,
  variedDetune,
  variedGain,
  voiceGivingWay,
} from "@fz/core/sound_mix";
import { type Scene, Sound, type Types } from "phaser";
import { whenSceneEnds } from "../scene";
import { limitSound, playMono } from "./output";

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
  /**
   * The file's URL, as the bundler gives it, or its URLs in several
   * formats, of which Phaser's loader loads the first the browser plays.
   */
  readonly url: string | readonly string[];
}

/** Describes how a player mixes the sounds of its sprite. */
export interface SpriteMixing<Name extends string> {
  /** How each sound is mixed, by its name, from which its takes' names in the sprite are made. */
  readonly mix: SoundMix<Name>;
  /** Draws a number from 0 up to 1 for a play's variation; `Math.random` unless given. */
  readonly random?: () => number;
}

/** How a held sound plays: on a loop, until it is let go. */
const LOOP: Types.Sound.SoundConfig = { loop: true };

/**
 * The most plays of one sound of a sprite that sound at once: one more
 * starts the one that started longest ago over.
 */
export const MOST_AT_ONCE = 4;

/**
 * How many voices sound at once with no mix: as many of a sound as
 * `MOST_AT_ONCE`, however many of the others sound.
 */
const UNMIXED_VOICES: VoiceLimits = {
  sound: MOST_AT_ONCE,
  family: Number.POSITIVE_INFINITY,
  all: Number.POSITIVE_INFINITY,
};

/** The level every sound plays at with no mix, so of a sound's own voices the oldest gives way. */
const UNMIXED_LEVEL: SoundLevel = "medium";

/** Describes a play's config with every key Phaser gives a marker's, but a spatial source. */
type PlayConfig = Required<Omit<Types.Sound.SoundConfig, "source">>;

/**
 * What a play's marker's config holds before a mixed play's own is laid
 * over it, every key Phaser gives a marker's config, as Phaser sets them,
 * so no key of a play before is left in the config made once for each.
 */
const PLAIN_PLAY: PlayConfig = {
  mute: false,
  volume: 1,
  rate: 1,
  detune: 0,
  seek: 0,
  loop: false,
  delay: 0,
  pan: 0,
};

/**
 * How a play is ducked as it starts: as the mix ducks, but down from the
 * start, since a play's volume is set once as it starts and has no ramp
 * to smooth, so a busy play in a huge sound's own frame is ducked too.
 */
const DUCK_AT_START: Duck = { ...DUCK, attack: 0 };

/** Describes how a sound of the sprite plays, worked out once, and the take it played last. */
interface Played {
  /** Its takes' names in the sprite, in turn, one at least. */
  readonly markers: readonly string[];
  readonly family: string;
  readonly level: SoundLevel;
  /** Whether a play of it is varied. */
  readonly varied: boolean;
  /** Whether a play of it is ducked under one that ducks others. */
  readonly ducked: boolean;
  /** Whether a play of it ducks others. */
  readonly ducks: boolean;
  /** The take it played last, or `NO_TAKE`. */
  take: number;
}

/** Describes a sound made once to play one sound of a sprite, again and again: a voice while it sounds. */
interface Pooled extends Voice {
  readonly sound: Sound.BaseSound;
  /**
   * What each take's marker's config held as it was made, by take, put
   * back before each play: Phaser writes a play's config into its marker's,
   * so a play then starts from the marker's own, as on a sound just made.
   * It holds every key Phaser gives a marker's config; a spatial `source` a
   * play is given stays with the marker.
   */
  readonly marked: readonly Types.Sound.SoundConfig[];
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
 *
 * Handed a mix, it plays by `@fz/core/sound_mix`'s rules: each sound's
 * takes in turn, a busy noisy sound varied, a sound placed across the
 * field panned, the voices of a sound, of its family and in all held to
 * the mix's limits, the busy levels ducked under a huge sound, and the
 * game's sound through a limiter.
 */
export class SpritePlayer<Name extends string> {
  /** Whether the player wanted sound when last asked, or null before. */
  private wanted: boolean | null = null;

  /** The sounds held, each looping until it is let go, by name. */
  private readonly heldSounds = new Map<Name, Sound.BaseSound>();

  /** How a risen sound is played, made once and changed for each: Phaser copies it as the sound starts. */
  private readonly risen: Types.Sound.SoundConfig = { detune: 0 };

  /** How a sound played at a place is played, made once and changed for each, as `risen` is. */
  private readonly placed: Types.Sound.SoundConfig = { detune: 0, volume: 1 };

  /** How a mixed sound is played, made once and changed for each, as `risen` is. */
  private readonly mixed: PlayConfig & Types.Sound.SoundConfig = {
    ...PLAIN_PLAY,
  };

  /** The sounds made to play each sound of the sprite on, by name. */
  private readonly pools = new Map<Name, Pooled[]>();

  /** The sounds of the pools that sound, playing or paused, so the mix can hold them to its limits. */
  private readonly voices: Pooled[] = [];

  /** How each sound of the sprite plays, by name: a mix's, made at once, or one plain, made as it first plays. */
  private readonly playing = new Map<Name, Played>();

  /** How many sounds the player has played, which orders when each started. */
  private plays = 0;

  /** When the latest sound that ducks others started, on the scene's clock, in milliseconds. */
  private latestDuck = Number.NEGATIVE_INFINITY;

  /** When the one before it started, as `latestDuck`, so two ducks that overlap hold the levels down. */
  private earlierDuck = Number.NEGATIVE_INFINITY;

  /** The most voices that sound at once, of a sound, of a family and in all. */
  private readonly limits: VoiceLimits;

  /** Draws each play's variation. */
  private readonly random: () => number;

  /** Makes a player of a sprite whose sounds play as they are, each by its own name. */
  constructor(scene: Scene, sprite: SoundSprite<Name>);
  /**
   * Makes a player of a sprite whose sounds play by a mix, each named as
   * the mix names it, its takes in the sprite named after it, and puts a
   * limiter on the game's sound.
   *
   * @throws {RangeError} Where the sprite lacks a take the mix names.
   */
  constructor(
    scene: Scene,
    sprite: SoundSprite<string>,
    mixing: SpriteMixing<Name>,
  );
  constructor(
    private readonly scene: Scene,
    private readonly sprite: SoundSprite<string>,
    private readonly mixing?: SpriteMixing<Name>,
  ) {
    this.limits = mixing === undefined ? UNMIXED_VOICES : VOICES;
    this.random = mixing?.random ?? Math.random;
    if (mixing !== undefined) this.mixAll(mixing.mix);
    // The map itself where the typings say a URL, which Phaser reads as the
    // map, so it ships in the scene's chunk rather than as a file of its own.
    scene.load.audioSprite(
      sprite.key,
      sprite.spritemap as unknown as string,
      typeof sprite.url === "string" ? sprite.url : [...sprite.url],
    );
    scene.load.start();
    if (mixing !== undefined) limitSound(scene.sound);
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
   * Sums the game's two ears into one, as the player wants for one ear or
   * one speaker, or lets them be two; every scene a host shows shares it.
   * It does nothing where the game plays its sound other than through Web
   * Audio.
   */
  followMono(mono: boolean): void {
    playMono(this.scene.sound, mono);
  }

  /**
   * Plays a sound, if the sprite has loaded and the player wants sound, with
   * a config such as a `detune` in cents, which holds for that play alone.
   *
   * With a mix, the play is its sound's next take, its config's detune and
   * volume varied and ducked as the mix says, and panned by where it
   * happened across the field, from -1 at the left edge to 1 at the right,
   * where it is given; a play given no place keeps its config's pan, and
   * none is placed at a spatial `source`. A busy play is ducked only by a
   * huge one played before it, so a frame plays its huge sounds first.
   */
  play(name: Name, config?: Types.Sound.SoundConfig, across?: number): void {
    if (!this.wanted || !this.loaded) return;
    const played = this.playedOf(name);
    const take = nextTake(played.take, played.markers.length);
    played.take = take;
    const marker = played.markers[take] ?? name;
    const pooled = this.voiceFor(name, played);
    pooled.started = ++this.plays;
    const { sound, marked } = pooled;
    const own = sound.markers[marker];
    if (own?.config) Object.assign(own.config, marked[take]);
    sound.play(
      marker,
      this.mixing === undefined
        ? config
        : this.mixedPlay(played, marked[take], config, across),
    );
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
   * Plays a sound risen by some cents at a place across the field, from -1
   * at its left edge to 1 at its right, and at a volume, 1 as recorded,
   * through `play()`, which a mix pans it by and varies and ducks it from;
   * a function made once, as `playRisen()` is.
   */
  readonly playAt = (
    name: Name,
    detune: number,
    across: number,
    volume = 1,
  ): void => {
    this.placed.detune = detune;
    this.placed.volume = volume;
    this.play(name, this.placed, across);
  };

  /**
   * Loops a sound while it is held and stops it once it is let go, as a key
   * held down hums; a scene calls it each frame with whether it is held.
   *
   * A sound held starts once the sprite has loaded, while the player wants
   * sound, and stops as they turn sound off or the scene ends; held again
   * while it plays, it plays on as it was. With a mix, it loops its first
   * take, neither varied nor ducked, and counts among no voices.
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
    looping.play(this.playedOf(name).markers[0] ?? name, LOOP);
    this.heldSounds.set(name, looping);
  }

  /** Works out how each sound of a mix plays, and checks the sprite holds every take it names. */
  private mixAll(mix: SoundMix<Name>): void {
    const { spritemap } = this.sprite.spritemap;
    for (const name of keysOf(mix)) {
      const { family, level, takes, tuned } = mix[name];
      const markers = takeMarkers(name, takes);
      if (markers.length === 0) {
        throw new RangeError(`The mix's ${name} has no takes.`);
      }
      const missing = markers.find(
        (marker) => !Object.hasOwn(spritemap, marker),
      );
      if (missing !== undefined) {
        throw new RangeError(
          `The sprite ${this.sprite.key} has no take ${missing} of the mix's ${name}.`,
        );
      }
      this.playing.set(name, {
        markers,
        family,
        level,
        varied: isVaried({ level, tuned }),
        ducked: isDucked(level),
        ducks: ducksOthers(level),
        take: NO_TAKE,
      });
    }
  }

  /** Returns how a sound plays: the mix's, or, for a player with none, one plain, made as it first plays. */
  private playedOf(name: Name): Played {
    let played = this.playing.get(name);
    if (played === undefined) {
      played = {
        markers: [name],
        family: name,
        level: UNMIXED_LEVEL,
        varied: false,
        ducked: false,
        ducks: false,
        take: NO_TAKE,
      };
      this.playing.set(name, played);
    }
    return played;
  }

  /**
   * Returns the config a mixed play starts with, in the config made once
   * for each: its marker's own, then the play's, its detune and volume
   * varied where the mix varies it, its volume ducked where a sound that
   * ducks others started a moment ago, and its pan by its place, where it
   * has one; a play that ducks others marks when it did.
   */
  private mixedPlay(
    played: Played,
    marked: Types.Sound.SoundConfig | undefined,
    config: Types.Sound.SoundConfig | undefined,
    across: number | undefined,
  ): Types.Sound.SoundConfig {
    const mixed = Object.assign(this.mixed, PLAIN_PLAY, marked, config);
    // A mix places a play by its pan, never at a spatial source, which
    // would stay for the plays after it.
    delete mixed.source;
    const now = this.scene.time.now;
    if (played.varied) {
      mixed.detune += variedDetune(this.random);
      mixed.volume *= variedGain(this.random);
    }
    if (played.ducked) {
      mixed.volume *= duckedGainUnder(
        (now - this.latestDuck) / 1000,
        (now - this.earlierDuck) / 1000,
        DUCK_AT_START,
      );
    }
    if (across !== undefined) mixed.pan = panOf(across);
    if (played.ducks) {
      this.earlierDuck = this.latestDuck;
      this.latestDuck = now;
    }
    return mixed;
  }

  /** Stops every sound held. */
  private letGoOfAll(): void {
    for (const sound of this.heldSounds.values()) sound.destroy();
    this.heldSounds.clear();
  }

  /**
   * Returns a sound of a sound's pool to play it on, making room for it
   * among the voices that sound: where the mix's rules have a voice of the
   * same sound give way, that one, started over; where they have one of
   * another sound give way, that one stopped, and then a sound of the pool
   * that is free, or one made for it.
   */
  private voiceFor(name: Name, played: Played): Pooled {
    this.dropVoicesDone();
    const giving = voiceGivingWay(
      this.voices,
      name,
      played.family,
      this.limits,
    );
    const voice = this.voices[giving];
    if (giving !== ROOM && voice !== undefined) {
      if (voice.name === name) return voice;
      voice.sound.stop();
      this.dropVoiceAt(giving);
    }
    const pool = this.poolOf(name);
    const free = pool.find(isFree) ?? this.madeFor(name, played, pool);
    this.voices.push(free);
    return free;
  }

  /** Returns a sound's pool, its sounds destroyed by another dropped. */
  private poolOf(name: Name): Pooled[] {
    let pool = this.pools.get(name);
    // One destroyed by another, as the sound manager's `removeAll()`
    // destroys each, is dropped, the pool made anew only then.
    if (pool === undefined || pool.some(isGone)) {
      pool = pool === undefined ? [] : pool.filter(isKept);
      this.pools.set(name, pool);
    }
    return pool;
  }

  /** Makes a sound to play a sound on, in its pool. */
  private madeFor(name: Name, played: Played, pool: Pooled[]): Pooled {
    const sound = this.scene.sound.addAudioSprite(this.sprite.key);
    const made: Pooled = {
      sound,
      marked: played.markers.map((marker) => ({
        ...sound.markers[marker]?.config,
      })),
      name,
      family: played.family,
      level: played.level,
      started: 0,
    };
    pool.push(made);
    return made;
  }

  /** Drops from the voices each that has done, neither playing nor paused, or was destroyed, keeping the rest in place. */
  private dropVoicesDone(): void {
    const { voices } = this;
    let kept = 0;
    for (const voice of voices) {
      if (isFree(voice) || isGone(voice)) continue;
      voices[kept++] = voice;
    }
    voices.length = kept;
  }

  /** Drops a voice from the voices, by its index, those after it moving up, making nothing. */
  private dropVoiceAt(at: number): void {
    this.voices.copyWithin(at, at + 1);
    this.voices.pop();
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
    this.voices.length = 0;
  }
}
