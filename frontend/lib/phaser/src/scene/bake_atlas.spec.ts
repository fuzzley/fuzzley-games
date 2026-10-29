import { GameObjects, type Scene, type Textures } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { ATLAS_GUTTER, type AtlasFrame, bakeAtlas } from "./bake_atlas";

/** Returns a frame of a size that draws nothing. */
function frame(name: string, width: number, height = width): AtlasFrame {
  return { name, width, height, draw: vi.fn() };
}

/** Says where a frame of the atlas lies: its corner and its size. */
function placeOf(
  scene: Scene,
  name: string,
): { x: number; y: number; width: number; height: number } {
  const found = scene.textures.get("atlas").get(name);
  return {
    x: found.cutX,
    y: found.cutY,
    width: found.cutWidth,
    height: found.cutHeight,
  };
}

/** Returns the atlas's frames' names, but its base. */
function frameNames(scene: Scene): string[] {
  return scene.textures.get("atlas").getFrameNames();
}

describe("bakeAtlas", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene to bake in. */
  async function startScene(): Promise<SceneRun<HostedScene>> {
    run = await runBareScene();
    return run;
  }

  afterEach(() => {
    run?.destroy();
    run = null;
    vi.restoreAllMocks();
  });

  it("names each frame, at its size", async () => {
    const { scene } = await startScene();

    bakeAtlas(scene, "atlas", [frame("brick", 20, 10), frame("ball", 6)]);

    expect(
      ["brick", "ball"].map((name) => {
        const { width, height } = placeOf(scene, name);
        return [width, height];
      }),
    ).toEqual([
      [20, 10],
      [6, 6],
    ]);
  });

  it("packs the frames in rows about as wide as the atlas is tall, a gutter between", async () => {
    const { scene } = await startScene();
    const squares = ["a", "b", "c", "d"].map((name) => frame(name, 10));

    bakeAtlas(scene, "atlas", squares);

    // Four squares of 10, each 12 with its gutter, pack two to a row.
    const texture = scene.textures.get("atlas");
    expect({
      places: ["a", "b", "c", "d"].map((name) => {
        const { x, y } = placeOf(scene, name);
        return [x, y];
      }),
      size: [texture.source[0]?.width, texture.source[0]?.height],
    }).toEqual({
      places: [
        [0, 0],
        [12, 0],
        [0, 12],
        [12, 12],
      ],
      size: [22, 22],
    });
  });

  it("draws each frame once", async () => {
    const { scene } = await startScene();
    const brick = frame("brick", 20, 10);
    const ball = frame("ball", 6);

    bakeAtlas(scene, "atlas", [brick, ball]);

    expect([
      vi.mocked(brick.draw).mock.calls.length,
      vi.mocked(ball.draw).mock.calls.length,
    ]).toEqual([1, 1]);
  });

  // A headless canvas keeps no pixels, so this watches the moves themselves.
  it("draws each frame from its own corner", async () => {
    const { scene } = await startScene();
    const moves = vi.spyOn(GameObjects.Graphics.prototype, "translateCanvas");

    bakeAtlas(scene, "atlas", [frame("brick", 20, 10), frame("ball", 6)]);

    // The brick is as wide as the atlas, so the ball is a row down.
    expect(moves.mock.calls).toEqual([
      [0, 0],
      [0, 10 + ATLAS_GUTTER],
    ]);
  });

  it("moves its frames when baked again, keeping each frame's object", async () => {
    const { scene } = await startScene();
    bakeAtlas(scene, "atlas", [frame("brick", 20, 10), frame("ball", 6)]);
    const ball = scene.textures.get("atlas").get("ball");

    bakeAtlas(scene, "atlas", [frame("brick", 40, 20), frame("ball", 12)]);

    // The brick, 40 wide, is as wide as the atlas, so the ball is a row down.
    expect({
      same: scene.textures.get("atlas").get("ball") === ball,
      place: placeOf(scene, "ball"),
    }).toEqual({
      same: true,
      place: { x: 0, y: 20 + ATLAS_GUTTER, width: 12, height: 12 },
    });
  });

  it("maps a moved frame onto the atlas at its new size", async () => {
    const { scene } = await startScene();
    bakeAtlas(scene, "atlas", [frame("brick", 20, 10), frame("ball", 6)]);

    bakeAtlas(scene, "atlas", [frame("brick", 30, 20), frame("ball", 12)]);

    // The atlas is now 30 wide and 34 tall, the ball 12 a side at its left,
    // a row down; Phaser 4 counts v up from the bottom.
    const ball = scene.textures.get("atlas").get("ball");
    expect({
      left: ball.u0 * 30,
      right: ball.u1 * 30,
      top: Math.round((1 - ball.v0) * 34),
      bottom: Math.round((1 - ball.v1) * 34),
    }).toEqual({ left: 0, right: 12, top: 22, bottom: 34 });
  });

  it("gives an image its frame's new size once it sets the frame again", async () => {
    const { scene } = await startScene();
    bakeAtlas(scene, "atlas", [frame("ball", 6)]);
    const image = scene.add.image(0, 0, "atlas", "ball");
    bakeAtlas(scene, "atlas", [frame("ball", 12)]);

    image.setFrame("ball");

    expect([image.width, image.displayOriginX]).toEqual([12, 6]);
  });

  it("drops the frames a new bake leaves out", async () => {
    const { scene } = await startScene();
    bakeAtlas(scene, "atlas", [frame("brick", 20, 10), frame("ball", 6)]);

    bakeAtlas(scene, "atlas", [frame("ball", 6), frame("bolt", 2, 8)]);

    expect(frameNames(scene).sort()).toEqual(["ball", "bolt"]);
  });

  it("draws every frame again, and keeps them, once a lost context is restored", async () => {
    const baking = await startScene();
    const brick = frame("brick", 20, 10);
    bakeAtlas(baking.scene, "atlas", [brick]);
    await baking.loseContext();

    await baking.restoreContext();

    expect({
      draws: vi.mocked(brick.draw).mock.calls.length,
      place: placeOf(baking.scene, "brick"),
    }).toEqual({ draws: 2, place: { x: 0, y: 0, width: 20, height: 10 } });
  });

  it("refuses two frames of one name", async () => {
    const { scene } = await startScene();

    expect(() => {
      bakeAtlas(scene, "atlas", [frame("ball", 6), frame("ball", 8)]);
    }).toThrow('Two atlas frames are named "ball".');
  });

  it("refuses a frame named as Phaser names a texture's whole", async () => {
    const { scene } = await startScene();

    expect(() => {
      bakeAtlas(scene, "atlas", [frame("__BASE", 6)]);
    }).toThrow('An atlas frame can\'t be named "__BASE".');
  });

  it.each([
    [6.5, 6],
    [6, 0],
  ])("refuses a frame of %f × %f, not whole pixels", async (width, height) => {
    const { scene } = await startScene();

    expect(() => {
      bakeAtlas(scene, "atlas", [frame("ball", width, height)]);
    }).toThrow("not whole pixels above 0");
  });

  it("refuses frames too large for any device", async () => {
    const { scene } = await startScene();

    expect(() => {
      bakeAtlas(scene, "atlas", [frame("wall", 5000, 10)]);
    }).toThrow("larger than 4096 a side");
  });

  it("bakes no frames into a texture of a pixel", async () => {
    const { scene } = await startScene();

    bakeAtlas(scene, "atlas", []);

    const texture: Textures.Texture = scene.textures.get("atlas");
    expect([texture.source[0]?.width, frameNames(scene)]).toEqual([1, []]);
  });
});
