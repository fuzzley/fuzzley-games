import type { Game } from "../rules/board/board";
import type { Piece } from "../rules/catalog/pieces";
import type { Blast, Fall, Hit, MoveRecord, Wave } from "../rules/move/record";
import { gameFrom } from "./board_picture";
import { DESIGN_SETS } from "./design_files";
import {
  digestOf,
  type GoldenGame,
  goldenGamesOf,
  goldenSet,
  type Play,
  replayGolden,
  writtenOut,
} from "./golden";
import { MOVE_FIXTURES } from "./move_fixtures";

/** The name of a move played by hand. */
type FixtureName = keyof typeof MOVE_FIXTURES;

/** Describes a game and the move that made it, as a digest takes them. */
interface Played {
  readonly game: Game;
  readonly record: MoveRecord;
}

/** Describes a change planted in a move played by hand: what it changes, the move, and the change. */
type Planted = readonly [string, FixtureName, (played: Played) => Played];

/** Returns a move played by hand, its game the one it is played on, which the digest takes as well as any. */
function played(name: FixtureName): Played {
  const { picture, options, record } = MOVE_FIXTURES[name];
  return { game: gameFrom(picture, options), record };
}

/** Returns a list with one item changed. */
function changedAt<T>(
  items: readonly T[],
  place: number,
  change: (item: T) => T,
): T[] {
  return items.map((item, at) => (at === place ? change(item) : item));
}

/** Returns a move with its record changed. */
function inRecord(change: (record: MoveRecord) => MoveRecord) {
  return ({ game, record }: Played): Played => ({
    game,
    record: change(record),
  });
}

/** Returns a move with its first wave changed. */
function inWave(change: (wave: Wave) => Wave) {
  return inRecord((record) => ({
    ...record,
    waves: changedAt(record.waves, 0, change),
  }));
}

/** Returns a move with a blast of its first wave changed. */
function inBlast(place: number, change: (blast: Blast) => Blast) {
  return inWave((wave) => ({
    ...wave,
    blasts: changedAt(wave.blasts, place, change),
  }));
}

/** Returns a move with every hit of a kind in its first wave changed. */
function inHits<W extends Hit["what"]>(
  what: W,
  change: (hit: Extract<Hit, { what: W }>) => Hit,
) {
  const isOfKind = (hit: Hit): hit is Extract<Hit, { what: W }> =>
    hit.what === what;
  return inWave((wave) => ({
    ...wave,
    hits: wave.hits.map((hit) => (isOfKind(hit) ? change(hit) : hit)),
  }));
}

/** Returns a move with the fall of its first wave changed. */
function inFall(change: (fall: Fall) => Fall) {
  return inWave((wave) => ({
    ...wave,
    falls: changedAt(wave.falls, 0, change),
  }));
}

/** Returns a move with its game changed. */
function inGame(change: (game: Game) => Game) {
  return ({ game, record }: Played): Played => ({
    game: change(game),
    record,
  });
}

/** Returns a move with its board changed. */
function inBoard(change: (board: Game["board"]) => Game["board"]) {
  return inGame((game) => ({ ...game, board: change(game.board) }));
}

/** Returns a move with the piece on a square of its board changed. */
function inPiece(
  square: number,
  change: (piece: Piece | null) => Piece | null,
) {
  return inBoard((board) => ({
    ...board,
    pieces: changedAt(board.pieces, square, change),
  }));
}

/** Returns a piece as a fuzzball changed, or as it is where it is none. */
function asFuzzball(
  change: Partial<Extract<Piece, { what: "fuzzball" }>>,
): (piece: Piece | null) => Piece | null {
  return (piece) =>
    piece?.what === "fuzzball" ? { ...piece, ...change } : piece;
}

