import { Scene } from "phaser";
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
  readonly key = "atlases";

  constructor(private readonly atlases: readonly CardAtlas[]) {
    super("atlases");
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
