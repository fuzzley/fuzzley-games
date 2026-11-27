import { itemAt } from "@fz/core/records";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
  pictureOf,
} from "../../testing/board_picture";
import { DESIGN_PARTS, NO_PART } from "../../testing/made_up_rules";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { Game } from "../board/board";
import { Striking, type Struck, type StruckBoard } from "../blasts/striking";
import type { ElementId } from "../catalog/elements";
import type { Change, ElementRule } from "../elements/element_rule";
import type { Swap } from "../move/record";
import { findBunches } from "./find";
import { type GatheredBunch, gatherBunch } from "./gather";

/** The moves played by hand whose first wave gathers bunches and sets nothing off. */
const GATHERING = [
  "bunch",
  "dasherAcrossMade",
  "dasherDownMade",
  "pufferMade",
  "wispMade",
  "frizzballMade",
  "twoWaves",
  "rollAndRefill",
  "dustSwept",
  "brickBroken",
  "cageBunched",
  "burrBrushedOff",
  "sleepyheadBedded",
] as const satisfies readonly (keyof typeof MOVE_FIXTURES)[];

/** Returns where a hit on a square beside a bunch came from. */
function besideBunch(square: number): Struck {
  return { square, step: 1, blast: null };
}

/**
 * Returns every element's rule taking no part but a sleepyhead's beside a
 * bunch, changed with the hit given: to a brick of 2 layers where it is
 * knocked, and a layer of dust where it is dusted.
 */
function changesBeside(
  hit: NonNullable<Change["hit"]>,
): Readonly<Record<ElementId, ElementRule>> {
  return {
    ...NO_PART,
    sleepyhead: {
      besideBunch: ({ piece }) => ({
        square: {
          piece:
            hit === "knocked" && piece !== null
              ? { what: "brick", id: piece.id, layers: 2 }
              : piece,
          dust: hit === "dusted" ? 1 : 0,
        },
        hit,
        counts: false,
      }),
    },
  };
}

/** Describes a game's bunches gathered: each bunch's record and what it set off, and the board as struck. */
type Gathered = StruckBoard & {
  readonly gathered: readonly GatheredBunch[];
  readonly pieces: readonly string[];
};

/**
 * Returns what gathering every bunch standing on a game does, by the rules
 * given, each special made anew once they are done, and the pieces'
 * picture after.
 */
function gatherOn(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>> = NO_PART,
  swap: Pick<Swap, "from" | "to"> | null = null,
): Gathered {
  const striking = new Striking(game, rules);
  const gathered = findBunches(game.board, swap).map((found) =>
    gatherBunch(striking, found),
  );
  striking.remakeSpecials();
  const struck = striking.struck();
  return {
    ...struck,
    gathered,
    pieces: pictureOf(struck.game.board).pieces,
  };
}

/** Returns what gathering every bunch on a board drawn as a picture does, by the rules given. */
function gathered(
  picture: BoardPicture | readonly string[],
  options: GameOptions = {},
  rules: Readonly<Record<ElementId, ElementRule>> = NO_PART,
): Gathered {
  return gatherOn(gameFrom(picture, options), rules);
}

/** Returns a move played by hand's game with its swap made, and the swap. */
function swappedIn(name: (typeof GATHERING)[number]): {
  readonly game: Game;
  readonly swap: Pick<Swap, "from" | "to">;
} {
  const { picture, options, record } = MOVE_FIXTURES[name];
  const game = gameFrom(picture, options);
  const { from, to } = record.swap;
  const pieces = [...game.board.pieces];
  [pieces[from], pieces[to]] = [pieces[to] ?? null, pieces[from] ?? null];
  return {
    game: { ...game, board: { ...game.board, pieces } },
    swap: { from, to },
  };
}

