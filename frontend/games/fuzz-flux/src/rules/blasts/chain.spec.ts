import { isOneOf } from "@fz/core/records";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import { NO_PART } from "../../testing/partial_rules";
import type { Game } from "../board/board";
import { findBunches } from "../bunches/find";
import type { ElementId } from "../catalog/elements";
import type { KindId } from "../catalog/kinds";
import { type BlastId, MADE_IDS } from "../catalog/specials";
import type { ElementRule } from "../elements/element_rule";
import { ELEMENT_RULES } from "../elements/element_rules";
import type { Blast, Strike } from "../move/record";
import { type StruckWave, strikeWave } from "./chain";
import type { SetOff } from "./striking";

/** The moves played by hand whose first wave sets off a special, the frizzball or a pair, which goes off where it lands. */
const SETTING_OFF = [
  "dasherGoesOff",
  "pufferGoesOff",
  "wispGoesOff",
  "frizzballGoesOff",
  "dasherSetsOffPuffer",
  "cageOpened",
  "sleepyheadRuffled",
  "twoDashers",
  "wispCarriesDasher",
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
  what: Exclude<BlastId, "two-frizzballs">,
  square: number,
  kind: KindId = "red",
): SetOff {
  return { what, square, piece: 99, kind };
}

/** Returns the strikes listed, each a square and its step. */
function strikesOf(
  ...strikes: readonly (readonly [number, number])[]
): readonly Strike[] {
  return strikes.map(([square, step]) => ({ square, step }));
}

/**
 * Returns a move played by hand's game as its swap leaves it, each special
 * its first wave sets off taken off the board, both a pair's, and what it
 * sets off.
 */
function swappedIn({ picture, options, record }: MoveFixture): {
  readonly game: Game;
  readonly setOff: readonly SetOff[];
} {
  const game = gameFrom(picture, options);
  const { from, to } = record.swap;
  const pieces = [...game.board.pieces];
  [pieces[from], pieces[to]] = [pieces[to] ?? null, pieces[from] ?? null];
  const setOff = (record.waves[0]?.blasts ?? []).flatMap((blast) =>
    blast.setOffBy === null ? setOffOf(blast) : [],
  );
  for (const { what, square } of setOff) {
    pieces[square] = null;
    if (!isOneOf(what, MADE_IDS)) {
      pieces[from] = null;
    }
  }
  return { game: { ...game, board: { ...game.board, pieces } }, setOff };
}

/** Returns what the sketch set off, as the move sets it off. */
function setOffOf({ what, square, piece, kind }: Blast): readonly SetOff[] {
  if (what === "two-frizzballs") {
    return [{ what, square, piece, kind: null }];
  }
  return kind === null ? [] : [{ what, square, piece, kind }];
}

