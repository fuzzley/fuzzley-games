import { noteVolumeOf } from "../../effects/ladder";
import { FEEL } from "../feel";
import { chordOf } from "./chord";

describe("chordOf", () => {
  it("plays a bunch of 3's root alone, on its rung, as loud as a share of a note's there", () => {
    expect(chordOf(3, 2, 100, 0.7, FEEL)).toEqual([
      {
        what: "sound",
        atMs: 100,
        sound: "note",
        rung: 2,
        volume: 0.7 * noteVolumeOf(2),
      },
    ]);
  });

  it("plays a bunch of 4's second note rungs above the root, a moment later and softer", () => {
    expect(chordOf(4, 2, 100, 1, FEEL)).toEqual([
      {
        what: "sound",
        atMs: 100,
        sound: "note",
        rung: 2,
        volume: noteVolumeOf(2),
      },
      {
        what: "sound",
        atMs: 100 + FEEL.chordGapMs,
        sound: "note",
        rung: 2 + FEEL.chordRungs,
        volume: FEEL.chordSecondVolume * noteVolumeOf(2),
      },
    ]);
  });

  it("plays no more than three notes for a bigger bunch", () => {
    expect(chordOf(9, 0, 100, 1, FEEL)).toHaveLength(3);
  });

  it("plays a bunch of 5 or more a third note as far again above the second, softer still", () => {
    expect(chordOf(5, 1, 100, 0.5, FEEL).at(-1)).toEqual({
      what: "sound",
      atMs: 100 + 2 * FEEL.chordGapMs,
      sound: "note",
      rung: 1 + 2 * FEEL.chordRungs,
      volume: 0.5 * FEEL.chordThirdVolume * noteVolumeOf(1),
    });
  });
});
