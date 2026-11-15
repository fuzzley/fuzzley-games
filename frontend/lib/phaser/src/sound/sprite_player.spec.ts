import { type SoundMix, gainOf } from "@fz/core/sound_mix";
import { type Scene, Sound, type Types } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, cacheSounds, runBareScene } from "../testing";
import { limitSound, playMono } from "./output";
import { MOST_AT_ONCE, type SoundSprite, SpritePlayer } from "./sprite_player";

// The headless game plays through no Web Audio, so what a player asks of
// its output is watched as it asks; output.spec.ts holds what each does.
vi.mock("./output", { spy: true });

/** A sprite of two sounds. */
const SPRITE: SoundSprite<"ping" | "pong"> = {
  key: "test-sounds",
  spritemap: {
    spritemap: {
      ping: { start: 0, end: 0.1, loop: false },
      pong: { start: 0.2, end: 0.3, loop: false },
    },
  },
  url: "sounds.wav",
};

describe("SpritePlayer", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene, to make a player in. */
  async function startScene(): Promise<Scene> {
    run = await runBareScene();
    return run.scene;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    run?.destroy();
    run = null;
  });

  // The headless game loads and plays no audio, so these watch the calls
  // themselves: there is no state to read.
  it("asks Phaser to load the sprite, its map given as the map", async () => {
    const scene = await startScene();
    const load = vi.spyOn(scene.load, "audioSprite");

    new SpritePlayer(scene, SPRITE);

    expect(load).toHaveBeenCalledWith(SPRITE.key, SPRITE.spritemap, SPRITE.url);
  });

  it("asks Phaser to load the sprite in each of its formats, in the order given", async () => {
    const scene = await startScene();
    const load = vi.spyOn(scene.load, "audioSprite");

    new SpritePlayer(scene, { ...SPRITE, url: ["sounds.ogg", "sounds.m4a"] });

    expect(load).toHaveBeenCalledWith(SPRITE.key, SPRITE.spritemap, [
      "sounds.ogg",
      "sounds.m4a",
    ]);
  });

  it("sums the game's ears into one as the player asks", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    vi.mocked(playMono).mockClear();

    player.followMono(true);

    expect(playMono).toHaveBeenCalledExactlyOnceWith(scene.sound, true);
  });

  it("puts no limiter on the game's sound without a mix", async () => {
    const scene = await startScene();
    vi.mocked(limitSound).mockClear();

    new SpritePlayer(scene, SPRITE);

    expect(limitSound).not.toHaveBeenCalled();
  });

  it("plays a sound of the sprite, with its config", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSounds(scene, SPRITE.key);
    player.follow(true);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.play("pong", { detune: 200 });

    expect(play).toHaveBeenCalledWith("pong", { detune: 200 });
  });

  it("plays a sound risen by some cents, for a frame's sounds", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSounds(scene, SPRITE.key);
    player.follow(true);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");
    const { playRisen } = player;

    playRisen("ping", 300);

    expect(play).toHaveBeenCalledWith("ping", { detune: 300 });
  });

  it("plays nothing risen while the player wants no sound", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSounds(scene, SPRITE.key);
    player.follow(false);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.playRisen("ping", 300);

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing before the sprite is in the cache", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    player.follow(true);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing while the player wants no sound", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSounds(scene, SPRITE.key);
    player.follow(false);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing before the player has been asked", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSounds(scene, SPRITE.key);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("isn't loaded before the sprite is in the cache", async () => {
    const scene = await startScene();

    const player = new SpritePlayer(scene, SPRITE);

    expect(player.loaded).toBe(false);
  });

  it("is loaded once the sprite is in the cache", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);

    cacheSounds(scene, SPRITE.key);

    expect(player.loaded).toBe(true);
  });

  it("lets the game be heard while the player wants sound", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    scene.sound.mute = true;

    player.follow(true);

    expect(scene.sound.mute).toBe(false);
  });

  it("mutes the game while the player wants none", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);

    player.follow(false);

    expect(scene.sound.mute).toBe(true);
  });

  it("leaves the mute alone until the player's wish changes", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    player.follow(true);
    scene.sound.mute = true;

    player.follow(true);

    expect(scene.sound.mute).toBe(true);
  });
});

