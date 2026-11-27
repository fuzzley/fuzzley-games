import { itemAt } from "@fz/core/records";
import {
  MOVE_FIXTURES,
  type MoveFixture,
} from "../../../testing/move_fixtures";
import {
  HOPS_MS,
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { FEEL } from "../feel";
import type { Part } from "../part";
import type { Timeline } from "../timeline";
import { bunchOf } from "./bunch";

/** Returns the timeline of a move played by hand's first bunch, played in an order among its wave's. */
function bunchTimeline(fixture: MoveFixture, order = 0): Timeline {
  return timelineOfParts(firstWaveOf(fixture).grid, firstBunch(fixture, order));
}

/** Returns the parts of a move played by hand's first bunch, played in an order among its wave's. */
function firstBunch(fixture: MoveFixture, order = 0): readonly Part[] {
  const play = firstWaveOf(fixture);
  const [bunch] = play.wave.bunches;
  if (bunch === undefined) {
    throw new Error("The wave gathers no bunch.");
  }
  return bunchOf(bunch, order, play);
}

describe("bunchOf", () => {
  describe("a bunch of 3, across the top of the board", () => {
    const timeline = bunchTimeline(MOVE_FIXTURES.bunch);

    it("turns each one's eyes, wide, toward the bunch's middle", () => {
      expect([pieceAt(timeline, 1, 0), pieceAt(timeline, 3, 0)]).toMatchObject([
        { lookX: 1, lookY: 0, face: "eep" },
        { lookX: -1, lookY: 0, face: "eep" },
      ]);
    });

    it("huddles them together, a little smaller, before they hop off", () => {
      expect(pieceAt(timeline, 1, HOPS_MS)).toMatchObject({
        x: FEEL.huddleLean,
        scaleX: FEEL.huddleScale,
      });
    });

    it("hops each off in turn along it", () => {
      expect(
        [1, 5, 3].map(
          (piece) => pieceAt(timeline, piece, HOPS_MS + 2 * FEEL.hopGapMs).face,
        ),
      ).toEqual(["happy", "happy", "eep"]);
    });

    it("holds the board until the last hop is part of the way through", () => {
      expect(timeline.restMs).toBe(
        HOPS_MS + 3 * FEEL.hopGapMs + FEEL.hopMs * FEEL.fallAfterHop,
      );
    });
  });

  it("shows no mark over a move's first wave's bunch", () => {
    expect(
      firstBunch(MOVE_FIXTURES.bunch).filter(({ what }) => what === "mark"),
    ).toEqual([]);
  });

  it("shows a later wave's mark over its bunch's middle as it hops off", () => {
    const play = firstWaveOf(MOVE_FIXTURES.bunch);
    const wave = { ...play.wave, number: 2 };

    expect(
      bunchOf(itemAt(wave.bunches, 0), 0, { ...play, wave }).filter(
        ({ what }) => what === "mark",
      ),
    ).toEqual([
      {
        what: "mark",
        mark: {
          atMs: HOPS_MS,
          at: { x: 1, y: -FEEL.markAboveSquares },
          times: 2,
        },
      },
    ]);
  });

  it("hops a wave's second bunch a little after its first", () => {
    const timeline = bunchTimeline(MOVE_FIXTURES.bunch, 1);

    expect(
      pieceAt(timeline, 1, HOPS_MS + FEEL.bunchGapMs + FEEL.hopGapMs).face,
    ).toBe("happy");
  });

  describe("a bunch of 4 that makes a dasher", () => {
    const timeline = bunchTimeline(MOVE_FIXTURES.dasherAcrossMade);

    it("runs the rest into the one that stays, which they leave the board in", () => {
      expect([
        pieceAt(timeline, 1, HOPS_MS + FEEL.runInMs),
        timeline.pieces.find(({ id }) => id === 1)?.untilMs,
      ]).toMatchObject([
        { x: 0, y: 2, scaleX: FEEL.runInScale, fade: 1, face: "happy" },
        HOPS_MS + FEEL.runInMs,
      ]);
    });

    it("sends the copy of each that runs in to its goal as it starts", () => {
      expect(
        firstBunch(MOVE_FIXTURES.dasherAcrossMade).flatMap((part) =>
          part.what === "gathered" ? [[part.atMs, part.piece.id]] : [],
        ),
      ).toEqual([
        [HOPS_MS, 1],
        [HOPS_MS, 4],
        [HOPS_MS, 10],
      ]);
    });

    it("makes the one that stays the dasher as they reach it", () => {
      expect(timeline.pieces.find(({ id }) => id === 8)?.becomes).toMatchObject(
        [
          {
            atMs: HOPS_MS + FEEL.runInMs - FEEL.madeLeadMs,
            piece: { special: "dasher-across" },
          },
        ],
      );
    });

    it("holds the board a while after they have run in", () => {
      expect(timeline.restMs).toBe(
        HOPS_MS + FEEL.runInMs + FEEL.fallAfterMadeMs,
      );
    });
  });

  it("has everyone left on the board look at a frizzball made", () => {
    const timeline = bunchTimeline(MOVE_FIXTURES.frizzballMade);

    expect(
      pieceAt(timeline, 6, HOPS_MS + FEEL.runInMs - FEEL.madeLeadMs),
    ).toMatchObject({
      lookX: FEEL.frizzballMadeLook,
      lookY: -FEEL.frizzballMadeLook,
      face: "eep",
    });
  });

  it("huddles the one that stays where it stands, wide-eyed", () => {
    const timeline = bunchTimeline(MOVE_FIXTURES.dasherAcrossMade);

    expect([
      pieceAt(timeline, 8, 0),
      pieceAt(timeline, 8, HOPS_MS),
    ]).toMatchObject([
      { face: "eep", lookX: 0, lookY: 0 },
      { x: 0, y: 2, scaleX: FEEL.huddleScale },
    ]);
  });

  it("shows a new special where the fuzzball on its square went off, that one huddling with none", () => {
    const play = firstWaveOf(MOVE_FIXTURES.dasherAcrossMade);
    const bunch = itemAt(play.wave.bunches, 0);
    const making = { what: "dasher-across", square: 6, piece: 99 } as const;

    const timeline = timelineOfParts(
      play.grid,
      bunchOf({ ...bunch, makes: making }, 0, play),
    );

    expect([
      timeline.pieces.find(({ id }) => id === 99)?.fromMs,
      pieceAt(timeline, 8, HOPS_MS).scaleX,
    ]).toEqual([HOPS_MS + FEEL.runInMs - FEEL.madeLeadMs, 1]);
  });

  it("has none the wave takes and no brick stare at a frizzball made", () => {
    const play = firstWaveOf(MOVE_FIXTURES.frizzballMade);
    const brick = { what: "brick", id: 6, layers: 1 } as const;
    const grid = {
      ...play.grid,
      squares: play.grid.squares.map((square, index) =>
        index === 5 && square !== null ? { ...square, piece: brick } : square,
      ),
    };
    const bunch = itemAt(play.wave.bunches, 0);

    const timeline = timelineOfParts(
      grid,
      bunchOf(bunch, 0, { ...play, grid }),
    );

    expect([
      timeline.pieces.find(({ id }) => id === 6)?.faces,
      pieceAt(timeline, 1, HOPS_MS + FEEL.runInMs - FEEL.madeLeadMs).face,
    ]).toEqual([[], "happy"]);
  });
});
