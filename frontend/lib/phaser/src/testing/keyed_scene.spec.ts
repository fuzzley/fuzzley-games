import { Scene, Scenes } from "phaser";
import type { HostedScene, SceneSurroundings } from "../host";
import { type KeyedSceneRun, runKeyedScene } from "./keyed_scene";

/** A scene that records the keys its keyboard hears, and the insets it is told. */
class KeysScene extends Scene implements HostedScene {
  readonly key = "keys";
  readonly heard: string[] = [];

  constructor(readonly surroundings: SceneSurroundings) {
    super("keys");
  }

  create(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      this.heard.push(event.code);
    });
  }
}

/** Makes a scene that records its keys. */
function makeKeysScene(surroundings: SceneSurroundings): KeysScene {
  return new KeysScene(surroundings);
}

describe("runKeyedScene", () => {
  it("runs the scene with its keyboard on an element of the page that takes the focus", async () => {
    const { run, keys } = await runKeyedScene(makeKeysScene);

    keys.dispatchEvent(
      new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp" }),
    );
    run.advance(16);

    expect({
      heard: run.scene.heard,
      inPage: keys.isConnected,
      tabIndex: keys.tabIndex,
    }).toEqual({ heard: ["ArrowUp"], inPage: true, tabIndex: 0 });
  });

  it("runs the scene as the options say", async () => {
    const insets = { top: 12, right: 0, bottom: 0, left: 0 };
    let readied = false;

    const { run } = await runKeyedScene(makeKeysScene, {
      width: 300,
      height: 200,
      insets,
      prepare: () => {
        readied = true;
      },
    });

    expect({
      size: [run.game.scale.width, run.game.scale.height],
      insets: run.scene.surroundings.insets(),
      readied,
    }).toEqual({ size: [300, 200], insets, readied: true });
  });

  it("destroys the run and takes the element out of the page once the test finishes", async () => {
    const runs: KeyedSceneRun<KeysScene>[] = [];
    // Registered first, so it runs last, after the teardown it checks.
    onTestFinished(() => {
      expect(
        runs.map(({ run, keys }) => ({
          status: run.scene.sys.settings.status,
          inPage: keys.isConnected,
        })),
      ).toEqual([{ status: Scenes.DESTROYED, inPage: false }]);
    });

    runs.push(await runKeyedScene(makeKeysScene));

    expect(runs.map(({ keys }) => keys.isConnected)).toEqual([true]);
  });
});