describe("SpritePlayer's sounds made once", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene with a player of the sprite, loaded and wanted. */
  async function startPlayer(): Promise<{
    scene: Scene;
    player: SpritePlayer<"ping" | "pong">;
  }> {
    run = await runBareScene();
    const player = new SpritePlayer(run.scene, SPRITE);
    cacheSounds(run.scene, SPRITE.key);
    player.follow(true);
    return { scene: run.scene, player };
  }

  /**
   * Has each sound the game plays play on until a spec says it is done, as
   * one does where audio plays, and returns the sounds each play started,
   * in turn.
   */
  function playOn(): Sound.BaseSound[] {
    const started: Sound.BaseSound[] = [];
    vi.spyOn(Sound.NoAudioSound.prototype, "play").mockImplementation(function (
      this: Sound.NoAudioSound,
    ) {
      Object.assign(this, { isPlaying: true });
      started.push(this);
      return true;
    });
    return started;
  }

  /** Has a sound done playing, as one that ends is. */
  function end(sound: Sound.BaseSound | undefined): void {
    Object.assign(sound ?? {}, { isPlaying: false });
  }

  afterEach(() => {
    vi.restoreAllMocks();
    run?.destroy();
    run = null;
  });

  it("plays a sound again on the one it made, once that is done", async () => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    const made = vi.spyOn(scene.sound, "addAudioSprite");
    player.play("ping");
    end(started[0]);

    player.play("ping");

    expect({
      made: made.mock.calls.length,
      again: started[1] === started[0],
    }).toEqual({ made: 1, again: true });
  });

  it("makes another for each play of a sound over itself, as many as play at once", async () => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    const made = vi.spyOn(scene.sound, "addAudioSprite");

    for (let play = 0; play < MOST_AT_ONCE; play++) player.play("ping");

    expect({
      made: made.mock.calls.length,
      apart: new Set(started).size,
    }).toEqual({ made: MOST_AT_ONCE, apart: MOST_AT_ONCE });
  });

  it("starts the one that started longest ago over, once as many play at once as may", async () => {
    const { player } = await startPlayer();
    const started = playOn();
    for (let play = 0; play < MOST_AT_ONCE; play++) player.play("ping");

    player.play("ping");
    player.play("ping");

    // The same sounds, not ones alike.
    expect({
      first: started[MOST_AT_ONCE] === started[0],
      second: started[MOST_AT_ONCE + 1] === started[1],
    }).toEqual({ first: true, second: true });
  });

  it("plays a sound on one done before it makes another", async () => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    player.play("ping");
    player.play("ping");
    end(started[1]);
    const made = vi.spyOn(scene.sound, "addAudioSprite");

    player.play("ping");

    expect({
      made: made.mock.calls.length,
      onDone: started[2] === started[1],
    }).toEqual({ made: 0, onDone: true });
  });

  it("leaves a sound paused be, and plays on another", async () => {
    const { player } = await startPlayer();
    const started = playOn();
    player.play("ping");
    Object.assign(started[0] ?? {}, { isPlaying: false, isPaused: true });

    player.play("ping");

    expect(started[1]).not.toBe(started[0]);
  });

  it("plays each sound on its own", async () => {
    const { player } = await startPlayer();
    const started = playOn();

    player.play("ping");
    end(started[0]);
    player.play("pong");

    expect(started[1]).not.toBe(started[0]);
  });

  it("starts each play from its sound's own config, whatever the last play's was", async () => {
    const { scene, player } = await startPlayer();
    const configs = markSounds(scene);

    player.play("ping", { detune: 300, volume: 0.5 });
    player.play("ping");

    expect(configs).toEqual([
      { detune: 300, volume: 0.5, loop: false },
      { detune: 0, volume: 1, loop: false },
    ]);
  });

  it("starts each play from the loop its marker takes from the spritemap", async () => {
    const { scene, player } = await startPlayer();
    const configs = markSounds(scene);

    player.play("pong", { loop: false });
    player.play("pong");

    expect(configs.map(({ loop }) => loop)).toEqual([false, true]);
  });

  it("plays on a new sound where another destroyed the one it made", async () => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    player.play("ping");
    end(started[0]);
    scene.sound.removeAll();

    player.play("ping");

    expect({
      played: started.length,
      anew: started[1] !== started[0],
    }).toEqual({ played: 2, anew: true });
  });

  it("lets go of a sound it made that is done as the scene ends", async () => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    player.play("ping");
    end(started[0]);

    scene.game.scene.stop(scene.scene.key);

    expect(started[0]?.pendingRemove).toBe(true);
  });

  it.each<[string, Partial<Sound.BaseSound>]>([
    ["playing", {}],
    ["paused", { isPlaying: false, isPaused: true }],
  ])("keeps a sound it made that is %s as the scene ends", async (_, state) => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    player.play("ping");
    Object.assign(started[0] ?? {}, state);

    scene.game.scene.stop(scene.scene.key);

    expect(started[0]?.pendingRemove).toBe(false);
  });

  it("lets go of a sound it made that rang on past the scene's end, once it ends", async () => {
    const { scene, player } = await startPlayer();
    const started = playOn();
    player.play("ping");
    scene.game.scene.stop(scene.scene.key);

    started[0]?.emit(Sound.Events.COMPLETE);

    expect(started[0]?.pendingRemove).toBe(true);
  });
});

