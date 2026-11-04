import { type Scene, Sound } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { type SoundSprite, SpritePlayer } from "./sprite_player";

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

/**
 * Puts the sprite in the scene's audio cache, as a load that worked would.
 * The headless game has no audio, so Phaser never queues a load of its own.
 */
function cacheSprite(scene: Scene): void {
  scene.cache.audio.add(SPRITE.key, {});
}

describe("SpritePlayer", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene, to make a player in. */
  async function startScene(): Promise<Scene> {
    run = await runBareScene();
    return run.scene;
  }

  afterEach(() => {
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
    cacheSprite(scene);
    player.follow(true);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("pong", { detune: 200 });

    expect(play).toHaveBeenCalledWith(SPRITE.key, "pong", { detune: 200 });
  });

  it("plays a sound risen by some cents, for a frame's sounds", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSprite(scene);
    player.follow(true);
    const play = vi.spyOn(scene.sound, "playAudioSprite");
    const { playRisen } = player;

    playRisen("ping", 300);

    expect(play).toHaveBeenCalledWith(SPRITE.key, "ping", { detune: 300 });
  });

  it("plays nothing risen while the player wants no sound", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSprite(scene);
    player.follow(false);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.playRisen("ping", 300);

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing before the sprite is in the cache", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    player.follow(true);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing while the player wants no sound", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSprite(scene);
    player.follow(false);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing before the player has been asked", async () => {
    const scene = await startScene();
    const player = new SpritePlayer(scene, SPRITE);
    cacheSprite(scene);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

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

    cacheSprite(scene);

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

describe("SpritePlayer's held sounds", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene with a player of the sprite, loaded and wanted. */
  async function startPlayer(): Promise<{
    scene: Scene;
    player: SpritePlayer<"ping" | "pong">;
  }> {
    run = await runBareScene();
    const player = new SpritePlayer(run.scene, SPRITE);
    cacheSprite(run.scene);
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
    cacheSprite(run.scene);

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
