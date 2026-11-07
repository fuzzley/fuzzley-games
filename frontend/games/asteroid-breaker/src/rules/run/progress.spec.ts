import { type WaveData, wavesOf } from "../waves/waves";
import { isOpen, reachedOf, sectorSpans } from "./progress";

/** Returns a wave of one small stone. */
function waveOf(id: string): WaveData {
  return {
    id,
    name: id,
    rocks: [{ kind: "stone", size: "small", count: 1 }],
  };
}

/** Two sectors of two waves each. */
const WAVES = wavesOf([
  { id: "near", name: "Near", drops: 0, waves: [waveOf("a"), waveOf("b")] },
  { id: "far", name: "Far", drops: 0, waves: [waveOf("c"), waveOf("d")] },
]);

describe("sectorSpans", () => {
  it("names each sector once, with its first and last waves' numbers", () => {
    expect(sectorSpans(WAVES)).toEqual([
      { id: "near", name: "Near", firstWave: 1, lastWave: 2 },
      { id: "far", name: "Far", firstWave: 3, lastWave: 4 },
      { id: "endless", name: "Endless", firstWave: 5, lastWave: null },
    ]);
  });
});

describe("isOpen", () => {
  it("opens the first sector from the start", () => {
    expect(isOpen(WAVES, new Set(), "near")).toBe(true);
  });

  it("keeps a later sector shut until a run has reached it", () => {
    expect(isOpen(WAVES, new Set(), "far")).toBe(false);
  });

  it("opens a later sector a run has reached", () => {
    expect(isOpen(WAVES, new Set(["far"]), "far")).toBe(true);
  });

  it("keeps Endless shut until a run has reached it", () => {
    expect([
      isOpen(WAVES, new Set(["far"]), "endless"),
      isOpen(WAVES, new Set(["far", "endless"]), "endless"),
    ]).toEqual([false, true]);
  });
});

describe("reachedOf", () => {
  it("takes back the sectors it stored, Endless among them", () => {
    expect(reachedOf(["far", "endless"], WAVES)).toEqual(
      new Set(["far", "endless"]),
    );
  });

  it("drops a sector the game no longer has, and what isn't a sector's id", () => {
    expect(reachedOf(["far", "gone", 3], WAVES)).toEqual(new Set(["far"]));
  });

  it("starts a player who has none with none reached", () => {
    expect(reachedOf(undefined, WAVES)).toEqual(new Set());
  });
});
