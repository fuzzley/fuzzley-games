import type { Scene } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { type SoundSprite, SpritePlayer } from "./sprite_player";

/** A sprite of two sounds, at a URL no server answers. */
const SPRITE: SoundSprite = {
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
 * The headless game plays no audio, so a real load never gets there.
 */
function cacheSprite(scene: Scene): void {
  scene.cache.audio.add(SPRITE.key, {});
}

describe("SpritePlayer", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene, and a player of the sprite in it. */
  async function startPlayer(): Promise<{
    scene: Scene;
    player: SpritePlayer<"ping" | "pong">;
  }> {
    run = await runBareScene();
    return { scene: run.scene, player: new SpritePlayer(run.scene, SPRITE) };
  }

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("isn't loaded where the sprite can't be", async () => {
    const { player } = await startPlayer();

    run?.advance(16);

    expect(player.loaded).toBe(false);
  });

  it("is loaded once the sprite is in the cache", async () => {
    const { scene, player } = await startPlayer();

    cacheSprite(scene);

    expect(player.loaded).toBe(true);
  });

  it("lets the scene be heard while the player wants sound", async () => {
    const { scene, player } = await startPlayer();
    scene.sound.mute = true;

    player.follow(true);

    expect(scene.sound.mute).toBe(false);
  });

  it("mutes the scene while the player wants none", async () => {
    const { scene, player } = await startPlayer();

    player.follow(false);

    expect(scene.sound.mute).toBe(true);
  });

  it("leaves the mute alone until the player's wish changes", async () => {
    const { scene, player } = await startPlayer();
    player.follow(true);
    scene.sound.mute = true;

    player.follow(true);

    expect(scene.sound.mute).toBe(true);
  });

  // The headless game has no audio to hear, so these watch the call itself.
  it("plays a sound of the sprite, with its config", async () => {
    const { scene, player } = await startPlayer();
    cacheSprite(scene);
    player.follow(true);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("pong", { detune: 200 });

    expect(play).toHaveBeenCalledWith(SPRITE.key, "pong", { detune: 200 });
  });

  it("plays nothing before the sprite has loaded", async () => {
    const { scene, player } = await startPlayer();
    player.follow(true);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing while the player wants no sound", async () => {
    const { scene, player } = await startPlayer();
    cacheSprite(scene);
    player.follow(false);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });

  it("plays nothing before the player has been asked", async () => {
    const { scene, player } = await startPlayer();
    cacheSprite(scene);
    const play = vi.spyOn(scene.sound, "playAudioSprite");

    player.play("ping");

    expect(play).not.toHaveBeenCalled();
  });
});
