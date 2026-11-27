import { THEMES, type Theme } from "../themes.ts";
import {
  type ContrastPair,
  GRAPHIC,
  TEXT,
  against,
  contrastOf,
  expectContrast,
  holdContrast,
} from "./contrast";

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** A grey that keeps 3.95:1 against white: over 3, under 4.5. */
const GREY = 0x808080;

/** Returns a pair of a color on another, held to a contrast. */
function pair(color: number, under: number, least: number): ContrastPair {
  return { name: "mark", color, on: "tile", under, least };
}

/**
 * Returns a pair that keeps its contrast and notes, each time a case reads
 * its least, that case and this pair, noting nothing when a case's title
 * reads it outside any case; a case that reads it must then assert.
 */
function watchedPair(name: string, readIn: string[]): ContrastPair {
  return {
    name,
    color: BLACK,
    on: "tile",
    under: WHITE,
    get least(): number {
      const test = expect.getState().currentTestName;
      if (test !== undefined) {
        readIn.push(`${test} reads the ${name}`);
        expect.hasAssertions();
      }
      return TEXT;
    },
  };
}

describe("against", () => {
  it("pairs each color with what they lie on, at 3:1", () => {
    expect(
      against("field", WHITE, [
        ["guide", BLACK],
        ["spark", GREY],
      ]),
    ).toEqual([
      {
        name: "guide",
        color: BLACK,
        on: "field",
        under: WHITE,
        least: GRAPHIC,
      },
      { name: "spark", color: GREY, on: "field", under: WHITE, least: GRAPHIC },
    ]);
  });

  it("holds them to the contrast it is given", () => {
    const [text] = against("lintel", WHITE, [["count", BLACK]], TEXT);

    expect(text?.least).toBe(TEXT);
  });
});

describe("contrastOf", () => {
  it.each([
    [BLACK, WHITE, 21],
    [WHITE, BLACK, 21],
    [GREY, GREY, 1],
  ])("measures %s on %s at %d:1", (color, under, ratio) => {
    expect(contrastOf(pair(color, under, GRAPHIC))).toBeCloseTo(ratio, 6);
  });
});

describe("expectContrast", () => {
  it("passes a pair that keeps its least", () => {
    expect(() => {
      expectContrast(pair(GREY, WHITE, GRAPHIC));
    }).not.toThrow();
  });

  it("fails a pair that keeps less, naming it", () => {
    expect(() => {
      expectContrast(pair(GREY, WHITE, TEXT));
    }).toThrow(/the mark on the tile/);
  });
});

describe("holdContrast", () => {
  const asked: Theme[] = [];
  const leastsRead: string[] = [];
  const marks = ["first mark", "second mark"] as const;

  describe("a game's list", () => {
    holdContrast((theme) => {
      asked.push(theme);
      return marks.map((mark) => watchedPair(mark, leastsRead));
    });
  });

  it("asks for each palette's pairs once, in the palettes' order", () => {
    expect(asked).toEqual(THEMES);
  });

  // Reads what the list's cases noted as they ran, so it comes after them,
  // and fails when run alone.
  it("holds each pair a palette lists to its least, in a case of its own", () => {
    const reads = THEMES.flatMap(({ name }) =>
      marks.map(
        (mark) =>
          `holdContrast > a game's list > in ${name} > keeps the ${mark} at ${String(TEXT)}:1 or more against the tile reads the ${mark}`,
      ),
    );

    expect(new Set(leastsRead)).toEqual(new Set(reads));
  });
});
