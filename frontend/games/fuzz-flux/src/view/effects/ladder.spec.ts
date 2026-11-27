import { noteVolumeOf, onRung, takesOf } from "./ladder";

describe("takesOf", () => {
  it("holds a laddered sound at the foot under its own name, and at G5, D6 and A6 under theirs", () => {
    expect(takesOf("zap")).toEqual([
      { sound: "zap", rung: 0 },
      { sound: "zap-g5", rung: 3 },
      { sound: "zap-d6", rung: 6 },
      { sound: "zap-a6", rung: 9 },
    ]);
  });
});

describe("onRung", () => {
  it.each([
    [-1, "note", 0],
    [0, "note", 0],
    [1, "note", 200],
    [2, "note-g5", -300],
    [3, "note-g5", 0],
    [4, "note-g5", 200],
    [5, "note-d6", -200],
    [6, "note-d6", 0],
    [7, "note-d6", 200],
    [8, "note-a6", -200],
    [9, "note-a6", 0],
    [13, "note-a6", 0],
  ])("plays rung %i from %s, %i cents off", (rung, sound, cents) => {
    expect(onRung("note", rung)).toEqual({ sound, cents });
  });
});

describe("noteVolumeOf", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [1, -0.4],
    [9, -3.6],
    [13, -3.6],
  ])("plays rung %i's note %f dB from the foot's", (rung, decibels) => {
    expect(20 * Math.log10(noteVolumeOf(rung))).toBeCloseTo(decibels, 6);
  });
});
