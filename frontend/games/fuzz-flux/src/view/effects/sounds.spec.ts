import { isRecord } from "@fz/core/json";
import { keysOf } from "@fz/core/records";
import { designJson, designText } from "../../testing/design_files";
import { FEEL } from "../timeline/feel";
import { LADDERED, takesOf } from "./ladder";
import { CHEERS, GAPPED, SOUNDS } from "./sounds";

/** The sounds of the design's sprite, by name, each with where it starts in the sprite. */
const SPRITE = designJson("sound/sprite.json");

/** The design's sounds of a bunch of 4 and of 5, whose chords the game plays as the bunch's note and the notes 2 and 4 rungs up. */
const CHORDS = new Set(["note-4", "note-5"]);

/** Returns the sounds the game names for one of the design's: none for a chord, a laddered sound's takes, or the sound itself. */
function gameSoundsOf(name: string): readonly string[] {
  if (CHORDS.has(name)) return [];
  const laddered = LADDERED.find((sound) => sound === name);
  return laddered === undefined
    ? [name]
    : takesOf(laddered).map(({ sound }) => sound);
}

/** The design's measures of its sounds, which say when each plays. */
const MEASURES = designText("sound/measures.md");

/** Each cheer's line in the design's measures, which names its wave. */
const MEASURED_CHEERS = {
  "chirp-1": "| `chirp-1` | A move's 3rd wave.",
  "chirp-2": "| `chirp-2` | Its 5th wave.",
  "chirp-3": "| `chirp-3` | Its 7th wave.",
  "chirp-4": "| `chirp-4` | Its 9th wave.",
} as const satisfies Readonly<Record<keyof typeof CHEERS, string>>;

describe("SOUNDS", () => {
  it("names the design's sounds in the order its sprite holds them, but its chords, and each laddered sound by its takes", () => {
    expect(SOUNDS).toEqual(
      isRecord(SPRITE) ? Object.keys(SPRITE).flatMap(gameSoundsOf) : [],
    );
    expect(SOUNDS).toHaveLength(53);
  });
});

describe("GAPPED", () => {
  it("names each of the feel's sounds' gaps, and nothing else", () => {
    expect(new Set(Object.values(GAPPED))).toEqual(
      new Set(keysOf(FEEL).filter((field) => field.endsWith("SoundGapMs"))),
    );
  });
});

describe("CHEERS", () => {
  it.each(keysOf(CHEERS))("plays %s at the wave its measures name", (sound) => {
    expect(MEASURES).toContain(MEASURED_CHEERS[sound]);
    expect(MEASURED_CHEERS[sound]).toContain(` ${String(CHEERS[sound])}`);
  });
});
