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

    it("hears only what is let go, and onKeyDown only what is pressed", async () => {
      const { run, pressed, released } = await listen();

      run.key("keydown", "KeyP", "p");
      run.key("keyup", "KeyP", "p");
      run.advance(16);

      expect({ pressed, released }).toEqual({
        pressed: ["KeyP"],
        released: ["KeyP"],
      });
    });
  });
});
