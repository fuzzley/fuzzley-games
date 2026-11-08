import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { type AtlasFrame, bakeAtlas } from "./bake_atlas";
import { picturesOf } from "./pictures";

/** Returns a frame of a size that draws nothing. */
function frame(name: string, width: number, height: number): AtlasFrame {
  return { name, width, height, draw: vi.fn() };
}

/** What the harness encodes a picture of a frame of a size as. */
function pictureOfSize(width: number, height: number): string {
  return `data:image/png;size=${String(width)}x${String(height)},`;
}

/** Names frames as How to play's are named: kinds in records, and one alone. */
interface Named {
  readonly bricks: Readonly<Record<"plain" | "steel", string>>;
  readonly balls: readonly string[];
  readonly comet: string;
}

describe("picturesOf", () => {
  let run: SceneRun<HostedScene> | null = null;

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("pictures each frame named, as the atlas holds it, where it was named", async () => {
    run = await runBareScene();
    bakeAtlas(run.scene, "atlas", [
      frame("plain-brick", 20, 10),
      frame("steel-brick", 22, 11),
      frame("ball", 6, 6),
      frame("fire-ball", 8, 8),
      frame("comet", 30, 12),
    ]);
    const named: Named = {
      bricks: { plain: "plain-brick", steel: "steel-brick" },
      balls: ["ball", "fire-ball"],
      comet: "comet",
    };

    const pictures: Named = picturesOf(run.scene, "atlas", named);

    expect(pictures).toEqual({
      bricks: { plain: pictureOfSize(20, 10), steel: pictureOfSize(22, 11) },
      balls: [pictureOfSize(6, 6), pictureOfSize(8, 8)],
      comet: pictureOfSize(30, 12),
    });
  });

  it("pictures a frame as the atlas was last baked", async () => {
    run = await runBareScene();
    bakeAtlas(run.scene, "atlas", [frame("comet", 30, 12)]);
    bakeAtlas(run.scene, "atlas", [frame("comet", 45, 18)]);

    const pictures = picturesOf(run.scene, "atlas", { comet: "comet" });

    expect(pictures).toEqual({ comet: pictureOfSize(45, 18) });
  });
});
