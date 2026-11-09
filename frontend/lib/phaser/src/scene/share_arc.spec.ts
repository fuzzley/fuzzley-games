import type { GameObjects } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene, strokesOf } from "../testing";
import { strokeShareArc } from "./share_arc";

let run: SceneRun<HostedScene> | null = null;

/** Returns a `Graphics` in a bare scene, holding no command yet. */
async function graphics(): Promise<GameObjects.Graphics> {
  run = await runBareScene();
  return run.scene.add.graphics().clear();
}

afterEach(() => {
  run?.destroy();
  run = null;
});

describe("strokeShareArc", () => {
  it("strokes the share clockwise from the circle's top, in the line set", async () => {
    const drawn = await graphics();
    drawn.lineStyle(3, 0x00ff00);

    strokeShareArc(drawn, 30, 40, 6, 0.5);

    // Half the circle, from its top round to its foot.
    expect(strokesOf(drawn)).toEqual([
      {
        x: 30,
        y: 40,
        radius: 6,
        start: -Math.PI / 2,
        end: Math.PI / 2,
        anticlockwise: false,
        width: 3,
        color: 0x00ff00,
      },
    ]);
  });

  it.each([
    [0, -Math.PI / 2],
    [0.25, 0],
    [1, (3 * Math.PI) / 2],
  ])("ends a share of %s that far round", async (share, end) => {
    const drawn = await graphics();

    strokeShareArc(drawn, 30, 40, 6, share);

    expect(strokesOf(drawn)).toEqual([
      expect.objectContaining({
        start: -Math.PI / 2,
        end: expect.closeTo(end, 12) as unknown,
      }),
    ]);
  });

  it("starts a path of its own, stroking nothing added before it", async () => {
    const drawn = await graphics();
    drawn.beginPath().arc(10, 20, 5, 0, Math.PI);

    strokeShareArc(drawn, 30, 40, 6, 0.5);

    expect(strokesOf(drawn)).toEqual([
      expect.objectContaining({ x: 30, y: 40, radius: 6 }),
    ]);
  });
});
