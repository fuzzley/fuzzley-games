import type { GameObjects } from "phaser";
import {
  type Board,
  layersOf,
  metricsOf,
  startBoard,
} from "../testing/belt_board";
import { placeRock } from "../testing/field_picture";
import { MUZZLE_FRAME } from "../view/art/energy";
import { ATLAS } from "./atlas";
import { sendToBack } from "./layer_order";
import { Copies } from "./painters/copies";

/** Returns the images of the rocks' bodies that show, slot by slot. */
function shownBodies({ scene }: Board): readonly GameObjects.Image[] {
  return scene.kit.rocks.bodies.flatMap((body) =>
    body.images.filter((image) => image.visible),
  );
}

describe("the field's layers", () => {
  it("hold only what shows, so the render passes over nothing hidden", async () => {
    const board = await startBoard();
    placeRock(board.shell.field, "medium", 20, 20);

    board.run.advance(16);

    expect(layersOf(board.scene).get("rocks")?.getChildren()).toEqual(
      shownBodies(board),
    );
  });

  it("draw what shows in the order it first joined its layer, however often it hides and shows again", async () => {
    const board = await startBoard();
    const first = board.shell.field.rocks.find((rock) => rock.live);
    if (!first) throw new Error("The field holds no rock.");
    placeRock(board.shell.field, "medium", 20, 20);
    board.run.advance(16);
    first.live = false;
    board.run.advance(16);

    first.live = true;
    board.run.advance(16);

    expect(layersOf(board.scene).get("rocks")?.getChildren()).toEqual(
      shownBodies(board),
    );
  });

  it("destroy what hides out of them as the scene ends", async () => {
    const { run, scene } = await startBoard();
    const hidden = scene.kit.rocks.bodies.at(-1)?.images[3];

    scene.scene.stop();
    run.advance(16);

    expect({ out: hidden?.displayList, scene: hidden?.scene }).toEqual({
      out: null,
      scene: undefined,
    });
  });
});

describe("sendToBack()", () => {
  it("has a layer draw what it sends under all the layer holds, each under the one before it, as it shows", async () => {
    const { shell, run, scene } = await startBoard();
    const rocks = layersOf(scene).get("rocks");
    if (!rocks) throw new Error("The scene has no rocks' layer.");
    const copies = new Copies(scene, rocks, MUZZLE_FRAME);
    copies.sendToBack();
    placeRock(shell.field, "medium", 20, 20);

    copies.show(0.5, 20, 2, metricsOf(shell), shell.field.torus);
    run.advance(16);

    expect(rocks.getChildren().slice(0, 2)).toEqual([
      copies.images[1],
      copies.images[0],
    ]);
  });

  it("can't send to the back of a layer that keeps no order", async () => {
    const { scene } = await startBoard();
    const layer = scene.add.layer();
    const image = scene.add.image(0, 0, ATLAS, MUZZLE_FRAME);

    const send = (): void => {
      sendToBack(layer, [image]);
    };

    expect(send).toThrow(/keepJoinOrder/);
  });

  it("can't send what hasn't joined a layer to its back", async () => {
    const { scene } = await startBoard();
    const layers = layersOf(scene);
    const rocks = layers.get("rocks");
    const tags = layers.get("tags");
    if (!rocks || !tags) throw new Error("The scene lacks a layer.");
    const image = scene.add.image(0, 0, ATLAS, MUZZLE_FRAME);
    tags.add(image);

    const send = (): void => {
      sendToBack(rocks, [image]);
    };

    expect(send).toThrow(/joined/);
  });
});
