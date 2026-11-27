import { itemAt } from "@fz/core/records";
import {
  ELEMENT_RULES,
  WIND_RULE,
} from "../../../rules/elements/element_rules";
import { play as playMove } from "../../../rules/move/play";
import { type GameOptions, gameFrom } from "../../../testing/board_picture";
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
import { moveStartOf } from "../../../testing/shown_board";
import { noteVolumeOf, onRung } from "../../effects/ladder";
import type { GridShown } from "../../run_state";
import { timelineOf } from "../build";
import { FEEL } from "../feel";
import type { Motion } from "../less_motion";
import type { Part } from "../part";
import type { Timeline } from "../timeline";
import { bunchOf } from "./bunch";

/** Returns the timeline of a move played by hand's first bunch, played in an order among its wave's, in a motion. */
function bunchTimeline(
  fixture: MoveFixture,
  order = 0,
  motion: Motion = "full",
): Timeline {
  return timelineOfParts(
    firstWaveOf(fixture).grid,
    firstBunch(fixture, order, motion),
  );
}

/** Returns the parts of a move played by hand's first bunch, played in an order among its wave's, in a motion. */
function firstBunch(
  fixture: MoveFixture,
  order = 0,
  motion: Motion = "full",
): readonly Part[] {
  const play = firstWaveOf(fixture);
  const [bunch] = play.wave.bunches;
  if (bunch === undefined) {
    throw new Error("The wave gathers no bunch.");
  }
  return bunchOf(bunch, order, { ...play, motion });
}

/** Returns a board with the fuzzballs on some of its squares caged. */
function withCages(grid: GridShown, squares: readonly number[]): GridShown {
  return {
    ...grid,
    squares: grid.squares.map((square, index) =>
      square?.piece?.what === "fuzzball" && squares.includes(index)
        ? { ...square, piece: { ...square.piece, caged: true } }
        : square,
    ),
  };
}

