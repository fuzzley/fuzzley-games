import { Scene, Scenes } from "phaser";
import type { SceneSource } from "../canvas";
import type { HostedScene, SceneSurroundings } from "../host";
import { FakeCanvasHost, FakePhaserCanvas } from "./fake_canvas";
import {
  type KeyedSceneRun,
  runKeyedScene,
  runShownScene,
} from "./keyed_scene";
import type { SceneRun } from "./run_scene";

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

/** Returns the scene a run runs, failing unless it records its keys. */
function keysSceneOf(run: SceneRun<HostedScene>): KeysScene {
  if (!(run.scene instanceof KeysScene)) throw new Error("Not the keys scene");
  return run.scene;
}

/** Returns fake canvases whose host was shown each source in turn. */
function shownCanvas(...sources: SceneSource[]): FakePhaserCanvas {
  const fake = new FakePhaserCanvas();
  const host = new FakeCanvasHost(
    document.createElement("div"),
    { title: "Keys", background: "transparent" },
    false,
  );
  fake.hosts.push(host);
  for (const source of sources) void host.show(source, () => undefined);
  return fake;
}

/** Returns a board's element in the page, taken out once the test finishes. */
function boardInPage(): HTMLElement {
  const board = document.createElement("div");
  document.body.append(board);
  onTestFinished(() => {
    board.remove();
  });
  return board;
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

describe("runShownScene", () => {
  it("runs the scene the canvas was shown last, its keyboard on the board's element", async () => {
    const fake = shownCanvas(
      () => {
        throw new Error("Not the scene shown last");
      },
      () => makeKeysScene,
    );
    const board = boardInPage();
    const run = await runShownScene(fake, board);

    board.dispatchEvent(
      new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp" }),
    );
    run.advance(16);

    expect(keysSceneOf(run).heard).toEqual(["ArrowUp"]);
  });

  it("runs the scene as the options say", async () => {
    const insets = { top: 12, right: 0, bottom: 0, left: 0 };

    const run = await runShownScene(
      shownCanvas(() => makeKeysScene),
      boardInPage(),
      { width: 300, height: 200, insets },
    );

    expect({
      size: [run.game.scale.width, run.game.scale.height],
      insets: keysSceneOf(run).surroundings.insets(),
    }).toEqual({ size: [300, 200], insets });
  });

  it("destroys the run once the test finishes", async () => {
    const runs: SceneRun<HostedScene>[] = [];
    // Registered first, so it runs last, after the teardown it checks.
    onTestFinished(() => {
      expect(runs.map((run) => run.scene.sys.settings.status)).toEqual([
        Scenes.DESTROYED,
      ]);
    });

    runs.push(
      await runShownScene(
        shownCanvas(() => makeKeysScene),
        boardInPage(),
      ),
    );

    expect(runs.map((run) => run.scene.sys.settings.status)).toEqual([
      Scenes.RUNNING,
    ]);
  });

  describe("run in a beforeAll", () => {
    let made = 0;
    let thrown = false;

    beforeAll(async () => {
      const fake = shownCanvas(() => {
        made++;
        return makeKeysScene;
      });
      try {
        await runShownScene(fake, document.body);
      } catch {
        thrown = true;
      }
    });

    it("throws, having made no scene", () => {
      expect({ thrown, made }).toEqual({ thrown: true, made: 0 });
    });
  });
});