describe("strikeWave", () => {
  it.each(SETTING_OFF)(
    "sets off and hits what the sketch did in the first wave, in %s",
    (name) => {
      const fixture = MOVE_FIXTURES[name];
      const { game, setOff } = swappedIn(fixture);
      const [wave] = fixture.record.waves;

      const { blasts, hits } = strikeWave(game, [], setOff, ELEMENT_RULES);

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
      ELEMENT_RULES,
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
        ELEMENT_RULES,
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

  describe("a pair", () => {
    it.each([
      {
        setOff: { what: "two-dashers", square: 4, piece: 99, kind: "red" },
        picture: ["   ", "   ", "   "],
        strikes: strikesOf([4, 0], [1, 1], [3, 1], [5, 1], [7, 1]),
      },
      {
        setOff: {
          what: "dasher-and-puffer",
          square: 4,
          piece: 99,
          kind: "red",
        },
        picture: ["   ", "   ", "   "],
        strikes: strikesOf(
          [1, 0],
          [3, 0],
          [4, 0],
          [0, 1],
          [2, 1],
          [5, 1],
          [6, 1],
          [7, 1],
          [8, 1],
        ),
      },
      {
        setOff: { what: "two-puffers", square: 0, piece: 99, kind: "red" },
        picture: ["       "],
        strikes: strikesOf([0, 0], [1, 1], [2, 2], [3, 3], [4, 4]),
      },
      {
        setOff: { what: "two-frizzballs", square: 0, piece: 99, kind: null },
        picture: ["       "],
        strikes: strikesOf(
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
          [4, 4],
          [5, 5],
          [6, 6],
        ),
      },
    ] as const satisfies readonly {
      readonly setOff: SetOff;
      readonly picture: readonly string[];
      readonly strikes: readonly Strike[];
    }[])(
      "strikes the squares $setOff.what reach",
      ({ setOff, picture, strikes }) => {
        const { blasts } = struckOn(picture, [setOff]);

        expect(blasts.map((blast) => blast.strikes)).toEqual([strikes]);
      },
    );

    it("flies two wisps' 3 wisps in turn, each to a square of its own, at steps 1 to 3", () => {
      const { blasts, hits } = struckOn(
        [" rr", "gbr"],
        [setOffAt("two-wisps", 0)],
        { goals: [{ what: "gather", kind: "red", count: 5 }] },
      );

      expect({
        strikes: blasts.map((blast) => blast.strikes),
        gathered: hits.map(({ square }) => square),
      }).toEqual({
        strikes: [strikesOf([5, 1], [2, 2], [1, 3])],
        gathered: [5, 2, 1],
      });
    });

    it("flies no wisp of two wisps once one finds nowhere worth flying to", () => {
      const { blasts } = struckOn([" r"], [setOffAt("two-wisps", 0)]);

      expect(blasts.map((blast) => blast.strikes)).toEqual([strikesOf([1, 1])]);
    });

    it.each([
      ["wisp-and-dasher-across", "dasher-across"],
      ["wisp-and-dasher-down", "dasher-down"],
      ["wisp-and-puffer", "puffer"],
    ] as const)(
      "sets off the %s's %s where the wisp lands, with the wisp's kind, to wait a step",
      (pair, carried) => {
        const { blasts } = struckOn(
          ["  r", "ggb"],
          [setOffAt(pair, 0, "green")],
        );

        expect(
          blasts.map(({ what, square, piece, kind, setOffBy, wait }) => ({
            what,
            square,
            piece,
            kind,
            setOffBy,
            wait,
          })),
        ).toEqual([
          {
            what: pair,
            square: 0,
            piece: 99,
            kind: "green",
            setOffBy: null,
            wait: 0,
          },
          {
            what: carried,
            square: 5,
            piece: null,
            kind: "green",
            setOffBy: 0,
            wait: 1,
          },
        ]);
      },
    );

    it("carries nothing anywhere where the wisp finds nowhere worth flying to", () => {
      const { blasts } = struckOn(["  "], [setOffAt("wisp-and-puffer", 0)]);

      expect(blasts).toEqual([
        {
          what: "wisp-and-puffer",
          square: 0,
          piece: 99,
          kind: "red",
          setOffBy: null,
          wait: 0,
          strikes: [],
        },
      ]);
    });

    it("gives each fuzzball of the frizzball's kind a dasher's fur, across and down in turn, caged ones aside, then gathers each, setting it off", () => {
      const { blasts } = struckOn(
        [" gGr", "gbgg"],
        [setOffAt("frizzball-and-dasher", 0, "green")],
        { kinds: ["green", "blue", "red"] },
        ELEMENT_RULES,
      );

      expect({
        strikes: blasts[0]?.strikes,
        setOff: blasts.slice(1, 5).map(({ what, square, setOffBy, wait }) => ({
          what,
          square,
          setOffBy,
          wait,
        })),
      }).toEqual({
        strikes: strikesOf([1, 1], [4, 2], [6, 3], [7, 4]),
        setOff: [
          { what: "dasher-across", square: 1, setOffBy: 0, wait: 1 },
          { what: "dasher-down", square: 4, setOffBy: 0, wait: 2 },
          { what: "dasher-across", square: 6, setOffBy: 0, wait: 3 },
          { what: "dasher-down", square: 7, setOffBy: 0, wait: 4 },
        ],
      });
    });

    it.each([
      ["frizzball-and-puffer", "puffer"],
      ["frizzball-and-wisp", "wisp"],
    ] as const)(
      "gives each fuzzball of the frizzball's kind for %s a %s's fur, and sets each off",
      (what, special) => {
        const { blasts } = struckOn(
          [" gg", "rbr"],
          [setOffAt(what, 0, "green")],
        );

        expect(
          blasts.slice(0, 3).map(({ what, square }) => ({ what, square })),
        ).toEqual([
          { what, square: 0 },
          { what: special, square: 1 },
          { what: special, square: 2 },
        ]);
      },
    );

    it("gives no fur on a square a bunch of the wave made", () => {
      const { blasts } = struckOn(
        ["   g", "gggg"],
        [setOffAt("frizzball-and-puffer", 0, "green")],
        { kinds: ["green", "blue"] },
      );

      expect(blasts[0]?.strikes).toEqual(strikesOf([3, 1]));
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

    strikeWave(game, [], [setOffAt("dasher-across", 0)], ELEMENT_RULES);

    expect(game).toEqual(before);
  });
});
