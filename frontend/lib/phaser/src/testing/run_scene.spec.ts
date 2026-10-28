import { type GameObjects, Renderer, Scene, WEBGL } from "phaser";
import type { HostedScene, SceneSurroundings } from "../host";
import { runScene } from "./run_scene";
import { type FileServer, pngOfSize } from "./served_files";

/** A scene that records what the harness lets it see and do. */
class ProbeScene extends Scene implements HostedScene {
  readonly key = "probe";
  frames = 0;
  timerFired = false;
  keys: string[] = [];
  pointers: string[] = [];
  box!: GameObjects.Rectangle;

  constructor(private readonly surroundings: SceneSurroundings) {
    super("probe");
  }

  create(): void {
    this.box = this.add.rectangle(0, 0, 10, 10, 0xff0000);
    this.tweens.add({ targets: this.box, alpha: 0, duration: 100 });
    this.time.delayedCall(50, () => {
      this.timerFired = true;
    });
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      this.keys.push(event.code);
    });
    this.input.on("pointerdown", (pointer: { x: number; y: number }) => {
      this.pointers.push(`down ${pointer.x},${pointer.y}`);
    });
    this.input.on(
      "pointerup",
      (pointer: { x: number; y: number; downX: number; downY: number }) => {
        this.pointers.push(
          `up ${pointer.x},${pointer.y} from ${pointer.downX},${pointer.downY}`,
        );
      },
    );
    this.events.once("postupdate", () => {
      this.surroundings.ready();
    });
  }

  override update(): void {
    this.frames++;
  }
}

/** Runs a probe scene, its keyboard on an element of its own if asked. */
async function runProbe(
  target?: HTMLElement,
): ReturnType<typeof runScene<ProbeScene>> {
  return runScene((surroundings) => new ProbeScene(surroundings), {
    insets: { top: 10, right: 0, bottom: 0, left: 0 },
    config: target ? { input: { keyboard: { target } } } : {},
  });
}

/** A scene that loads an image, and records the files that failed. */
class LoadingScene extends Scene implements HostedScene {
  readonly key = "loading";
  readonly failed: string[] = [];

  constructor() {
    super("loading");
  }

  preload(): void {
    this.load.on("loaderror", (file: { key: string }) => {
      this.failed.push(file.key);
    });
    this.load.image("apple", "/apple.png");
  }
}

/** Runs a loading scene, serving it what a server would. */
async function runLoading(
  serve?: FileServer,
): ReturnType<typeof runScene<LoadingScene>> {
  return runScene(() => new LoadingScene(), { serve });
}

