import { gameFrom, pictureOf } from "../../testing/board_picture";
import { DESIGN_SETS, designSet } from "../../testing/design_files";
import { HOLDS_AND_GOALS, HOLDS_ONLY } from "../../testing/partial_rules";
import { findBunches } from "../bunches/find";
import { type Level, levelSetOf } from "../levels/level";
import { legalMoves } from "../move/swap";
import { OPENING_MOVES } from "../tuning";
import { deal } from "./deal";
import { turnFrame } from "./orientation";

/** Every level of the design's four sets. */
const LEVELS = DESIGN_SETS.flatMap((set) => levelSetOf(designSet(set)).levels);

/** Every deal of every level of the design's, by its level's id and its seed. */
const DEALS = LEVELS.flatMap((level) =>
  level.deals.map((seed) => [level.id, seed] as const),
);

/** Returns the design's level of an id. */
function levelOf(id: string): Level {
  const level = LEVELS.find((each) => each.id === id);
  if (level === undefined) {
    throw new Error(`The design has no level ${id}.`);
  }
  return level;
}

/** Returns a level made up for a spec: the design's first, with the changes given. */
function madeUp(changes: Partial<Level>): Level {
  return { ...levelOf("1"), ...changes };
}

describe("deal", () => {
  // Each deal below is the sketch's deal() of the same level and seed.
  it("deals Warm-up's first level on its first deal as the sketch does", () => {
    const game = deal(levelOf("1"), 1, HOLDS_ONLY);

    expect(pictureOf(game.board).pieces).toEqual([
      "grabba",
      "rbrbrg",
      "rbbrag",
      "agbbrv",
      "bgarra",
      "bvvrgr",
    ]);
  });

  it("keeps each brick the level's picture lays, and its dust", () => {
    const game = deal(levelOf("12"), 1, HOLDS_AND_GOALS);

    expect(pictureOf(game.board)).toEqual({
      pieces: [
        "grabbarb",
        "bbrgbvbb",
        "ag1111rv",
        "bg1rr1bg",
        "vr1rg1va",
        "vg1111gr",
        "aababrba",
        "babbgagb",
      ],
      dust: levelOf("12").dust,
    });
  });

  it("keeps each brick's layers as the level's picture lays them", () => {
    const game = deal(levelOf("11"), 2, HOLDS_AND_GOALS);

    expect(pictureOf(game.board).pieces.slice(2, 5)).toEqual([
      "ag232ga",
      "br3r3rr",
      "bg232rv",
    ]);
  });

  it("leaves each gap the level's picture draws", () => {
    const game = deal(levelOf("7"), 1, HOLDS_ONLY);

    expect(pictureOf(game.board).pieces).toEqual([
      "_rabba_",
      "bbrbgbv",
      "bragrgb",
      "rrv_gar",
      "rabgvrg",
      "agvvavg",
      "_rbvgr_",
    ]);
  });

  it("burrs each fuzzball of any kind the level's picture burrs", () => {
    const game = deal(levelOf("22"), 1, HOLDS_ONLY);

    expect(pictureOf(game.board).marks).toEqual([
      ".......",
      ".......",
      "..*.*..",
      "...*...",
      "..*.*..",
      ".......",
      ".......",
    ]);
  });

  it("keeps each caged fuzzball the level's picture lays, and cages each it leaves to any kind", () => {
    const game = deal(levelOf("13"), 2, HOLDS_AND_GOALS);

    expect(pictureOf(game.board).pieces.slice(1, 6)).toEqual([
      "vBvBaRr",
      "agbgvga",
      "brbVbrr",
      "bgabgrv",
      "rGrRaAv",
    ]);
  });

  // The sketch's deal 36 of level 12 takes its second try.
  it("deals again, by the next salt, where a try leaves a bunch standing or too few moves", () => {
    const game = deal(levelOf("12"), 36, HOLDS_AND_GOALS);

    expect(pictureOf(game.board).pieces).toEqual([
      "rrgaabgg",
      "vbgvgrbg",
      "vg1111rv",
      "gb1rv1rv",
      "ba1va1ag",
      "gb1111rb",
      "agvbaagv",
      "brbrvgbr",
    ]);
  });

  it("places a level's specials, each a piece numbered after every square's", () => {
    const game = deal(levelOf("6"), 2, HOLDS_ONLY);
    const { pieces, marks } = pictureOf(game.board);

    expect({
      frizzball: pieces[5]?.[4],
      marks,
      nextPieceId: game.nextPieceId,
    }).toEqual({
      frizzball: "f",
      marks: [
        ".......",
        ".......",
        "..-o...",
        ".......",
        ".......",
        "...w...",
        ".......",
      ],
      nextPieceId: 54,
    });
  });

  it("numbers each square's piece in the order read, past gaps, and each special after them all", () => {
    const level = madeUp({
      board: ["._....", "......", "......", "......", "......", "......"],
      specials: [{ at: { x: 0, y: 1 }, what: "wisp", kind: "blue" }],
    });

    const { board, nextPieceId } = deal(level, 1, HOLDS_ONLY);

    expect({
      ids: board.pieces.slice(0, 8).map((piece) => piece?.id ?? null),
      nextPieceId,
    }).toEqual({ ids: [1, null, 2, 3, 4, 5, 36, 7], nextPieceId: 37 });
  });

  it("counts a gather's goal as the level sets it, and an element's by its rule on the board dealt", () => {
    const counts = ["1", "8", "13"].map(
      (id) => deal(levelOf(id), 1, HOLDS_AND_GOALS).goalsLeft,
    );

    expect(counts).toEqual([[10, 10], [21], [7]]);
  });

  it("refuses a goal of an element whose rule counts none", () => {
    expect(() => deal(levelOf("8"), 1, HOLDS_ONLY)).toThrow(
      "A level's goal counts every dust, whose element's rule counts no goal of it.",
    );
  });

  it("deals a game with no move played, its lanes having let nothing in", () => {
    const level = levelOf("1");

    const { turns, movesPlayed, movesLeft, lanes, wind, outcome } = deal(
      level,
      1,
      HOLDS_ONLY,
    );

    expect({ turns, movesPlayed, movesLeft, lanes, wind, outcome }).toEqual({
      turns: 0,
      movesPlayed: 0,
      movesLeft: level.moves,
      lanes: gameFrom(level.board).lanes,
      wind: null,
      outcome: "playing",
    });
  });

  it("turns the frame of the board it deals for a level's wind", () => {
    const level = levelOf("28");

    const game = deal(level, 2, HOLDS_ONLY);

    expect(game).toEqual(
      turnFrame(deal({ ...level, wind: null }, 2, HOLDS_ONLY), 1),
    );
  });

  it("sets a turning wind going, its first turn a whole turn's wait away", () => {
    const game = deal(levelOf("30"), 6, HOLDS_ONLY);

    expect({ turns: game.turns, wind: game.wind }).toEqual({
      turns: 0,
      wind: { every: 3, quarters: 1, wait: 3 },
    });
  });

  it.each(DEALS)(
    "deals level %s from seed %i with no bunch standing and the moves a deal opens with",
    (id, seed) => {
      const { board } = deal(levelOf(id), seed, HOLDS_AND_GOALS);

      expect({
        bunches: findBunches(board, null).length,
        enough: legalMoves(board, HOLDS_ONLY).length >= OPENING_MOVES,
      }).toEqual({ bunches: 0, enough: true });
    },
  );

  it("gives up on a level whose picture stands a bunch", () => {
    const level = madeUp({ id: "40", board: ["bbb...", "......"] });

    expect(() => deal(level, 1, HOLDS_ONLY)).toThrow(
      "Level 40 would not deal from seed 1.",
    );
  });

  it("gives up on a level whose board leaves too few moves", () => {
    const level = madeUp({ id: "41", board: ["..", ".."] });

    expect(() => deal(level, 1, HOLDS_ONLY)).toThrow(
      "Level 41 would not deal from seed 1.",
    );
  });
});
