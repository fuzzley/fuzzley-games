import type { HostedScene } from "../host";
import { cacheSounds } from "./cached_sounds";
import { type SceneRun, runBareScene } from "./run_scene";

let run: SceneRun<HostedScene> | null = null;

afterEach(() => {
  run?.destroy();
  run = null;
});

describe("cacheSounds", () => {
  it("puts a sound sprite in the scene's audio cache under its key, as a load would", async () => {
    run = await runBareScene();

    cacheSounds(run.scene, "chimes");

    expect([
      run.scene.cache.audio.exists("chimes"),
      run.scene.cache.audio.exists("other"),
    ]).toEqual([true, false]);
  });
});