describe("runScene", () => {
  it("starts the scene, and steps it only when told", async () => {
    const run = await runProbe();
    const before = run.scene.frames;

    run.advance(160);

    expect(run.scene.frames - before).toBe(10);
    run.destroy();
  });

  it("steps a last, shorter frame for what is left", async () => {
    const run = await runProbe();
    const before = run.scene.frames;

    run.advance(40, 16);

    expect(run.scene.frames - before).toBe(3);
    run.destroy();
  });

  it("moves the clock tweens read with the frames", async () => {
    const run = await runProbe();

    run.advance(200);

    expect(run.scene.box.alpha).toBe(0);
    run.destroy();
  });

  it("fires the scene's timers", async () => {
    const run = await runProbe();

    run.advance(60);

    expect(run.scene.timerFired).toBe(true);
    run.destroy();
  });

  it("gives back the real clock between steps", async () => {
    const run = await runProbe();
    run.advance(10_000);

    expect(Date.now()).toBeLessThan(run.game.loop.time + Date.now());
    expect(Math.abs(Date.now() - new Date().getTime())).toBeLessThan(1_000);
    run.destroy();
  });

  it("tells the scene the insets it was given", async () => {
    let told: SceneSurroundings | undefined;

    const run = await runScene(
      (surroundings) => {
        told = surroundings;
        return new ProbeScene(surroundings);
      },
      { insets: { top: 1, right: 2, bottom: 3, left: 4 } },
    );

    expect(told?.insets()).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    run.destroy();
  });

  it("tells no insets when given none", async () => {
    let told: SceneSurroundings | undefined;

    const run = await runScene((surroundings) => {
      told = surroundings;
      return new ProbeScene(surroundings);
    });

    expect(told?.insets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    run.destroy();
  });

  it("says when the scene has said it drew its first frame", async () => {
    const run = await runProbe();
    const before = run.ready;

    run.advance(16);

    expect([before, run.ready]).toEqual([false, true]);
    run.destroy();
  });

  it("sends keys to the element Phaser's keyboard listens on", async () => {
    const board = document.createElement("div");
    document.body.append(board);
    const run = await runProbe(board);

    run.key("keydown", "ArrowUp");
    run.advance(16);

    expect(run.scene.keys).toEqual(["ArrowUp"]);
    run.destroy();
    board.remove();
  });

  it("sends keys to the window when Phaser's keyboard listens there", async () => {
    const run = await runProbe();

    run.key("keydown", "KeyW", "w");
    run.advance(16);

    expect(run.scene.keys).toEqual(["KeyW"]);
    run.destroy();
  });

  it("sends two keys in one frame, as a browser does", async () => {
    const run = await runProbe();

    run.key("keydown", "ArrowUp");
    run.key("keydown", "Space", " ");
    run.advance(16);

    expect(run.scene.keys).toEqual(["ArrowUp", "Space"]);
    run.destroy();
  });

  it("gives a key the keyCode a browser gives it", async () => {
    const run = await runProbe();
    const keyboard = run.scene.input.keyboard!;
    const keys = [keyboard.addKey("UP"), keyboard.addKey("W")];
    const seven = keyboard.addKey("SEVEN");

    run.key("keydown", "ArrowUp");
    run.key("keydown", "KeyW", "w");
    run.advance(16);
    run.key("keydown", "Digit7", "7");
    run.advance(16);

    expect([...keys, seven].map((key) => key.isDown)).toEqual([
      true,
      true,
      true,
    ]);
    run.destroy();
  });

  it("sends the pointer to the canvas, at a point in its pixels", async () => {
    const run = await runProbe();

    run.pointer("down", 10, 20);
    run.pointer("move", 40, 22);
    run.pointer("up", 60, 25);

    expect(run.scene.pointers).toEqual(["down 10,20", "up 60,25 from 10,20"]);
    run.destroy();
  });

  it("runs the scene with Phaser's WebGL renderer", async () => {
    const run = await runProbe();

    expect(run.game.renderer.type).toBe(WEBGL);
    run.destroy();
  });

  it("lets the scene draw with what only WebGL has", async () => {
    const run = await runProbe();
    const { scene } = run;

    scene.box.enableFilters().filters?.internal.addShadow();
    const texture = scene.textures.addDynamicTexture("crumb", 8, 8);
    texture?.draw(scene.box).render();
    scene.add.gradient(undefined, 0, 0, 40, 40);
    run.advance(32);

    expect(scene.textures.exists("crumb")).toBe(true);
    run.destroy();
  });

  it("loses and restores the game's WebGL context, as Phaser hears", async () => {
    const run = await runProbe();
    const heard: string[] = [];
    for (const event of [
      Renderer.Events.LOSE_WEBGL,
      Renderer.Events.RESTORE_WEBGL,
    ]) {
      run.game.renderer.on(event, () => heard.push(event));
    }

    await run.loseContext();
    await run.restoreContext();

    expect(heard).toEqual([
      Renderer.Events.LOSE_WEBGL,
      Renderer.Events.RESTORE_WEBGL,
    ]);
    run.destroy();
  });

  it("serves the scene the files it loads", async () => {
    const run = await runLoading((url) =>
      url.pathname === "/apple.png" ? pngOfSize(24, 16) : undefined,
    );

    const frame = run.scene.textures.getFrame("apple");

    expect([frame.width, frame.height, run.scene.failed]).toEqual([24, 16, []]);
    run.destroy();
  });

  it("fails a load of a file not served, as a 404 does", async () => {
    const run = await runLoading(() => undefined);

    expect([run.scene.textures.exists("apple"), run.scene.failed]).toEqual([
      false,
      ["apple"],
    ]);
    run.destroy();
  });

  it("serves nothing once the run is destroyed", async () => {
    const run = await runLoading(() => pngOfSize(1, 1));
    run.destroy();

    const again = await runLoading();

    expect(again.scene.failed).toEqual(["apple"]);
    again.destroy();
  });

  it("destroys the game, and the scene with it", async () => {
    const run = await runProbe();

    run.destroy();

    expect(run.scene.sys.settings.status).toBeGreaterThan(5);
  });
});