/** The markers' configs of the sprite of two sounds: pong's loops, as a sound held does. */
const PING_PONG: Readonly<Record<string, Types.Sound.SoundConfig>> = {
  ping: { detune: 0, volume: 1, loop: false },
  pong: { detune: 0, volume: 1, loop: true },
};

/**
 * Has the sounds the game makes of the sprite hold a marker for each of
 * its sounds, as Phaser's do where audio plays, and has a play write its
 * config into its marker's, as Phaser's does; returns the config each play
 * started with, in turn.
 */
function markSounds(
  scene: Scene,
  markers: Readonly<Record<string, Types.Sound.SoundConfig>> = PING_PONG,
): Types.Sound.SoundConfig[] {
  const configs: Types.Sound.SoundConfig[] = [];
  const add = scene.sound.addAudioSprite.bind(scene.sound);
  vi.spyOn(scene.sound, "addAudioSprite").mockImplementation((key) => {
    const sound = add(key);
    for (const [name, config] of Object.entries(markers)) {
      sound.markers[name] = { name, config: { ...config } };
    }
    return sound;
  });
  vi.spyOn(Sound.NoAudioSound.prototype, "play").mockImplementation(function (
    this: Sound.NoAudioSound,
    name,
    config,
  ) {
    const marker = typeof name === "string" ? this.markers[name] : undefined;
    const own = Object.assign(marker?.config ?? {}, config);
    configs.push({ ...own });
    return true;
  });
  return configs;
}