/** Each change planted in a move played by hand, which its digest must show. */
const PLANTED: readonly Planted[] = [
  [
    "the square picked up",
    "bunch",
    inRecord((r) => ({ ...r, swap: { ...r.swap, from: 2 } })),
  ],
  [
    "the square swapped with",
    "bunch",
    inRecord((r) => ({ ...r, swap: { ...r.swap, to: 2 } })),
  ],
  [
    "a swap refused",
    "bunch",
    inRecord((r) => ({ ...r, swap: { ...r.swap, refused: true } })),
  ],
  ["a wave's number", "bunch", inWave((w) => ({ ...w, number: 2 }))],
  ["a wave's goals left", "bunch", inWave((w) => ({ ...w, goalsLeft: [29] }))],
  [
    "a bunch's squares",
    "bunch",
    inWave((w) => ({
      ...w,
      bunches: changedAt(w.bunches, 0, (b) => ({ ...b, squares: [0, 1, 3] })),
    })),
  ],
  [
    "a bunch's kind",
    "bunch",
    inWave((w) => ({
      ...w,
      bunches: changedAt(w.bunches, 0, (b) => ({ ...b, kind: "red" })),
    })),
  ],
  [
    "what a bunch makes",
    "dasherAcrossMade",
    inWave((w) => ({
      ...w,
      bunches: changedAt(w.bunches, 0, (b) => ({
        ...b,
        makes: b.makes && { ...b.makes, what: "dasher-down" },
      })),
    })),
  ],
  [
    "where a bunch makes it",
    "dasherAcrossMade",
    inWave((w) => ({
      ...w,
      bunches: changedAt(w.bunches, 0, (b) => ({
        ...b,
        makes: b.makes && { ...b.makes, square: 3 },
      })),
    })),
  ],
  [
    "the piece a bunch makes",
    "dasherAcrossMade",
    inWave((w) => ({
      ...w,
      bunches: changedAt(w.bunches, 0, (b) => ({
        ...b,
        makes: b.makes && { ...b.makes, piece: 9 },
      })),
    })),
  ],
  [
    "the special that goes off",
    "dasherGoesOff",
    inBlast(0, (b) => ({ ...b, what: "dasher-down" })),
  ],
  [
    "where it goes off",
    "dasherGoesOff",
    inBlast(0, (b) => ({ ...b, square: 4 })),
  ],
  [
    "the piece that goes off",
    "dasherGoesOff",
    inBlast(0, (b) => ({ ...b, piece: null })),
  ],
  [
    "the kind it wore",
    "dasherGoesOff",
    inBlast(0, (b) => ({ ...b, kind: null })),
  ],
  [
    "the blast that set one off",
    "dasherSetsOffPuffer",
    inBlast(1, (b) => ({ ...b, setOffBy: null })),
  ],
  [
    "the step it was set off at",
    "dasherSetsOffPuffer",
    inBlast(1, (b) => ({ ...b, wait: 3 })),
  ],
  [
    "a square a blast strikes",
    "dasherGoesOff",
    inBlast(0, (b) => ({
      ...b,
      strikes: changedAt(b.strikes, 1, (s) => ({ ...s, square: 3 })),
    })),
  ],
  [
    "the step a blast strikes a square at",
    "dasherGoesOff",
    inBlast(0, (b) => ({
      ...b,
      strikes: changedAt(b.strikes, 1, (s) => ({ ...s, step: 2 })),
    })),
  ],
  [
    "the square a fuzzball is gathered from",
    "bunch",
    inHits("gathered", (h) => ({ ...h, square: h.square + 3 })),
  ],
  [
    "the step it is gathered at",
    "bunch",
    inHits("gathered", (h) => ({ ...h, step: 1 })),
  ],
  [
    "the blast that gathers it",
    "dasherGoesOff",
    inHits("gathered", (h) => ({ ...h, blast: null })),
  ],
  [
    "the fuzzball gathered",
    "bunch",
    inHits("gathered", (h) => ({ ...h, piece: h.piece + 1 })),
  ],
  [
    "the kind gathered",
    "bunch",
    inHits("gathered", (h) => ({ ...h, kind: null })),
  ],
  [
    "what a hit does",
    "cageOpened",
    inHits("uncaged", (h) => ({ ...h, what: "unburred" })),
  ],
  [
    "the brick knocked",
    "rollAndRefill",
    inHits("knocked", (h) => ({ ...h, piece: h.piece + 1 })),
  ],
  [
    "the layers a knock leaves",
    "rollAndRefill",
    inHits("knocked", (h) => ({ ...h, layersLeft: 2 })),
  ],
  [
    "the dust a sweep leaves",
    "dustSwept",
    inHits("dusted", (h) => ({ ...h, layersLeft: 0 })),
  ],
  [
    "where a special is born",
    "dasherAcrossMade",
    inHits("born", (h) => ({ ...h, square: h.square + 1 })),
  ],
  [
    "the special born",
    "dasherAcrossMade",
    inHits("born", (h) => ({ ...h, piece: h.piece + 1 })),
  ],
  [
    "the special a bunch makes",
    "dasherAcrossMade",
    inHits("born", (h) => ({ ...h, made: "puffer" })),
  ],
  [
    "the kind of the bunch that makes it",
    "dasherAcrossMade",
    inHits("born", (h) => ({ ...h, kind: "red" })),
  ],
  [
    "the sleepyhead put to bed",
    "sleepyheadBedded",
    inHits("bedded", (h) => ({ ...h, piece: h.piece + 1 })),
  ],
  ["the piece that falls", "bunch", inFall((f) => ({ ...f, piece: 9 }))],
  ["the kind that falls", "bunch", inFall((f) => ({ ...f, kind: null }))],
  ["where it falls from", "bunch", inFall((f) => ({ ...f, from: 3 }))],
  ["where it falls to", "bunch", inFall((f) => ({ ...f, path: [3, 0] }))],
  ["the lane it falls down", "bunch", inFall((f) => ({ ...f, lane: 1 }))],
  [
    "where a burr spreads from",
    "burrSpreads",
    inRecord((r) => ({
      ...r,
      burrSpread: r.burrSpread && { ...r.burrSpread, from: 7 },
    })),
  ],
  [
    "where a burr spreads",
    "burrSpreads",
    inRecord((r) => ({
      ...r,
      burrSpread: r.burrSpread && { ...r.burrSpread, to: 7 },
    })),
  ],
  [
    "the fuzzball a burr spreads to",
    "burrSpreads",
    inRecord((r) => ({
      ...r,
      burrSpread: r.burrSpread && {
        ...r.burrSpread,
        piece: r.burrSpread.piece + 1,
      },
    })),
  ],
  [
    "how far the gust turns the board",
    "windTurns",
    inRecord((r) => ({ ...r, gust: r.gust && { ...r.gust, turns: 3 } })),
  ],
  [
    "what falls in the gust",
    "windTurns",
    inRecord((r) => ({
      ...r,
      gust: r.gust && {
        ...r.gust,
        waves: changedAt(r.gust.waves, 0, (w) => ({
          ...w,
          falls: changedAt(w.falls, 0, (f) => ({ ...f, lane: 0 })),
        })),
      },
    })),
  ],
  [
    "the fuzzball the shuffle takes",
    "shuffle",
    inRecord((r) => ({
      ...r,
      shuffle: r.shuffle && {
        moves: changedAt(r.shuffle.moves, 0, (m) => ({
          ...m,
          piece: m.piece + 1,
        })),
      },
    })),
  ],
  [
    "where the shuffle takes it from",
    "shuffle",
    inRecord((r) => ({
      ...r,
      shuffle: r.shuffle && {
        moves: changedAt(r.shuffle.moves, 0, (m) => ({ ...m, from: 2 })),
      },
    })),
  ],
  [
    "where the shuffle takes a fuzzball",
    "shuffle",
    inRecord((r) => ({
      ...r,
      shuffle: r.shuffle && {
        moves: changedAt(r.shuffle.moves, 0, (m) => ({ ...m, to: 2 })),
      },
    })),
  ],
  ["the move's outcome", "bunch", inRecord((r) => ({ ...r, outcome: "over" }))],
  [
    "how far the board's frame is turned",
    "bunch",
    inGame((g) => ({ ...g, turns: 2 })),
  ],
  ["the moves left", "bunch", inGame((g) => ({ ...g, movesLeft: 3 }))],
  ["the moves played", "bunch", inGame((g) => ({ ...g, movesPlayed: 3 }))],
  ["the deal's seed", "bunch", inGame((g) => ({ ...g, seed: 4 }))],
  ["the next piece's id", "bunch", inGame((g) => ({ ...g, nextPieceId: 40 }))],
  [
    "a wind that turns",
    "bunch",
    inGame((g) => ({ ...g, wind: { every: 3, quarters: 1, wait: 3 } })),
  ],
  [
    "how often the wind turns",
    "windTurns",
    inGame((g) => ({ ...g, wind: g.wind && { ...g.wind, every: 2 } })),
  ],
  [
    "how far the wind turns",
    "windTurns",
    inGame((g) => ({ ...g, wind: g.wind && { ...g.wind, quarters: 2 } })),
  ],
  [
    "the wait for the wind's turn",
    "windTurns",
    inGame((g) => ({ ...g, wind: g.wind && { ...g.wind, wait: 2 } })),
  ],
  [
    "the kinds in play",
    "bunch",
    inGame((g) => ({ ...g, kinds: [...g.kinds].reverse() })),
  ],
  ["the goals", "bunch", inGame((g) => ({ ...g, goals: [{ what: "dust" }] }))],
  ["the goals left", "bunch", inGame((g) => ({ ...g, goalsLeft: [29] }))],
  [
    "a lane's refills",
    "bunch",
    inGame((g) => ({
      ...g,
      lanes: [
        changedAt(g.lanes[0], 1, () => 4),
        g.lanes[1],
        g.lanes[2],
        g.lanes[3],
      ],
    })),
  ],
  ["how the game stands", "bunch", inGame((g) => ({ ...g, outcome: "over" }))],
  ["a fuzzball's kind", "bunch", inPiece(0, asFuzzball({ kind: "pink" }))],
  ["a cage", "bunch", inPiece(0, asFuzzball({ caged: true }))],
  ["a burr", "bunch", inPiece(0, asFuzzball({ burred: true }))],
  [
    "a dasher's way",
    "dasherGoesOff",
    inPiece(4, asFuzzball({ special: "dasher-down" })),
  ],
  [
    "a brick's layers",
    "rollAndRefill",
    inPiece(1, (piece) =>
      piece?.what === "brick" ? { ...piece, layers: 1 } : piece,
    ),
  ],
  ["a square emptied", "bunch", inPiece(0, () => null)],
  [
    "a layer of dust",
    "bunch",
    inBoard((b) => ({ ...b, dust: changedAt(b.dust, 0, () => 1) })),
  ],
  [
    "a bed",
    "bunch",
    inBoard((b) => ({ ...b, beds: changedAt(b.beds, 0, () => true) })),
  ],
  [
    "a gap",
    "bunch",
    inBoard((b) => ({
      ...b,
      open: changedAt(b.open, 0, () => false),
      pieces: changedAt(b.pieces, 0, () => null),
    })),
  ],
];

