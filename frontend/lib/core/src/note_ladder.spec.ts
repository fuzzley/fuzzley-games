import { CHAIN_CENTS as KIT_CHAIN_CENTS } from "@fz/dev/synth";
import { CHAIN_CENTS, ladderCentsOf } from "./note_ladder";

describe("CHAIN_CENTS", () => {
  it("is the sound kit's ladder, which the chain's sounds were tuned to", () => {
    expect(CHAIN_CENTS).toEqual(KIT_CHAIN_CENTS);
  });
});

describe("ladderCentsOf", () => {
  it.each([
    [1, 0],
    [2, 200],
    [4, 700],
    [5, 1200],
    [10, 2400],
    [20, 3100],
    [40, 3100],
  ])("raises the chain's note %i by %i cents", (note, cents) => {
    expect(ladderCentsOf(note, CHAIN_CENTS)).toBe(cents);
  });

  it("climbs a step of the ladder for each note, from the first", () => {
    const ladder = [100, 300, 700];

    const notes = [1, 2, 3].map((note) => ladderCentsOf(note, ladder));

    expect(notes).toEqual(ladder);
  });

  it.each([0, -3])(
    "holds a note of %i, before the first, at the first's",
    (note) => {
      expect(ladderCentsOf(note, [100, 300, 700])).toBe(100);
    },
  );

  it("raises no note on a ladder of no notes", () => {
    expect(ladderCentsOf(1, [])).toBe(0);
  });
});
