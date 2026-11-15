import { keysOf, recordOf } from "@fz/core/records";
import {
  FADE_SECONDS,
  fadeGain,
  fadedShare,
  loopPhase,
} from "@fz/core/sound_mix";
import { type Scene, Scenes } from "phaser";
import { whenSceneEnds } from "../scene";
import { soundTime } from "./output";

/** Describes a looped layer of sound, such as a bed or a layer over one. */
export interface SoundLayer {
  /** Names its file in Phaser's caches. */
  readonly key: string;
  /**
   * Its file's URL, as the bundler gives it, or its URLs in several
   * formats, of which Phaser's loader loads the first the browser plays.
   */
  readonly url: string | readonly string[];
  /** How loud it plays once faded all the way in, from 0 to 1; 1 unless given. */
  readonly volume?: number;
}

/** Names a sound as a scene's sound manager makes one, whichever plays. */
type ManagedSound = ReturnType<Scene["sound"]["add"]>;

/**
 * How far ahead of now a layer is started, in seconds: Web Audio starts a
 * sound due in the past as soon as it can, from the place it was told, so
 * one due now would start a little late, off the bar line.
 */
const START_LEAD_SECONDS = 0.05;

/** Describes a layer as it plays: whether a scene holds it, how far it has faded in, and its sound while it plays. */
interface Looping {
  readonly key: string;
  /** Its file's URL, or its URLs in several formats, as the loader takes them. */
  readonly url: string | string[];
  readonly volume: number;
  held: boolean;
  /** Whether a scene asked for its file ahead of holding it. */
  wanted: boolean;
  /** Whether its file has been asked of the loader. */
  requested: boolean;
  /** How far it has faded in, from 0 to 1. */
  share: number;
  /** Its sound, from the frame it starts until it has faded out. */
  sound: ManagedSound | null;
}

/** Returns a layer as it plays, before a scene has held it. */
function loopingOf({ key, url, volume = 1 }: SoundLayer): Looping {
  return {
    key,
    url: typeof url === "string" ? url : [...url],
    volume,
    held: false,
    wanted: false,
    requested: false,
    share: 0,
    sound: null,
  };
}

/** Returns whether a layer plays, on a sound no one has destroyed. */
function isPlaying({ sound }: Looping): boolean {
  return sound !== null && !sound.pendingRemove;
}

/**
 * Plays looped layers of sound, such as a sector's bed and the layers that
 * join it, each while a scene holds it, all on one bar line, each faded in
 * and out by its volume.
 *
 * Make it in a scene's `create()`; it asks for a layer's file the first
 * time a scene holds it, or asks it to `fetch()` it, so a bed is fetched,
 * and kept decoded, only once it is wanted, and starts the layer once the
 * file has loaded. The first layer to start sets the bar line, and each
 * started while another plays starts as far into its loop as the time
 * since then says, so layers whose lengths divide one another keep in
 * step. A layer let go fades out and stops; held again, it fades back in
 * from where it stands. Two let go and held in one frame, as a bed for
 * another, cross at one loudness where the one held has loaded; one still
 * loading starts once it has, the one let go fading meanwhile. The bar line
 * and the fades keep the sound's own clock, which stands still while the
 * browser holds the sound back, before the player's first touch or while
 * the window is away. It has no switch of its own for sound off: a layer
 * held loops on under the game's mute, so a scene that wants no bed holds
 * none.
 */
export class LayerPlayer<Name extends string> {
  /** Each layer as it plays, by name. */
  private readonly byName: Readonly<Record<Name, Looping>>;

  /** The same layers, in the order they were given, for each frame's round of them. */
  private readonly layers: readonly Looping[];

  /** When the layers playing started their bar line, in the sound's own seconds. */
  private barLine = 0;

  /** The sound's own time at the last step, in seconds, from which the next moves each fade on. */
  private lastStep: number;

  constructor(
    private readonly scene: Scene,
    layers: Readonly<Record<Name, SoundLayer>>,
    private readonly fadeSeconds: number = FADE_SECONDS,
  ) {
    this.byName = recordOf(keysOf(layers), (name) => loopingOf(layers[name]));
    this.layers = Object.values(this.byName);
    this.lastStep = this.soundNow();
    scene.events.on(Scenes.Events.POST_UPDATE, this.step);
    // A layer's sound belongs to the game's sound manager, which outlives
    // the scene, so it would loop on after it.
    whenSceneEnds(scene, () => {
      scene.events.off(Scenes.Events.POST_UPDATE, this.step);
      for (const layer of this.layers) this.stop(layer);
    });
  }

  /**
   * Holds a layer, or lets it go; a scene calls it each frame for each
   * layer with whether it wants it, and the layer fades toward it after
   * the scene's update.
   */
  hold(name: Name, held: boolean): void {
    this.byName[name].held = held;
  }

  /**
   * Asks for a layer's file ahead of the first time a scene holds it, as
   * the next sector's bed is, so it can cross in as soon as it is held.
   */
  fetch(name: Name): void {
    this.byName[name].wanted = true;
  }

  /**
   * Moves each layer on by the time the sound's clock has kept since the
   * last step: its file asked for where it is held or fetched, started
   * where it is held and loaded, faded toward what it is held to, and
   * stopped once faded out.
   */
  private readonly step = (): void => {
    const now = this.soundNow();
    const seconds = now - this.lastStep;
    this.lastStep = now;
    for (const layer of this.layers) {
      // One destroyed by another, as the sound manager's `removeAll()`
      // destroys each, is let go of, and started again while it is held.
      if (layer.sound?.pendingRemove === true) this.stop(layer);
      if (!layer.requested && (layer.held || layer.wanted)) this.load(layer);
      const sound = layer.sound ?? this.started(layer, now);
      if (sound === null) continue;
      const share = fadedShare(
        layer.share,
        layer.held ? 1 : 0,
        seconds,
        this.fadeSeconds,
      );
      if (share === 0 && !layer.held) {
        this.stop(layer);
      } else if (share !== layer.share) {
        layer.share = share;
        sound.volume = layer.volume * fadeGain(share);
      }
    }
  };

  /**
   * Starts a layer held whose file has loaded, silent, at its place on the
   * bar line, setting the bar line where no layer plays, and returns its
   * sound, or null for one not started.
   */
  private started(layer: Looping, now: number): ManagedSound | null {
    if (!layer.held || !this.scene.cache.audio.exists(layer.key)) return null;
    const startsAt = now + START_LEAD_SECONDS;
    if (!this.anyPlaying()) this.barLine = startsAt;
    const sound = this.scene.sound.add(layer.key);
    sound.play({
      loop: true,
      volume: 0,
      delay: START_LEAD_SECONDS,
      seek: loopPhase(startsAt - this.barLine, sound.totalDuration),
    });
    layer.sound = sound;
    layer.share = 0;
    return sound;
  }

  /**
   * Asks the scene's loader for a layer's file, unless it is in the cache
   * already: once, so one that fails to load leaves the layer silent.
   */
  private load(layer: Looping): void {
    layer.requested = true;
    if (this.scene.cache.audio.exists(layer.key)) return;
    this.scene.load.audio(layer.key, layer.url);
    this.scene.load.start();
  }

  /** Stops a layer's sound and lets go of it. */
  private stop(layer: Looping): void {
    layer.sound?.destroy();
    layer.sound = null;
    layer.share = 0;
  }

  /** Returns the sound's own time, in seconds. */
  private soundNow(): number {
    return soundTime(this.scene.sound, this.scene.time.now);
  }

  /** Returns whether any layer plays. */
  private anyPlaying(): boolean {
    return this.layers.some(isPlaying);
  }
}