describe("writtenOut", () => {
  it.each(PLANTED)("shows %s", (_, name, plant) => {
    const move = played(name);
    const changed = plant(move);

    expect(writtenOut(changed.game, changed.record)).not.toBe(
      writtenOut(move.game, move.record),
    );
  });

  it("lets the pieces on the board be numbered another way", () => {
    const { game, record } = played("bunch");
    const pieces = game.board.pieces.map((piece) =>
      piece === null ? null : { ...piece, id: piece.id + 100 },
    );

    const renumbered = { ...game, board: { ...game.board, pieces } };

    expect(writtenOut(renumbered, record)).toBe(writtenOut(game, record));
  });

  it("writes a game as dealt without a move", () => {
    const { game } = played("bunch");

    expect(writtenOut(game, null).split("\n")[0]).toBe(
      "game turns 0, moves left 20, played 0, seed 3, next #10, playing",
    );
  });

  it.each([
    [1, ["ab", "vg", "ar"], ["bgr", "ava"]],
    [2, ["ava", "rgb"], ["bgr", "ava"]],
    [3, ["ra", "gv", "ba"], ["bgr", "ava"]],
  ] as const)(
    "writes a board turned %i quarters as the screen shows it",
    (turns, own, screen) => {
      const game = { ...gameFrom(own), turns };

      expect(boardRowsOf(writtenOut(game, null))).toEqual(screen);
    },
  );

  it("writes a dasher's way as the screen shows it", () => {
    const game = {
      ...gameFrom({ pieces: ["ab", "vg", "ar"], marks: ["-.", "..", ".."] }),
      turns: 1,
    } as const;

    expect(markRowsOf(writtenOut(game, null))).toEqual(["...", "|.."]);
  });
});

