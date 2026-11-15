import { WEAPON_IDS } from "../../rules/catalog/weapons";
import {
  type Board,
  metricsOf,
  onCanvas,
  shown,
  startBoard,
} from "../../testing/belt_board";
import { placeShot } from "../../testing/field_picture";
import { SHOT_FRAMES, SHOT_REACH } from "../../view/art/energy";

/** Returns the frame the first shot slot's image shows. */
function frameShown(board: Board): string | undefined {
  return board.scene.kit.shots.shots[0]?.images[0]?.frame.name;
}

describe("the shots", () => {
  it.each(WEAPON_IDS)("draw a %s's shot in its own frame", async (weapon) => {
    const board = await startBoard();
    placeShot(board.shell.field, weapon, 30, 20);

    board.run.advance(16);

    expect(frameShown(board)).toBe(SHOT_FRAMES[weapon]);
  });

  it("draw the next shot a slot holds in its own weapon's frame", async () => {
    const board = await startBoard();
    const shot = placeShot(board.shell.field, "lance", 30, 20);
    board.run.advance(16);
    shot.weapon = "rapid";

    board.run.advance(16);

    expect(frameShown(board)).toBe(SHOT_FRAMES.rapid);
  });

  it("draw a lance's shot past an edge it lies nearer than its frame reaches", async () => {
    const board = await startBoard();
    const { width } = board.shell.field.torus;
    const x = width - (SHOT_REACH.lance - 0.1);
    placeShot(board.shell.field, "lance", x, 20);
    const metrics = metricsOf(board.shell);

    board.run.advance(16);

    expect(shown(board.scene.kit.shots.shots[0])).toEqual([
      onCanvas(metrics, x, 20),
      onCanvas(metrics, x - width, 20),
      null,
      null,
    ]);
  });

  it("draw a gun's shot as near an edge once, its frame reaching less far than a lance's", async () => {
    const board = await startBoard();
    const { width } = board.shell.field.torus;
    const x = width - (SHOT_REACH.lance - 0.1);
    placeShot(board.shell.field, "gun", x, 20);
    const metrics = metricsOf(board.shell);

    board.run.advance(16);

    expect(shown(board.scene.kit.shots.shots[0])).toEqual([
      onCanvas(metrics, x, 20),
      null,
      null,
      null,
    ]);
  });
});