describe("SpritePlayer's held sounds", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene with a player of the sprite, loaded and wanted. */
  async function startPlayer(): Promise<{
    scene: Scene;
    player: SpritePlayer<"ping" | "pong">;
  }> {
    run = await runBareScene();
    const player = new SpritePlayer(run.scene, SPRITE);
    cacheSounds(run.scene, SPRITE.key);
    player.follow(true);
    return { scene: run.scene, player };
  }

  /** Returns how many of the sprite's sounds the game holds, not yet let go. */
  function heldIn(scene: Scene): number {
    return scene.sound
      .getAll(SPRITE.key)
      .filter((sound) => !sound.pendingRemove).length;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    run?.destroy();
    run = null;
  });

  // The headless game plays no audio, so this watches the call itself.
  it("loops the sound held", async () => {
    const { player } = await startPlayer();
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.hold("ping", true);

    expect(play).toHaveBeenCalledWith("ping", { loop: true });
  });

  it("plays a sound held again on as it was", async () => {
    const { player } = await startPlayer();
    player.hold("ping", true);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.hold("ping", true);

    expect(play).not.toHaveBeenCalled();
  });

  it("holds one sound for each held, however often it is held", async () => {
    const { scene, player } = await startPlayer();

    player.hold("ping", true);
    player.hold("ping", true);
    player.hold("pong", true);

    expect(heldIn(scene)).toBe(2);
  });

  it("stops a sound let go, and only that one", async () => {
    const { scene, player } = await startPlayer();
    player.hold("ping", true);
    player.hold("pong", true);

    player.hold("ping", false);

    expect(heldIn(scene)).toBe(1);
  });

  it("holds a sound again once it was let go", async () => {
    const { scene, player } = await startPlayer();
    player.hold("ping", true);
    player.hold("ping", false);

    player.hold("ping", true);

    expect(heldIn(scene)).toBe(1);
  });

  it("lets go of a sound not held without a fuss", async () => {
    const { scene, player } = await startPlayer();

    player.hold("ping", false);

    expect(heldIn(scene)).toBe(0);
  });

  it("stops every sound held as the player turns sound off", async () => {
    const { scene, player } = await startPlayer();
    player.hold("ping", true);
    player.hold("pong", true);

    player.follow(false);

    expect(heldIn(scene)).toBe(0);
  });

  it("holds a sound again once sound is turned back on", async () => {
    const { scene, player } = await startPlayer();
    player.hold("ping", true);
    player.follow(false);
    player.follow(true);

    player.hold("ping", true);

    expect(heldIn(scene)).toBe(1);
  });

  it("holds nothing while the player wants no sound", async () => {
    const { scene, player } = await startPlayer();
    player.follow(false);

    player.hold("ping", true);

    expect(heldIn(scene)).toBe(0);
  });

  it("holds nothing before the player has been asked", async () => {
    run = await runBareScene();
    const player = new SpritePlayer(run.scene, SPRITE);
    cacheSounds(run.scene, SPRITE.key);

    player.hold("ping", true);

    expect(heldIn(run.scene)).toBe(0);
  });

  it("holds nothing before the sprite is in the cache", async () => {
    run = await runBareScene();
    const player = new SpritePlayer(run.scene, SPRITE);
    player.follow(true);

    player.hold("ping", true);

    expect(heldIn(run.scene)).toBe(0);
  });

  it("stops every sound held as the scene ends", async () => {
    const { scene, player } = await startPlayer();
    player.hold("ping", true);

    scene.game.scene.stop(scene.scene.key);

    expect(heldIn(scene)).toBe(0);
  });
});

/** A sprite of a sound in three takes, and of the other sounds of the mix below in one each. */
const MIXED_SPRITE: SoundSprite<string> = {
  key: "mixed-sounds",
  spritemap: {
    spritemap: Object.fromEntries(
      ["tap-1", "tap-2", "tap-3", "ring", "knock", "boom", "chime"].map(
        (marker, at) => [marker, { start: at, end: at + 0.5, loop: false }],
      ),
    ),
  },
  url: ["sounds.ogg", "sounds.m4a"],
};

/** The markers' configs of the sprite above, as Phaser would give them: tap's second take loops, and ring is a little quiet. */
const MIXED_MARKERS: Readonly<Record<string, Types.Sound.SoundConfig>> = {
  "tap-1": { detune: 0, volume: 1, loop: false },
  "tap-2": { detune: 0, volume: 1, loop: true },
  "tap-3": { detune: 0, volume: 1, loop: false },
  ring: { detune: 0, volume: 0.8, loop: false },
};

/** Names a sound of the mix below. */
type Mixed = "tap" | "ring" | "knock" | "boom" | "chime";

/**
 * How the sprite above is mixed: two hits at the busy level `small` and
 * one at `medium`, of one family, a blast at `huge` and a tuned bell at
 * `tick`.
 */
const MIX: SoundMix<Mixed> = {
  tap: { family: "hits", level: "small", takes: 3, tuned: false },
  ring: { family: "hits", level: "medium", takes: 1, tuned: false },
  knock: { family: "hits", level: "small", takes: 1, tuned: false },
  boom: { family: "blasts", level: "huge", takes: 1, tuned: false },
  chime: { family: "bells", level: "tick", takes: 1, tuned: true },
};

/** Returns a random source that draws the numbers given, in turn, and then the middle one, which varies nothing. */
function drawing(...numbers: number[]): () => number {
  let next = 0;
  return () => numbers[next++] ?? 0.5;
}

/** Describes a play the game started: on which sound, of which marker, with what config. */
interface Started {
  readonly sound: Sound.BaseSound;
  readonly marker: string;
  readonly config: Types.Sound.SoundConfig;
}

/**
 * Has each sound the game plays play on until it is stopped, as one does
 * where audio plays, and returns each play, in turn, its config as it was
 * handed over.
 */
