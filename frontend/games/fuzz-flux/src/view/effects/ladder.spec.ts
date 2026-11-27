import { noteVolumeOf, onRung, takesOf } from "./ladder";

describe("takesOf", () => {
  it("holds a laddered sound at the foot under its own name, and at G5, D6 and A6 under theirs", () => {
    expect(takesOf("zap")).toEqual([
      { sound: "zap", rung: 1 },
      { sound: "zap-g5", rung: 4 },
      { sound: "zap-d6", rung: 7 },
      { sound: "zap-a6", rung: 10 },
    ]);
  });
});

describe("onRung", () => {
  it.each([
    [0, "note", 0],
    [1, "note", 0],
    [2, "note", 200],
    [3, "note-g5", -300],
    [4, "note-g5", 0],
    [5, "note-g5", 200],
    [6, "note-d6", -200],
    [7, "note-d6", 0],
    [8, "note-d6", 200],
    [9, "note-a6", -200],
    [10, "note-a6", 0],
    [14, "note-a6", 0],
  ])("plays rung %i from %s, %i cents off", (rung, sound, cents) => {
    expect(onRung("note", rung)).toEqual({ sound, cents });
  });
});

describe("noteVolumeOf", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, -0.4],
    [10, -3.6],
    [14, -3.6],
  ])("plays rung %i's note %f dB from the foot's", (rung, decibels) => {
    expect(20 * Math.log10(noteVolumeOf(rung))).toBeCloseTo(decibels, 6);
  });
});
