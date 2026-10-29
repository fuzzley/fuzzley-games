import type { Scene } from "phaser";
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
