import { designText } from "../../testing/design_files";
import {
  LADDER_CENTS,
  noteVolumeOf,
  onRung,
  rungCentsOf,
  takesOf,
  TOP_RUNG,
} from "./ladder";

/** The design's words, each run of spaces and line breaks one space. */
const DESIGN = designText("design.md").replaceAll(/\s+/g, " ");

/** How far each note's letter lies above C in its octave, in cents. */
const NOTE_CENTS: Readonly<Record<string, number>> = {
  C: 0,
  D: 200,
  E: 400,
  F: 500,
  G: 700,
  A: 900,
  B: 1100,
};

/** The notes the design's ladder climbs, such as "D5". */
const [, LADDER_NOTES = ""] =
  /climbs one step of C major pentatonic: (C5(?:, [A-G]\d)+)\./.exec(DESIGN) ??
  [];

/** Returns how far a note, such as "E6", lies above C5, in cents. */
function centsAboveC5(note: string): number {
  const [letter = "", octave = ""] = note;
  return (NOTE_CENTS[letter] ?? Number.NaN) + (Number(octave) - 5) * 1200;
}

describe("LADDER_CENTS", () => {
  it("climbs the design's notes, C5 to A6, a rung a note", () => {
    expect(LADDER_CENTS).toEqual(LADDER_NOTES.split(", ").map(centsAboveC5));
  });
});

describe("rungCentsOf", () => {
  it.each([
    [0, 0],
    [3, 700],
    [9, 2100],
    [14, 2100],
  ])("tunes rung %i up %i cents", (rung, cents) => {
    expect(rungCentsOf(rung)).toBe(cents);
  });
});

describe("TOP_RUNG", () => {
  it("is the last rung, at which a rung past it plays", () => {
    expect(rungCentsOf(TOP_RUNG + 1)).toBe(rungCentsOf(TOP_RUNG));
    expect(rungCentsOf(TOP_RUNG - 1)).toBeLessThan(rungCentsOf(TOP_RUNG));
  });
});

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
