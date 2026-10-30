import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { onKeyDown, onKeyUp } from "./keys";

describe("the key helpers", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Runs a bare scene, gathering the codes of the keys it hears. */
  async function listen(): Promise<{
    run: SceneRun<HostedScene>;
    pressed: string[];
    released: string[];
  }> {
    run = await runBareScene();
    const pressed: string[] = [];
    const released: string[] = [];
    onKeyDown(run.scene, (event) => pressed.push(event.code));
    onKeyUp(run.scene, (event) => released.push(event.code));
    return { run, pressed, released };
  }

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("hand each listener only its own kind of key event", async () => {
    const { run, pressed, released } = await listen();

    run.key("keydown", "KeyP", "p");
    run.key("keyup", "KeyP", "p");
    run.advance(16);

    expect({ pressed, released }).toEqual({
      pressed: ["KeyP"],
      released: ["KeyP"],
    });
  });

  it("stop once the scene has ended", async () => {
    const { run, pressed, released } = await listen();
    run.game.scene.stop("bare");
    run.advance(16);

    run.key("keydown", "KeyP", "p");
    run.key("keyup", "KeyP", "p");
    run.advance(16);

    expect({ pressed, released }).toEqual({ pressed: [], released: [] });
  });

  describe("onKeyDown", () => {
    it("hears each key pressed once, however many come in a frame", async () => {
      const { run, pressed } = await listen();

      run.key("keydown", "ArrowLeft");
      run.key("keydown", "ArrowUp");
      run.key("keydown", "ArrowRight");
      run.key("keydown", "ArrowDown");
      run.advance(16);

      expect(pressed).toEqual([
        "ArrowLeft",
        "ArrowUp",
        "ArrowRight",
        "ArrowDown",
      ]);
    });

    it("hears a key pressed again in a later frame", async () => {
      const { run, pressed } = await listen();
      run.key("keydown", "Space", " ");
      run.advance(16);

      run.key("keydown", "Space", " ");
      run.advance(16);

      expect(pressed).toEqual(["Space", "Space"]);
    });

    it("hears a held key's repeats, which a scene tells apart itself", async () => {
      const { run, pressed } = await listen();

      run.key("keydown", "Space", " ");
      run.key("keydown", "Space", " ", { repeat: true });
      run.advance(16);

      expect(pressed).toEqual(["Space", "Space"]);
    });

    it("hands every listener each key", async () => {
      const { run, pressed } = await listen();
      const alsoPressed: string[] = [];
      onKeyDown(run.scene, (event) => alsoPressed.push(event.code));

      run.key("keydown", "ArrowLeft");
      run.key("keydown", "ArrowUp");
      run.key("keydown", "ArrowRight");
      run.advance(16);

      expect(alsoPressed).toEqual(pressed);
      expect(alsoPressed).toEqual(["ArrowLeft", "ArrowUp", "ArrowRight"]);
    });
  });

  describe("onKeyUp", () => {
    it("hears each key let go once, however many come in a frame", async () => {
      const { run, released } = await listen();

      run.key("keyup", "ArrowLeft");
      run.key("keyup", "ArrowUp");
      run.key("keyup", "ArrowRight");
      run.advance(16);

      expect(released).toEqual(["ArrowLeft", "ArrowUp", "ArrowRight"]);
    });
  });
});