/** Returns when each cage a bunch's parts open opens, by its sound. */
function cagesOpenedMs(parts: readonly Part[]): readonly number[] {
  return parts.flatMap((part) =>
    part.what === "sound" && part.sound === "cage" ? [part.atMs] : [],
  );
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

    it("plays its note as it hops off, and each one's bubble a rung up from the one before", () => {
      const bubblesMs = HOPS_MS + FEEL.bubbleAfterMs;

      expect(timeline.sounds).toEqual([
        { atMs: HOPS_MS, sound: "note", cents: 0, volume: 1 },
        { atMs: bubblesMs, sound: "pop", cents: 0, volume: FEEL.bubbleVolume },
        {
          atMs: bubblesMs + FEEL.bubbleGapMs,
          ...onRung("pop", 1),
          volume: FEEL.bubbleVolume,
        },
        {
          atMs: bubblesMs + 2 * FEEL.bubbleGapMs,
          ...onRung("pop", 2),
          volume: FEEL.bubbleVolume,
        },
      ]);
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

  it.each([
    [MOVE_FIXTURES.dasherAcrossMade, "born-dasher"],
    [MOVE_FIXTURES.dasherDownMade, "born-dasher"],
    [MOVE_FIXTURES.pufferMade, "born-puffer"],
    [MOVE_FIXTURES.wispMade, "born-wisp"],
    [MOVE_FIXTURES.frizzballMade, "born-frizz"],
  ] as const)(
    "plays the sound of the special a bunch makes",
    (fixture, sound) => {
      expect(bunchTimeline(fixture).sounds).toContainEqual({
        atMs: HOPS_MS + FEEL.madeSoundAfterMs,
        sound,
        cents: 0,
        volume: 1,
      });
    },
  );

  it("plays a wave's second bunch's note a rung higher and softer", () => {
    expect(bunchTimeline(MOVE_FIXTURES.bunch, 1).sounds[0]).toEqual({
      atMs: HOPS_MS + FEEL.bunchGapMs,
      ...onRung("note", 1),
      volume: FEEL.laterBunchVolume * noteVolumeOf(1),
    });
  });

  describe("a bunch of 4 that makes a dasher", () => {
    const timeline = bunchTimeline(MOVE_FIXTURES.dasherAcrossMade);

    it("plays a chord of two notes, and the dasher's sound as it is made", () => {
      expect(
        timeline.sounds.filter(({ sound }) => !sound.startsWith("pop")),
      ).toEqual([
        { atMs: HOPS_MS, sound: "note", cents: 0, volume: 1 },
        {
          atMs: HOPS_MS + FEEL.chordGapMs,
          ...onRung("note", FEEL.chordRungs),
          volume: FEEL.chordSecondVolume,
        },
        {
          atMs: HOPS_MS + FEEL.madeSoundAfterMs,
          sound: "born-dasher",
          cents: 0,
          volume: 1,
        },
      ]);
    });

    it("hops the rest off where they huddled rather than running them in, with Less motion", () => {
      const less = bunchTimeline(MOVE_FIXTURES.dasherAcrossMade, 0, "less");

      expect(
        pieceAt(less, 1, HOPS_MS + FEEL.hopGapMs + FEEL.hopMs),
      ).toMatchObject({
        x: 0,
        y: FEEL.huddleLean,
        scaleX: FEEL.hopScale,
        face: "happy",
      });
    });

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

  describe("a bunch that takes in a caged fuzzball", () => {
    it("opens its cage a moment before it hops off, its second", () => {
      expect(cagesOpenedMs(firstBunch(MOVE_FIXTURES.cageBunched))).toEqual([
        HOPS_MS + 2 * FEEL.hopGapMs - FEEL.hopShedLeadMs,
      ]);
    });

    it("sends its copy to its goal out of the cage", () => {
      expect(
        firstBunch(MOVE_FIXTURES.cageBunched).flatMap((part) =>
          part.what === "gathered" ? [part.piece] : [],
        ),
      ).toMatchObject([
        { id: 1, caged: false },
        { id: 2, caged: false },
        { id: 6, caged: false },
      ]);
    });
  });

  it("opens the cage of each that runs into a special made a moment before they run in", () => {
    const play = firstWaveOf(MOVE_FIXTURES.dasherAcrossMade);
    const grid = withCages(play.grid, [0, 3]);

    const parts = bunchOf(itemAt(play.wave.bunches, 0), 0, { ...play, grid });

    expect(cagesOpenedMs(parts)).toEqual([
      HOPS_MS - FEEL.hopShedLeadMs,
      HOPS_MS - FEEL.hopShedLeadMs,
    ]);
  });

  it("opens the cage of the one that stays to become the special a fall's bunch makes, before it becomes it", () => {
    // The swap gathers the greens, the blues above them fall onto the
    // caged blue, and the 4 down make a dasher at their bottom, the cage's
    // square.
    const picture = { pieces: ["bra", "bar", "ggr", "bag", "Bra"] };
    const options: GameOptions = {
      goals: [{ what: "cage" }, { what: "gather", kind: "pink", count: 30 }],
    };
    const { record } = playMove(
      gameFrom(picture, options),
      8,
      11,
      ELEMENT_RULES,
      WIND_RULE,
    );

    const timeline = timelineOf(
      record,
      moveStartOf({ picture, options, record }),
      FEEL,
      { speed: "normal", motion: "full" },
      null,
    );

    const opened = timeline.sounds.filter(({ sound }) => sound === "cage");
    const runsInMs = timeline.pieces
      .find(({ id }) => id === 1)
      ?.faces.find(({ face }) => face === "happy")?.atMs;
    expect({
      opened: opened.map(({ atMs }) => atMs),
      becomes: timeline.pieces.find(({ id }) => id === 13)?.becomes,
    }).toMatchObject({
      opened: [(runsInMs ?? 0) - FEEL.hopShedLeadMs],
      becomes: [
        { atMs: opened[0]?.atMs, piece: { caged: false, special: null } },
        { piece: { caged: false, special: "dasher-down" } },
      ],
    });
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
