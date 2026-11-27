import { noteVolumeOf, waveCentsOf } from "./ladder";

describe("waveCentsOf", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 200],
    [10, 2100],
    [14, 2100],
  ])("raises wave %i's note by %i cents", (wave, cents) => {
    expect(waveCentsOf(wave)).toBe(cents);
  });
});

describe("noteVolumeOf", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, -0.4],
    [10, -3.6],
    [14, -3.6],
  ])("plays wave %i's note %f dB from the first's", (wave, decibels) => {
    expect(20 * Math.log10(noteVolumeOf(wave))).toBeCloseTo(decibels, 6);
  });
});