describe("gatherBunch", () => {
  it.each(GATHERING)(
    "gathers the bunches and hits what the sketch did in the first wave, in %s",
    (name) => {
      const { game, swap } = swappedIn(name);
      const [wave] = MOVE_FIXTURES[name].record.waves;

      const { gathered: bunches, hits } = gatherOn(game, DESIGN_PARTS, swap);

      expect({
        bunches: bunches.map(({ bunch }) => bunch),
        hits,
      }).toEqual({
        bunches: wave.bunches,
        hits: wave.hits.filter(({ what }) => what !== "bedded"),
      });
    },
  );

  it.each(GATHERING.filter((name) => name !== "sleepyheadBedded"))(
    "counts the goals the sketch counted in the first wave, in %s",
    (name) => {
      const { game, swap } = swappedIn(name);
      const [wave] = MOVE_FIXTURES[name].record.waves;

      const struck = gatherOn(game, DESIGN_PARTS, swap);

      expect(struck.game.goalsLeft).toEqual(wave.goalsLeft);
    },
  );

  it("gathers each fuzzball of a bunch that leaves nothing, in the order of its squares, counting each toward its kind's goal", () => {
    const { hits, game, pieces } = gathered(["rbbb", "rgpa"], {
      goals: [
        { what: "gather", kind: "blue", count: 5 },
        { what: "gather", kind: "red", count: 5 },
      ],
    });

    expect({ hits, goalsLeft: game.goalsLeft, pieces }).toEqual({
      hits: [1, 2, 3].map((square) => ({
        square,
        step: 0,
        blast: null,
        what: "gathered",
        piece: square + 1,
        kind: "blue",
      })),
      goalsLeft: [2, 5],
      pieces: ["r   ", "rgpa"],
    });
  });

  it("makes the fuzzball that stays what its bunch leaves, keeping its id, its hit in the order of the squares", () => {
    const {
      gathered: bunches,
      hits,
      pieces,
    } = gathered({ pieces: ["bbbbr"] }, { kinds: ["blue", "red"] });

    expect({
      makes: bunches[0]?.bunch.makes,
      born: hits[1],
      pieces,
    }).toEqual({
      makes: { what: "dasher-down", square: 1, piece: 2 },
      born: {
        what: "born",
        square: 1,
        piece: 2,
        made: "dasher-down",
        kind: "blue",
      },
      pieces: [" b  r"],
    });
  });

  it("makes the frizzball of the fuzzball that stays, which takes no kind", () => {
    const { pieces } = gathered(["bbbbb", "rgrgr"]);

    expect(pieces).toEqual(["  f  ", "rgrgr"]);
  });

  it("sweeps what lies under the fuzzball that stays before its hit", () => {
    const { hits } = gathered(
      { pieces: ["bbbb"], dust: ["0100"] },
      { kinds: ["blue", "red"] },
      DESIGN_PARTS,
    );

    expect(hits.slice(1, 3)).toEqual([
      { square: 1, step: 0, blast: null, what: "dusted", layersLeft: 0 },
      { what: "born", square: 1, piece: 2, made: "dasher-down", kind: "blue" },
    ]);
  });

  it("sets off each special in a bunch, in the order of its squares", () => {
    const { gathered: bunches } = gathered({
      pieces: ["bbb"],
      marks: ["o.w"],
    });

    expect(bunches[0]?.setOff).toEqual([
      { what: "puffer", square: 0, piece: 1, kind: "blue" },
      { what: "wisp", square: 2, piece: 3, kind: "blue" },
    ]);
  });

  describe("where the fuzzball that stays is already special", () => {
    /** A line of 4 that leaves a dasher where a puffer stands, on a board with ids to 8. */
    const PICTURE = { pieces: ["bbbb", "rgrg"], marks: [".o..", "...."] };

    it("gathers it and sets it off", () => {
      const { gathered: bunches, hits } = gathered(PICTURE);

      expect({ setOff: bunches[0]?.setOff, hit: hits[1] }).toEqual({
        setOff: [{ what: "puffer", square: 1, piece: 2, kind: "blue" }],
        hit: {
          square: 1,
          step: 0,
          blast: null,
          what: "gathered",
          piece: 2,
          kind: "blue",
        },
      });
    });

    it("makes what its bunch leaves anew, a new piece, its hit the last", () => {
      const { gathered: bunches, hits, game, pieces } = gathered(PICTURE);

      expect({
        makes: bunches[0]?.bunch.makes,
        last: hits.at(-1),
        nextPieceId: game.nextPieceId,
        piece: game.board.pieces[1],
        pieces,
      }).toEqual({
        makes: { what: "dasher-down", square: 1, piece: 9 },
        last: {
          what: "born",
          square: 1,
          piece: 9,
          made: "dasher-down",
          kind: "blue",
        },
        nextPieceId: 10,
        piece: {
          what: "fuzzball",
          id: 9,
          kind: "blue",
          special: "dasher-down",
          caged: false,
          burred: false,
        },
        pieces: [" b  ", "rgrg"],
      });
    });

    it("makes the frizzball anew where a bunch leaves it", () => {
      const { pieces } = gathered({
        pieces: ["bbbbb", "rgrgr"],
        marks: ["..-..", "....."],
      });

      expect(pieces).toEqual(["  f  ", "rgrgr"]);
    });

    it("leaves its square empty until it is made anew", () => {
      const game = gameFrom(PICTURE);
      const striking = new Striking(game, NO_PART);

      gatherBunch(striking, itemAt(findBunches(game.board, null), 0));

      expect(pictureOf(striking.struck().game.board).pieces).toEqual([
        "    ",
        "rgrg",
      ]);
    });
  });

  describe("through each element's rule", () => {
    it("lets each element take in each square before its fuzzball is gathered or made special", () => {
      const { game, hits } = gathered(
        ["BBBB", "rgrg"],
        { goals: [{ what: "cage" }] },
        DESIGN_PARTS,
      );

      expect({
        goalsLeft: game.goalsLeft,
        made: game.board.pieces[1],
        hits: hits.map(({ what }) => what),
      }).toEqual({
        goalsLeft: [0],
        made: {
          what: "fuzzball",
          id: 2,
          kind: "blue",
          special: "dasher-down",
          caged: false,
          burred: false,
        },
        hits: ["gathered", "born", "gathered", "gathered"],
      });
    });

    it("strikes each square beside a bunch once, by its squares' order, then right, left, down and up", () => {
      const { hits } = gathered(
        ["2122", "1bbb", "2121"],
        { kinds: ["blue", "red"] },
        DESIGN_PARTS,
      );

      expect(hits.filter((hit) => "step" in hit && hit.step === 1)).toEqual([
        { ...besideBunch(4), what: "broken", piece: 5 },
        { ...besideBunch(9), what: "broken", piece: 10 },
        { ...besideBunch(1), what: "broken", piece: 2 },
        { ...besideBunch(10), what: "knocked", piece: 11, layersLeft: 1 },
        { ...besideBunch(2), what: "knocked", piece: 3, layersLeft: 1 },
        { ...besideBunch(11), what: "broken", piece: 12 },
        { ...besideBunch(3), what: "knocked", piece: 4, layersLeft: 1 },
      ]);
    });

    it("strikes a square beside two of a bunch's squares once", () => {
      const { hits } = gathered(
        ["brg", "b2g", "bbb"],
        { kinds: ["blue", "red", "green"] },
        DESIGN_PARTS,
      );

      expect(hits.filter((hit) => "step" in hit && hit.step === 1)).toEqual([
        { ...besideBunch(4), what: "knocked", piece: 5, layersLeft: 1 },
      ]);
    });

    it("lets each element take its part on the square as the one before left it", () => {
      const layered: Readonly<Record<ElementId, ElementRule>> = {
        ...NO_PART,
        dust: {
          inBunch: ({ piece }) => ({
            square: { piece, dust: 2 },
            hit: null,
            counts: false,
          }),
        },
        cage: {
          inBunch: ({ piece, dust }) =>
            dust === 2
              ? { square: { piece, dust: 1 }, hit: "dusted", counts: false }
              : null,
        },
      };

      const { hits } = gathered(["bbb"], { kinds: ["blue", "red"] }, layered);

      expect(hits.filter(({ what }) => what === "dusted")).toEqual(
        [0, 1, 2].map((square) => ({
          square,
          step: 0,
          blast: null,
          what: "dusted",
          layersLeft: 1,
        })),
      );
    });

    it("strikes nothing beside a bunch on a square that holds nothing or what the wave made", () => {
      const ruffles: Readonly<Record<ElementId, ElementRule>> = {
        ...NO_PART,
        sleepyhead: {
          besideBunch: (square) => ({ square, hit: "ruffled", counts: false }),
        },
      };

      const { hits } = gathered(["bbbb", "r r_"], {}, ruffles);

      expect(
        hits
          .filter(({ what }) => what === "ruffled")
          .map(({ square }) => square),
      ).toEqual([4, 6]);
    });

    it("counts toward its goal only an element's change that counts", () => {
      const { game, counted } = gathered(
        ["2bbb", "r1rr"],
        {
          kinds: ["blue", "red"],
          goals: [{ what: "brick" }],
        },
        DESIGN_PARTS,
      );

      expect({ goalsLeft: game.goalsLeft, counted }).toEqual({
        goalsLeft: [1],
        counted: { dust: 0, brick: 1, cage: 0, sleepyhead: 0, burr: 0 },
      });
    });

    it.each([
      ["uncaged", { what: "uncaged", piece: 4 }],
      ["unburred", { what: "unburred", piece: 4 }],
      ["broken", { what: "broken", piece: 4 }],
      ["ruffled", { what: "ruffled", piece: 4 }],
      ["knocked", { what: "knocked", piece: 4, layersLeft: 2 }],
      ["dusted", { what: "dusted", layersLeft: 1 }],
    ] as const)(
      "writes the hit an element's change names, as %s",
      (hit, written) => {
        const { hits } = gathered(
          ["bbbz"],
          { kinds: ["blue", "red"] },
          changesBeside(hit),
        );

        expect(hits.at(-1)).toEqual({ ...besideBunch(3), ...written });
      },
    );

    it("writes a sleepyhead put to bed by an element's change with nothing struck", () => {
      const { hits } = gathered(
        ["bbbz"],
        { kinds: ["blue", "red"] },
        changesBeside("bedded"),
      );

      expect(hits.at(-1)).toEqual({ what: "bedded", square: 3, piece: 4 });
    });

    it.each([
      ["a hit on a piece the square doesn't hold", "ruffled", /holding none/],
      ["a brick knocked that is no brick after", "knocked", /no brick after/],
    ] as const)("throws for %s", (_, hit, message) => {
      const strange: Readonly<Record<ElementId, ElementRule>> = {
        ...NO_PART,
        dust: {
          struckUnder: (square) => ({ square, hit, counts: false }),
        },
      };

      expect(() =>
        gathered(["bbb"], { kinds: ["blue", "red"] }, strange),
      ).toThrow(message);
    });
  });

  it.each([
    ["gathered", null],
    ["staying", { what: "dasher-down", square: 0 }],
  ] as const)(
    "throws for a bunch whose %s square holds no fuzzball",
    (_, makes) => {
      const game = gameFrom(["1"]);
      const striking = new Striking(game, NO_PART);
      const bunch = { squares: [0], kind: "red", makes } as const;

      expect(() => gatherBunch(striking, bunch)).toThrow(/holds no fuzzball/);
    },
  );

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom({
      pieces: ["bbbb", "rgrg"],
      marks: [".o..", "...."],
    });
    const before = structuredClone(game);

    gatherOn(game, DESIGN_PARTS);

    expect(game).toEqual(before);
  });
});