/** Returns the rows of a board's pieces from a digest written out. */
function boardRowsOf(text: string): string[] {
  return boardOf(text).map((row) => row.split(" | ")[0] ?? "");
}

/** Returns the rows of a board's marks from a digest written out. */
function markRowsOf(text: string): string[] {
  return boardOf(text).map((row) => row.split(" | ")[1] ?? "");
}

/** Returns the rows of a board from a digest written out, as they are. */
function boardOf(text: string): string[] {
  const lines = text.split("\n");
  return lines
    .slice(lines.findIndex((line) => line.startsWith("board ")) + 1)
    .map((row) => row.slice(2));
}

describe("digestOf", () => {
  it("is 8 hex digits", () => {
    expect(digestOf("swap 1 to 4")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("tells texts a character apart", () => {
    expect(digestOf("swap 1 to 4")).not.toBe(digestOf("swap 1 to 5"));
  });
});

/** The moves of a golden game played by hand, each a move played by hand on the game the one before left. */
const LINE = ["bunch", "twoWaves", "dasherGoesOff"] as const;

/** Describes a move a scripted play() was handed: the game, the move's squares, and the game it left. */
interface Call {
  readonly handed: Game;
  readonly from: number;
  readonly to: number;
  readonly left: Game;
}

/**
 * Returns a play() that plays the line's moves in turn, whatever it is
 * handed, each leaving its own game, one changed where asked, and keeps
 * each move it is handed in a list given.
 */
function scripted(
  change: (move: number, played: Played) => Played = (_, move) => move,
  calls: Call[] = [],
): Play {
  let move = 0;
  return (handed, from, to) => {
    const name = LINE[move];
    if (name === undefined) {
      throw new Error("The line has no move left.");
    }
    move++;
    const made = change(move, played(name));
    calls.push({ handed, from, to, left: made.game });
    return made;
  };
}

/** The golden game of the line, its digests those of the moves played by hand. */
const GOLDEN: GoldenGame = {
  set: "warm-up",
  place: 7,
  level: "3",
  deal: 2,
  movesLeft: 20,
  moves: LINE.map((name) => MOVE_FIXTURES[name].record.swap),
  digests: [
    digestOf(writtenOut(played("bunch").game, null)),
    ...LINE.map((name) => {
      const { game, record } = played(name);
      return digestOf(writtenOut(game, record));
    }),
  ],
};

describe("replayGolden", () => {
  it("lets a game played as the sketch played it by", () => {
    const replay = (): void => {
      replayGolden(GOLDEN, played("bunch").game, scripted());
    };

    expect(replay).not.toThrow();
  });

  it("plays the golden game's moves in turn", () => {
    const calls: Call[] = [];

    replayGolden(GOLDEN, played("bunch").game, scripted(undefined, calls));

    expect(calls.map(({ from, to }) => ({ from, to }))).toEqual(
      GOLDEN.moves.map(({ from, to }) => ({ from, to })),
    );
  });

  it("plays each move on the game the move before left", () => {
    const opening = played("bunch").game;
    const calls: Call[] = [];

    replayGolden(GOLDEN, opening, scripted(undefined, calls));

    const [first, second, third] = calls;
    expect(first?.handed).toBe(opening);
    expect(second?.handed).toBe(first?.left);
    expect(third?.handed).toBe(second?.left);
  });

  it("stops at the first move played otherwise, with its two digests and the game's written out", () => {
    const play = scripted((move, each) =>
      move >= 2 ? inFall((f) => ({ ...f, lane: 3 }))(each) : each,
    );

    const replay = (): void => {
      replayGolden(GOLDEN, played("bunch").game, play);
    };

    expect(replay).toThrow(
      new RegExp(
        [
          `The golden set "warm-up"'s game 7, of level 3's deal 2, isn't the sketch's after move 2, 9 to 10\\.`,
          `  the sketch's digest  ${GOLDEN.digests[2] ?? ""}`,
          "  the game's digest    [0-9a-f]{8}",
          "The game's, written out:",
          "swap 9 to 10",
        ].join("\n"),
      ),
    );
  });

  it("stops at a move that leaves a board no play leaves, saying why", () => {
    const play = scripted((move, each) =>
      move === 2
        ? inPiece(0, asFuzzball({ special: "puffer", burred: true }))(each)
        : each,
    );

    const replay = (): void => {
      replayGolden(GOLDEN, played("bunch").game, play);
    };

    expect(replay).toThrow(
      /after move 2, 9 to 10\.\n.*\n {2}the game's digest {4}none\nThe game's, written out:\nError: No board holds a special that is caged or burred/,
    );
  });

  it("says how to have the sketch's written out", () => {
    const play = scripted((move, each) =>
      move === 1 ? inGame((g) => ({ ...g, seed: 9 }))(each) : each,
    );

    const replay = (): void => {
      replayGolden(GOLDEN, played("bunch").game, play);
    };

    expect(replay).toThrow(
      /\nThe sketch's: node docs\/fuzz-flux\/sketch\/golden\.mjs --print warm-up:7$/,
    );
  });

  it("stops at a deal unlike the sketch's", () => {
    const opening = { ...played("bunch").game, seed: 9 };

    const replay = (): void => {
      replayGolden(GOLDEN, opening, scripted());
    };

    expect(replay).toThrow(/isn't the sketch's as dealt\./);
  });
});

/** Returns a golden set's file with one game in it. */
function setOf(game: unknown): unknown {
  return { set: "warm-up", games: [game] };
}

describe("goldenGamesOf", () => {
  it("reads a golden game", () => {
    expect(
      goldenGamesOf(
        setOf("1 4 14 | 34 35, 15 16 | a6a966c2 01e8f59c c2142385"),
      ),
    ).toEqual([
      {
        set: "warm-up",
        place: 0,
        level: "1",
        deal: 4,
        movesLeft: 14,
        moves: [
          { from: 34, to: 35 },
          { from: 15, to: 16 },
        ],
        digests: ["a6a966c2", "01e8f59c", "c2142385"],
      },
    ]);
  });

  it("reads a golden game of no moves", () => {
    const [game] = goldenGamesOf(setOf("1 4 14 |  | a6a966c2"));

    expect(game?.moves).toEqual([]);
  });

  it.each([
    ["no line", { level: "1" }],
    ["no level", " 4 14 | 34 35 | a6a966c2 01e8f59c"],
    ["a deal of no seed", "1 x 14 | 34 35 | a6a966c2 01e8f59c"],
    ["no moves dealt", "1 4 | 34 35 | a6a966c2 01e8f59c"],
    ["a move of one square", "1 4 14 | 34, 15 16 | a6a966c2 01e8f59c c2142385"],
    ["a digest too few", "1 4 14 | 34 35, 15 16 | a6a966c2 01e8f59c"],
    ["a digest of no hex", "1 4 14 | 34 35 | a6a966c2 01e8f59x"],
  ])("refuses a game with %s", (_, game) => {
    expect(() => goldenGamesOf(setOf(game))).toThrow(
      `Game 0 of the golden set "warm-up" isn't a golden game.`,
    );
  });

  it("refuses a file that names no set", () => {
    expect(() => goldenGamesOf({ games: [] })).toThrow(
      "A golden set's file names its set.",
    );
  });

  it("refuses a file that lists no games", () => {
    expect(() => goldenGamesOf({ set: "warm-up" })).toThrow(
      `The golden set "warm-up" lists no games.`,
    );
  });

  it.each(DESIGN_SETS)("reads every golden game of %s", (set) => {
    expect(goldenSet(set).length).toBeGreaterThan(0);
  });

  it("refuses a set with no file", () => {
    expect(() => goldenSet("no-such-set")).toThrow(/no-such-set\.json/);
  });
});
