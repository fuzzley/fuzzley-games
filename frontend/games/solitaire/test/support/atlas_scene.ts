import { type Game, Scene, Scenes } from "phaser";
import type { HostedScene } from "@fz/phaser/host";
import {
  type SceneRun,
  type SceneRunOptions,
  runScene,
} from "@fz/phaser/testing";
import {
  type CardAtlas,
  loadCardAtlas,
} from "@/engine/render/phaser/deck/card_deck_atlas";
import { serveWorkspace } from "./workspace_files";

/** A scene that loads card atlases, as a board loads its deck, and no more. */
class AtlasScene extends Scene implements HostedScene {
  constructor(
    private readonly atlases: readonly CardAtlas[],
    readonly key = "atlases",
  ) {
    super(key);
  }

  preload(): void {
    for (const atlas of this.atlases) loadCardAtlas(this.load, atlas);
  }
}

/**
 * Runs a scene that has loaded card atlases from the workspace, for a spec to
 * make sprites from, in real Phaser.
 */
export async function runSceneWithAtlases(
  atlases: readonly CardAtlas[],
  options: SceneRunOptions = {},
): Promise<SceneRun<HostedScene>> {
  return runScene(() => new AtlasScene(atlases), {
    serve: serveWorkspace,
    ...options,
  });
}

/** How many loads {@link loadAtlases} has made, which keys each one's scene. */
let loads = 0;

/**
 * Loads card atlases into a running game through a scene of their own, which
 * it then removes, leaving the atlases loaded, as an earlier board may.
 */
export async function loadAtlases(
  game: Game,
  atlases: readonly CardAtlas[],
): Promise<void> {
  const scene = new AtlasScene(atlases, `atlases-${++loads}`);
  game.scene.add(scene.key, scene, true);
  while (scene.sys.settings.status < Scenes.RUNNING) {
    await new Promise((resolve) => setTimeout(resolve));
  }
  game.scene.remove(scene.key);
}
