import { startBoard } from "../../testing/belt_board";
import { MUZZLE_FRAME } from "../../view/art/energy";
import { Copies } from "./copies";

describe("Copies", () => {
  it("can't be made in a layer that keeps no order its copies can return to", async () => {
    const { scene } = await startBoard();
    const layer = scene.add.layer();

    const make = (): Copies => new Copies(scene, layer, MUZZLE_FRAME);

    expect(make).toThrow(/keepJoinOrder/);
  });
});
