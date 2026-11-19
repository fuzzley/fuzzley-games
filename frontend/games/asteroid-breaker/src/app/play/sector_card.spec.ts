import { sectorSpans } from "../../rules/run/progress";
import { ENDLESS, SECTORS, WAVES, waveEntryOf } from "../../rules/waves/waves";
import {
  SECTOR_NEWS,
  describeSector,
  sectorCardOf,
  wavesInWords,
} from "./sector_card";

/**
 * The longest line of what is new that the sector's card was measured with,
 * Endless's second as it was then, from which `board_card.component.scss`
 * steps the card down by the field's height, above the ship waiting in its
 * middle; a longer line could wrap once more and reach the ship, so none
 * grows past it without the card measured again.
 */
const LONGEST_MEASURED =
  "Comets cross every one, and a boulder comes every tenth.";

/** The waves each of the game's sectors spans, Endless last. */
const SPANS = sectorSpans(WAVES);

/** Returns the card over one of the game's waves, if any, at the run's first wave or not. */
function cardAt(
  wave: number,
  opensRun = false,
): ReturnType<typeof sectorCardOf> {
  return sectorCardOf(SPANS, waveEntryOf(WAVES, wave), opensRun);
}

describe("sectorCardOf", () => {
  it("opens a sector with its name, its waves, what is new there and its first wave", () => {
    expect(cardAt(11)).toEqual({
      opensRun: false,
      kicker: "A new sector",
      name: "Iron reach",
      waves: "Waves 11 to 20",
      news: [
        "Iron takes extra hits. Volatile rocks blow up.",
        "Comets fly across. Burrs slow you down until you dash.",
      ],
      wave: "Wave 11, Ore",
    });
  });

  it("opens Endless from its first wave, with no last", () => {
    expect(cardAt(WAVES.length + 1)).toMatchObject({
      name: "Endless",
      waves: "From wave 31",
    });
  });

  it("opens the run at its first wave", () => {
    expect(cardAt(1, true)).toMatchObject({
      opensRun: true,
      kicker: "A new game",
      name: "Inner belt",
      wave: "Wave 1, First light",
    });
  });

  it("opens the run where it starts, though that is no sector's first wave", () => {
    expect(cardAt(4, true)).toMatchObject({
      kicker: "A new game",
      name: "Inner belt",
      wave: "Wave 4, Thaw",
    });
  });

  it.each([
    ["a sector's later wave", 12],
    ["a later wave of Endless's", WAVES.length + 2],
  ])("lays no card over %s gone on to", (_, wave) => {
    expect(cardAt(wave)).toBeNull();
  });

  it("says nothing new of a sector the game doesn't write of", () => {
    const spans = [{ id: "far", name: "Far", firstWave: 1, lastWave: 2 }];
    const entry = {
      number: 1,
      sector: { id: "far", name: "Far", drops: 0, waves: [] },
      data: { id: "far-1", name: "Far", rocks: [] },
    };

    expect(sectorCardOf(spans, entry, true)?.news).toEqual([]);
  });
});

describe("SECTOR_NEWS", () => {
  it("says what is new in every one of the game's sectors, Endless among them", () => {
    const ids = [...SECTORS, ENDLESS].map(({ id }) => id);

    expect(Object.keys(SECTOR_NEWS).sort()).toEqual(ids.sort());
  });

  it.each(Object.entries(SECTOR_NEWS))(
    "says what is new in %s in a sentence or two",
    (_, news) => {
      expect([1, 2]).toContain(news.length);
    },
  );

  it.each(Object.entries(SECTOR_NEWS))(
    "says what is new in %s in lines no longer than the sector's card was measured with",
    (_, news) => {
      expect(Math.max(...news.map(({ length }) => length))).toBeLessThanOrEqual(
        LONGEST_MEASURED.length,
      );
    },
  );
});

describe("describeSector", () => {
  it("says what the card opens, the sector, its waves, what is new there and the wave, which starts as the ship flies", () => {
    const card = cardAt(11);
    if (!card) throw new Error("Wave 11 opens no sector.");

    expect(describeSector(card, "Wave 11, Ore. 9 rocks.")).toBe(
      "A new sector: Iron reach. Waves 11 to 20. Iron takes extra hits. Volatile rocks blow up. Comets fly across. Burrs slow you down until you dash. Wave 11, Ore. 9 rocks. It starts when you fly.",
    );
  });
});

describe("wavesInWords", () => {
  it.each<[number, number | null, string]>([
    [1, 10, "Waves 1 to 10"],
    [6, 6, "Wave 6"],
    [31, null, "From wave 31"],
  ])("writes waves %d to %s as %s", (first, last, words) => {
    expect(wavesInWords(first, last)).toBe(words);
  });
});
