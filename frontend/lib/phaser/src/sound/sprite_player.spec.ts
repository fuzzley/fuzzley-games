import { type Scene, Sound, type Types } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, cacheSounds, runBareScene } from "../testing";
import { MOST_AT_ONCE, type SoundSprite, SpritePlayer } from "./sprite_player";

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

/**
 * Has the sounds the game makes of the sprite hold a marker for each of
 * its sounds, as Phaser's do where audio plays, and has a play write its
 * config into its marker's, as Phaser's does; returns the config each play
 * started with, in turn.
 */
function markSounds(scene: Scene): Types.Sound.SoundConfig[] {
  const configs: Types.Sound.SoundConfig[] = [];
  const add = scene.sound.addAudioSprite.bind(scene.sound);
  vi.spyOn(scene.sound, "addAudioSprite").mockImplementation((key) => {
    const sound = add(key);
    // Pong's loops, as a sound held does.
    sound.markers["ping"] = {
      name: "ping",
      config: { detune: 0, volume: 1, loop: false },
    };
    sound.markers["pong"] = {
      name: "pong",
      config: { detune: 0, volume: 1, loop: true },
    };
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