function playOnUntilStopped(): Started[] {
  const started: Started[] = [];
  vi.spyOn(Sound.NoAudioSound.prototype, "play").mockImplementation(function (
    this: Sound.NoAudioSound,
    marker,
    config,
  ) {
    Object.assign(this, { isPlaying: true });
    started.push({
      sound: this,
      marker: typeof marker === "string" ? marker : "",
      config: { ...config },
    });
    return true;
  });
  vi.spyOn(Sound.NoAudioSound.prototype, "stop").mockImplementation(function (
    this: Sound.NoAudioSound,
  ) {
    Object.assign(this, { isPlaying: false });
    return true;
  });
  return started;
}

describe("SpritePlayer with a mix", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene with a player of the mixed sprite, loaded and wanted, drawing its variation from a source. */
  async function startMixed(
    random: () => number = drawing(),
    mix: SoundMix<string> = MIX,
    sprite: SoundSprite<string> = MIXED_SPRITE,
  ): Promise<{ scene: Scene; player: SpritePlayer<string> }> {
    run = await runBareScene();
    const player = new SpritePlayer(run.scene, sprite, { mix, random });
    cacheSounds(run.scene, sprite.key);
    player.follow(true);
    return { scene: run.scene, player };
  }

  /** Moves the scene's clock on, as frames do. */
  function wait(ms: number): void {
    run?.advance(ms);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    run?.destroy();
    run = null;
  });

  it("plays a sound's takes in turn", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();

    for (let play = 0; play < 4; play++) player.play("tap");

    expect(started.map(({ marker }) => marker)).toEqual([
      "tap-1",
      "tap-2",
      "tap-3",
      "tap-1",
    ]);
  });

  it("plays a sound of one take by its own name", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();

    player.play("ring");

    expect(started.map(({ marker }) => marker)).toEqual(["ring"]);
  });

  it("refuses a mix whose take the sprite lacks", async () => {
    run = await runBareScene();
    const { scene } = run;

    expect(
      () =>
        new SpritePlayer(scene, MIXED_SPRITE, {
          mix: { ...MIX, ring: { ...MIX.ring, takes: 2 } },
        }),
    ).toThrow(RangeError);
  });

  it("puts a limiter on the game's sound", async () => {
    vi.mocked(limitSound).mockClear();

    const { scene } = await startMixed();

    expect(limitSound).toHaveBeenCalledExactlyOnceWith(scene.sound);
  });

  it("refuses a mix of a sound with no takes", async () => {
    run = await runBareScene();
    const { scene } = run;

    expect(
      () =>
        new SpritePlayer(scene, MIXED_SPRITE, {
          mix: { ...MIX, ring: { ...MIX.ring, takes: 0 } },
        }),
    ).toThrow(RangeError);
  });

  it("varies a busy noisy sound's play from what its source draws", async () => {
    const { player } = await startMixed(drawing(0, 1));
    const started = playOnUntilStopped();

    player.play("tap", { detune: 100, volume: 0.5 });

    expect(started[0]?.config.detune).toBe(60);
    expect(started[0]?.config.volume).toBeCloseTo(0.5 * gainOf(1.5), 12);
  });

  it.each<[string, Mixed]>([
    ["a tuned sound's", "chime"],
    ["a sound's at a level not busy", "ring"],
  ])("leaves %s play as it was asked", async (_, name) => {
    const { player } = await startMixed(drawing(0, 1));
    const started = playOnUntilStopped();

    player.play(name, { detune: 100, volume: 0.5 });

    expect(started[0]?.config).toMatchObject({ detune: 100, volume: 0.5 });
  });

  it("pans a play at the field's edge 60% of the way to that side", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();

    player.play("ring", undefined, 1);

    expect(started[0]?.config.pan).toBe(0.6);
  });

  it("plays a sound risen at a place, for a frame's sounds", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    const { playAt } = player;

    playAt("ring", 300, -0.5);

    expect(started[0]?.config).toMatchObject({ detune: 300, pan: -0.3 });
  });

  it("keeps a play's own pan where it is given no place", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();

    player.play("ring", { pan: 0.2 });

    expect(started[0]?.config.pan).toBe(0.2);
  });

  it("starts each play from its marker's own config, whatever the last play's was", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("ring", { rate: 2, loop: true, pan: 0.5 });

    player.play("ring");

    expect(started[1]?.config).toEqual({
      mute: false,
      volume: 1,
      rate: 1,
      detune: 0,
      seek: 0,
      loop: false,
      delay: 0,
      pan: 0,
    });
  });

  it("plays each take with its marker's own config", async () => {
    const { scene, player } = await startMixed();
    const configs = markSounds(scene, MIXED_MARKERS);

    player.play("tap");
    player.play("tap");

    expect(configs.map(({ loop }) => loop)).toEqual([false, true]);
  });

  it("starts a play from its marker's own config, whatever the play before asked", async () => {
    const { scene, player } = await startMixed();
    const configs = markSounds(scene, MIXED_MARKERS);
    player.play("ring", { volume: 0.3 });

    player.play("ring");

    expect(configs[1]?.volume).toBe(0.8);
  });

  it("places no play at a spatial source, nor the plays after it", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("ring", { source: { x: 1, y: 2 } });

    player.play("ring");

    expect(started.map(({ config }) => "source" in config)).toEqual([
      false,
      false,
    ]);
  });

  it("ducks a busy sound played in a huge one's own frame 6 dB", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("boom");

    player.play("tap");

    expect(started[1]?.config.volume).toBe(gainOf(-6));
  });

  it("ducks a busy sound played just after a huge one 6 dB", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("boom");
    wait(100);

    player.play("tap");

    expect(started[1]?.config.volume).toBe(gainOf(-6));
  });

  it("lets a busy sound played once the duck is done be", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("boom");
    wait(500);

    player.play("tap");

    expect(started[1]?.config.volume).toBe(1);
  });

  it("holds the busy levels down as a second huge sound starts inside the first's duck", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("boom");
    wait(200);
    player.play("boom");

    player.play("tap");

    expect(started[2]?.config.volume).toBe(gainOf(-6));
  });

  it("ducks nothing under a sound that isn't huge", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("ring");
    wait(100);

    player.play("tap");

    expect(started[1]?.config.volume).toBe(1);
  });

  it("leaves a huge sound itself be", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    player.play("boom");
    wait(100);

    player.play("boom");

    expect(started[1]?.config.volume).toBe(1);
  });

  it("starts the oldest of a sound's four voices over for its fifth", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    for (let play = 0; play < 4; play++) player.play("tap");

    player.play("tap");

    expect(started[4]?.sound).toBe(started[0]?.sound);
  });

  it("stops the quietest of a family's eight voices, the oldest of those, for a ninth of another sound", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    for (let play = 0; play < 4; play++) player.play("ring");
    for (let play = 0; play < 4; play++) player.play("tap");

    player.play("knock");

    expect({
      stopped: started.map(({ sound }) => sound.isPlaying).indexOf(false),
      sounding: started.filter(({ sound }) => sound.isPlaying).length,
    }).toEqual({ stopped: 4, sounding: 8 });
  });

  it("leaves another family's voices be where a family is full", async () => {
    const { player } = await startMixed();
    const started = playOnUntilStopped();
    for (let play = 0; play < 4; play++) player.play("ring");
    for (let play = 0; play < 4; play++) player.play("tap");

    player.play("boom");

    expect(started.every(({ sound }) => sound.isPlaying)).toBe(true);
  });

  it("stops the oldest of twenty-four voices for another", async () => {
    const names = Array.from({ length: 7 }, (_, at) => `sound-${String(at)}`);
    const { player } = await startMixed(
      drawing(),
      Object.fromEntries(
        names.map((name) => [
          name,
          { family: name, level: "medium", takes: 1, tuned: false },
        ]),
      ),
      {
        ...MIXED_SPRITE,
        spritemap: {
          spritemap: Object.fromEntries(
            names.map((name) => [name, { start: 0, end: 1, loop: false }]),
          ),
        },
      },
    );
    const started = playOnUntilStopped();
    for (const name of names.slice(0, 6)) {
      for (let play = 0; play < 4; play++) player.play(name);
    }

    player.play("sound-6");

    expect({
      first: started[0]?.sound.isPlaying,
      sounding: started.filter(({ sound }) => sound.isPlaying).length,
    }).toEqual({ first: false, sounding: 24 });
  });

  it("loops a sound's first take while it is held", async () => {
    const { player } = await startMixed();
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

    player.hold("tap", true);

    expect(play).toHaveBeenCalledWith("tap-1", { loop: true });
  });
});
