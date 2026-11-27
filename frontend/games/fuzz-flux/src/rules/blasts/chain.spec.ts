import { isOneOf } from "@fz/core/records";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { DESIGN_PARTS, NO_PART } from "../../testing/made_up_rules";
import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import type { Game } from "../board/board";
import { findBunches } from "../bunches/find";
import type { ElementId } from "../catalog/elements";
import type { KindId } from "../catalog/kinds";
import { MADE_IDS } from "../catalog/specials";
import type { ElementRule } from "../elements/element_rule";
import { type StruckWave, strikeWave } from "./chain";
import type { SetOff } from "./striking";

/** The moves played by hand whose first wave sets off a special alone, which goes off where it lands. */
const SETTING_OFF = [
  "dasherGoesOff",
  "pufferGoesOff",
  "wispGoesOff",
  "frizzballGoesOff",
  "dasherSetsOffPuffer",
  "cageOpened",
  "sleepyheadRuffled",
] as const satisfies readonly (keyof typeof MOVE_FIXTURES)[];

/** Every element's rule giving every square a worth to a wisp, and taking no other part. */
const EVERY_SQUARE_WORTH: Readonly<Record<ElementId, ElementRule>> = {
  ...NO_PART,
  dust: { wisp: { rank: 0, worth: () => 1 } },
};

/**
 * Returns what a wave strikes on a board drawn as a picture: the bunches
 * standing on it gathered, and then what they and the move set off.
 */
function struckOn(
  picture: BoardPicture | readonly string[],
  setOff: readonly SetOff[],
  options: GameOptions = {},
  rules: Readonly<Record<ElementId, ElementRule>> = NO_PART,
): StruckWave {
  const game = gameFrom(picture, options);
  return strikeWave(game, findBunches(game.board, null), setOff, rules);
}

/** Returns a special the move sets off on an empty square, as a swap or a tap leaves it. */
function setOffAt(
  what: SetOff["what"],
  square: number,
  kind: KindId = "red",
): SetOff {
  return { what, square, piece: 99, kind };
}

/**
 * Returns a move played by hand's game as its swap leaves it, each special
 * its first wave sets off taken off the board, and what it sets off.
 */
function swappedIn({ picture, options, record }: MoveFixture): {
  readonly game: Game;
  readonly setOff: readonly SetOff[];
} {
  const game = gameFrom(picture, options);
  const { from, to } = record.swap;
  const pieces = [...game.board.pieces];
  [pieces[from], pieces[to]] = [pieces[to] ?? null, pieces[from] ?? null];
  const setOff = (record.waves[0]?.blasts ?? []).flatMap(
    ({ what, square, piece, kind, setOffBy }) =>
      setOffBy === null && isOneOf(what, MADE_IDS) && kind !== null
        ? [{ what, square, piece, kind }]
        : [],
  );
  for (const { square } of setOff) {
    pieces[square] = null;
  }
  return { game: { ...game, board: { ...game.board, pieces } }, setOff };
}

