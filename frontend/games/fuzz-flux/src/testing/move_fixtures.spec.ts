import { type Board, OUTCOMES } from "../rules/board/board";
import { squareOf } from "../rules/board/cells";
import { MADE_IDS } from "../rules/catalog/specials";
import type { Hit, MoveRecord, Wave } from "../rules/move/record";
import { gameFrom } from "./board_picture";
import {
  ENCORE_FIXTURE,
  MOVE_FIXTURES,
  type MoveFixture,
} from "./move_fixtures";

/** Every kind of hit a record holds. */
const HITS = {
  gathered: true,
  uncaged: true,
  unburred: true,
  knocked: true,
  broken: true,
  dusted: true,
  ruffled: true,
  born: true,
  bedded: true,
} as const satisfies Readonly<Record<Hit["what"], true>>;

/** What a swap can pick up. */
const SWAPPED = ["fuzzball", "frizzball"];

/** The moves played by hand, each with its name. */
const MOVES: readonly (readonly [string, MoveFixture])[] =
  Object.entries(MOVE_FIXTURES);

/** Returns every wave a move's record plays, its gust's among them. */
function wavesOf(record: MoveRecord): readonly Wave[] {
  return [...record.waves, ...(record.gust?.waves ?? [])];
}

/** Every wave the moves and the encore play. */
const WAVES = [
  ...MOVES.flatMap(([, { record }]) => wavesOf(record)),
  ...ENCORE_FIXTURE.record.spares.flatMap(({ waves }) => waves),
];

/** Returns the pieces a board holds and its waves bring in, and the pieces its waves hit. */
function piecesOf(
  board: Board,
  waves: readonly Wave[],
): { readonly held: readonly number[]; readonly hit: number[] } {
  const held = [
    ...board.pieces.flatMap((piece) => (piece === null ? [] : [piece.id])),
    ...waves.flatMap(({ falls, hits }) => [
      ...falls.map(({ piece }) => piece),
      ...hits.flatMap((hit) => (hit.what === "born" ? [hit.piece] : [])),
    ]),
  ];
  const hit = waves.flatMap(({ hits }) =>
    hits.flatMap((each) => ("piece" in each ? [each.piece] : [])),
  );
  return { held, hit };
}

/** Returns whether a fall rolls, its path crossing from one column to another. */
function rolls(path: readonly number[], width: number): boolean {
  return new Set(path.map((square) => squareOf(square, width).x)).size > 1;
}

describe("MOVE_FIXTURES", () => {
  it("holds every kind of hit", () => {
    expect(
      new Set(WAVES.flatMap(({ hits }) => hits.map(({ what }) => what))),
    ).toEqual(new Set(Object.keys(HITS)));
  });

  it("makes each special and the frizzball", () => {
    expect(
      new Set(
        WAVES.flatMap(({ bunches }) =>
          bunches.flatMap(({ makes }) => (makes === null ? [] : [makes.what])),
        ),
      ),
    ).toEqual(new Set(MADE_IDS));
  });

  it("sets off each special and the frizzball, each pair a storyboard shows, and a wisp carrying a dasher", () => {
    expect(
      new Set(WAVES.flatMap(({ blasts }) => blasts.map(({ what }) => what))),
    ).toEqual(
      new Set([
        ...MADE_IDS,
        "two-dashers",
        "dasher-and-puffer",
        "two-puffers",
        "two-wisps",
        "wisp-and-dasher-across",
        "frizzball-and-dasher",
        "two-frizzballs",
      ]),
    );
  });

  it("sets off a blast from another", () => {
    expect(
      WAVES.some(({ blasts }) =>
        blasts.some(({ setOffBy }) => setOffBy !== null),
      ),
    ).toBe(true);
  });

  it("refuses a swap", () => {
    expect(MOVES.some(([, { record }]) => record.swap.refused)).toBe(true);
  });

  it("plays a move of more than one wave", () => {
    expect(MOVES.some(([, { record }]) => record.waves.length > 1)).toBe(true);
  });

  it("rolls a fuzzball in under a piece that holds still", () => {
    expect(
      MOVES.some(([, { picture, record }]) =>
        wavesOf(record).some(({ falls }) =>
          falls.some(({ path }) => rolls(path, picture.pieces[0]?.length ?? 0)),
        ),
      ),
    ).toBe(true);
  });

  it("spreads a burr, turns the wind and shuffles the board", () => {
    expect([
      MOVES.some(([, { record }]) => record.burrSpread !== null),
      MOVES.some(
        ([, { record }]) => (record.gust?.waves[0]?.falls ?? []).length > 0,
      ),
      MOVES.some(([, { record }]) => record.shuffle !== null),
    ]).toEqual([true, true, true]);
  });

  it("ends a move each way a game can stand", () => {
    expect(new Set(MOVES.map(([, { record }]) => record.outcome))).toEqual(
      new Set(OUTCOMES),
    );
  });

  it.each(MOVES)(
    "swaps two neighbors a swap can pick up, in %s",
    (_, fixture) => {
      const { board } = gameFrom(fixture.picture, fixture.options);
      const { from, to } = fixture.record.swap;
      const [a, b] = [squareOf(from, board.width), squareOf(to, board.width)];

      expect({
        picked: [board.pieces[from]?.what, board.pieces[to]?.what],
        apart: Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      }).toEqual({
        picked: [expect.toBeOneOf(SWAPPED), expect.toBeOneOf(SWAPPED)],
        apart: 1,
      });
    },
  );

  it.each(MOVES)(
    "hits only pieces its board holds or its move brings in, in %s",
    (_, { picture, options, record }) => {
      const { held, hit } = piecesOf(
        gameFrom(picture, options).board,
        wavesOf(record),
      );

      expect(held).toEqual(expect.arrayContaining(hit));
    },
  );
});

describe("ENCORE_FIXTURE", () => {
  it("hits only pieces its board holds or its spare moves bring in", () => {
    const { picture, options, record } = ENCORE_FIXTURE;

    const { held, hit } = piecesOf(
      gameFrom(picture, options).board,
      record.spares.flatMap(({ waves }) => waves),
    );

    expect(held).toEqual(expect.arrayContaining(hit));
  });
});
