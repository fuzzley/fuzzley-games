import { Scene } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { uniqueSceneKey } from "./scene_key";

describe("uniqueSceneKey", () => {
  let run: SceneRun<HostedScene> | null = null;

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("numbers a prefix's keys from 1, in turn", () => {
    const keys = [uniqueSceneKey("turn"), uniqueSceneKey("turn")];

    expect(keys).toEqual(["turn-1", "turn-2"]);
  });

  it("numbers each prefix's keys apart", () => {
    const keys = [
      uniqueSceneKey("belt-scene"),
      uniqueSceneKey("bricks-scene"),
      uniqueSceneKey("belt-scene"),
    ];

    expect(keys).toEqual(["belt-scene-1", "bricks-scene-1", "belt-scene-2"]);
  });

  it("keys scenes one game holds at once, as a host's new scene and its last", async () => {
    run = await runBareScene();
    const keys = [uniqueSceneKey("swapped"), uniqueSceneKey("swapped")];

    for (const key of keys) run.game.scene.add(key, new Scene(key), true);
    run.advance(16);

    expect(keys.map((key) => run?.game.scene.isActive(key))).toEqual([
      true,
      true,
    ]);
  });
});
