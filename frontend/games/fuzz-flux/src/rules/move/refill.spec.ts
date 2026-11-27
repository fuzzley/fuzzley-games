import { KIND_IDS } from "../catalog/kinds";
import { refillKind } from "./refill";

/** A game's deal, kinds and frame, as a refill's draw reads them: seed 3, every kind, the screen's frame. */
const GAME = { seed: 3, kinds: KIND_IDS, turns: 0 } as const;

describe("refillKind", () => {
  // The first fuzzball each lane let in on the sketch's deal of seed 3, in
  // the move fixtures' bunch of 3.
  it("draws what the sketch's lanes let in first on a deal", () => {
    const kinds = [0, 1, 2].map((lane) => refillKind(GAME, lane, 0));

    expect(kinds).toEqual(["pink", "red", "amber"]);
  });

  // The fuzzball the sketch let in once the wind turned, in the move
  // fixtures' wind turning, on the deal of seed 2.
  it("draws what the sketch let in down a frame turned a quarter, a lane's draws its own in each frame", () => {
    const kinds = ([0, 1] as const).map((turns) =>
      refillKind({ ...GAME, seed: 2, turns }, 1, 0),
    );

    expect(kinds).toEqual(["pink", "green"]);
  });

  it("draws a lane's next fuzzball by how many it has let in", () => {
    const kinds = [0, 1, 2, 3].map((letIn) => refillKind(GAME, 0, letIn));

    expect(kinds).toEqual(["pink", "pink", "red", "green"]);
  });

  it("draws only the kinds in play, by their places", () => {
    const kinds = ["amber", "blue"] as const;

    expect(refillKind({ ...GAME, kinds }, 0, 0)).toBe("blue");
  });
});
