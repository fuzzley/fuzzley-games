import type { HostedScene } from "@fz/phaser/host";
import { type SceneRun, runBareScene } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { strokesOf } from "./belt_board";

describe("strokesOf", () => {
  let run: SceneRun<HostedScene> | null = null;

  /**
   * Returns a `Graphics` in a bare scene, cleared of the styles Phaser
   * starts it with, as a painter clears its own before it draws.
   */
  async function graphics(): Promise<GameObjects.Graphics> {
    run = await runBareScene();
    return run.scene.add.graphics().clear();
  }

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("reads each arc Phaser was told to stroke, in the line it was given", async () => {
    const drawn = await graphics();

    drawn.lineStyle(2, 0xff0000, 1);
    drawn.strokeCircle(10, 20, 5);
    drawn.lineStyle(3, 0x00ff00, 0.5);
    drawn.beginPath();
    drawn.arc(30, 40, 6, 0, Math.PI);
    drawn.strokePath();

    expect(strokesOf(drawn)).toEqual([
      {
        x: 10,
        y: 20,
        radius: 5,
        start: 0,
        end: 2 * Math.PI,
        width: 2,
        color: 0xff0000,
      },
      {
        x: 30,
        y: 40,
        radius: 6,
        start: 0,
        end: Math.PI,
        width: 3,
        color: 0x00ff00,
      },
    ]);
  });

  it("refuses a command no painter gives, whose arguments it can't step over", async () => {
    const drawn = await graphics();

    drawn.fillStyle(0xffffff);

    expect(() => strokesOf(drawn)).toThrow("No painter gives command");
  });
});