describe("strikeWave", () => {
  it.each(SETTING_OFF)(
    "sets off and hits what the sketch did in the first wave, in %s",
    (name) => {
      const fixture = MOVE_FIXTURES[name];
      const { game, setOff } = swappedIn(fixture);
      const [wave] = fixture.record.waves;

      const { blasts, hits } = strikeWave(game, [], setOff, DESIGN_PARTS);

      expect({ blasts, hits }).toEqual({
        blasts: wave.blasts,
        hits: wave.hits,
      });
    },
  );

  it("sets off each special a blast gathers, to go off once every blast set off before it has", () => {
    const { blasts } = struckOn(
      { pieces: [" gbr", "rbgb"], marks: [".o.|", "..w."] },
      [setOffAt("dasher-across", 0)],
    );

    expect(
      blasts.map(({ what, square, setOffBy, wait }) => ({
        what,
        square,
        setOffBy,
        wait,
      })),
    ).toEqual([
      { what: "dasher-across", square: 0, setOffBy: null, wait: 0 },
      { what: "puffer", square: 1, setOffBy: 0, wait: 1 },
      { what: "dasher-down", square: 3, setOffBy: 0, wait: 3 },
      { what: "wisp", square: 6, setOffBy: 1, wait: 2 },
    ]);
  });

  it("sets off what the bunches set off before what the move does", () => {
    const { blasts } = struckOn(
      { pieces: ["bbb", "r g"], marks: ["o..", "..."] },
      [setOffAt("dasher-down", 4)],
    );

    expect(blasts.map(({ what }) => what)).toEqual(["puffer", "dasher-down"]);
  });

  it("strikes nothing a bunch of the wave made", () => {
    const { blasts, game } = struckOn(
      ["bbbb "],
      [setOffAt("dasher-across", 4)],
    );

    expect({
      blasts: blasts.map(({ what }) => what),
      made: game.board.pieces[1],
    }).toEqual({
      blasts: ["dasher-across"],
      made: {
        what: "fuzzball",
        id: 2,
        kind: "blue",
        special: "dasher-down",
        caged: false,
        burred: false,
      },
    });
  });

  it("sweeps under a bare square each time a blast strikes it", () => {
    const { hits } = struckOn(
      { pieces: ["  g", "rbr"], marks: ["..o", "..."], dust: ["020", "000"] },
      [setOffAt("dasher-across", 0)],
      { goals: [{ what: "dust" }] },
      DESIGN_PARTS,
    );

    expect(hits.filter(({ what }) => what === "dusted")).toEqual([
      { square: 1, step: 1, blast: 0, what: "dusted", layersLeft: 1 },
      { square: 1, step: 1, blast: 1, what: "dusted", layersLeft: 0 },
    ]);
  });

  it("lets the first element's change take a blast's strike, and gathers nothing there", () => {
    const ruffles: Readonly<Record<ElementId, ElementRule>> = {
      ...NO_PART,
      dust: {
        blasted: (square) => ({ square, hit: "ruffled", counts: false }),
      },
      brick: {
        blasted: (square) => ({ square, hit: "unburred", counts: false }),
      },
    };

    const { hits } = struckOn(
      [" r"],
      [setOffAt("dasher-across", 0)],
      { kinds: ["red", "green"] },
      ruffles,
    );

    expect(hits).toEqual([
      { square: 1, step: 1, blast: 0, what: "ruffled", piece: 1 },
    ]);
  });

  it("leaves a piece no element's rule takes the strike on, and no strike gathers", () => {
    const { hits, game } = struckOn([" 1z"], [setOffAt("dasher-across", 0)], {
      kinds: ["red", "green"],
    });

    expect({
      hits,
      pieces: game.board.pieces.map((piece) => piece?.what),
    }).toEqual({
      hits: [],
      pieces: [undefined, "brick", "sleepyhead"],
    });
  });

  describe("a wisp", () => {
    it("never flies where a wisp of the wave flew", () => {
      const { blasts } = struckOn(
        ["  R", "gbg"],
        [setOffAt("wisp", 0), setOffAt("wisp", 1)],
        {
          kinds: ["red", "green", "blue"],
          goals: [{ what: "cage" }, { what: "gather", kind: "red", count: 5 }],
        },
        DESIGN_PARTS,
      );

      expect(blasts.map(({ strikes }) => strikes)).toEqual([
        [{ square: 2, step: 1 }],
        [{ square: 3, step: 1 }],
      ]);
    });

    it("never flies to a square whose piece the wave gathered", () => {
      const { blasts } = struckOn(
        ["bbb", "rg "],
        [setOffAt("wisp", 5)],
        {},
        EVERY_SQUARE_WORTH,
      );

      expect(blasts[0]?.strikes).toEqual([{ square: 3, step: 1 }]);
    });
  });

  it("sets off the frizzball a blast gathers with the commonest kind, striking each of that kind", () => {
    const { blasts } = struckOn(
      [" fg", "gbg"],
      [setOffAt("dasher-across", 0)],
      { kinds: ["green", "blue"] },
    );

    expect(blasts[1]).toEqual({
      what: "frizzball",
      square: 1,
      piece: 1,
      kind: "green",
      setOffBy: 0,
      wait: 1,
      strikes: [
        { square: 3, step: 1 },
        { square: 5, step: 2 },
      ],
    });
  });

  it("makes what a bunch leaves where its fuzzball was already special once the blasts are done", () => {
    const { blasts, hits, game } = struckOn(
      { pieces: ["bbbb", "rgrg"], marks: [".o..", "...."] },
      [],
    );

    expect({
      blast: blasts[0]?.what,
      last: hits.at(-1),
      made: game.board.pieces[1],
    }).toEqual({
      blast: "puffer",
      last: {
        what: "born",
        square: 1,
        piece: 9,
        made: "dasher-down",
        kind: "blue",
      },
      made: {
        what: "fuzzball",
        id: 9,
        kind: "blue",
        special: "dasher-down",
        caged: false,
        burred: false,
      },
    });
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom({
      pieces: [" gbr", "rbgb"],
      marks: [".o.|", "..w."],
    });
    const before = structuredClone(game);

    strikeWave(game, [], [setOffAt("dasher-across", 0)], DESIGN_PARTS);

    expect(game).toEqual(before);
  });
});
