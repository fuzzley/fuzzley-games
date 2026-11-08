import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "./run_scene";
import { watchUploads } from "./uploads";

let run: SceneRun<HostedScene> | null = null;

afterEach(() => {
  run?.destroy();
  run = null;
});

describe("watchUploads", () => {
  it("hands over each canvas the game uploads, in turn", async () => {
    run = await runBareScene();
    const uploaded: HTMLCanvasElement[] = [];
    watchUploads(run.scene, (canvas) => {
      uploaded.push(canvas);
    });

    const apple = run.scene.textures.createCanvas("apple", 8, 8);
    const crumb = run.scene.textures.createCanvas("crumb", 4, 4);
    apple?.refresh();

    expect(uploaded).toEqual([apple?.canvas, crumb?.canvas, apple?.canvas]);
  });

  it("throws where the game's uploads are watched already", async () => {
    run = await runBareScene();
    const { scene } = run;
    watchUploads(scene, vi.fn());

    const watchAgain = (): void => {
      watchUploads(scene, vi.fn());
    };

    expect(watchAgain).toThrow("The game's uploads are watched already");
  });
});
