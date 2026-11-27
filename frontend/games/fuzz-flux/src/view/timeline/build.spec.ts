import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { pieceAt } from "../../testing/played_parts";
import { gridOf, moveStartOf } from "../../testing/shown_board";
import { onRung } from "../effects/ladder";
import { FEEL } from "./feel";
import { type PlaySettings, heldTimelineOf, timelineOf } from "./build";

/** How moves play unless the player sets them otherwise. */
const NORMAL: PlaySettings = { speed: "normal", motion: "full" };

/** The bunch of 3 played by hand, from square 1 to 4, on its board. */
const BUNCH = MOVE_FIXTURES.bunch;

/** Returns the id of the piece on a square of a move played by hand as it starts. */
function idOn(fixture: typeof BUNCH, square: number): number {
  return moveStartOf(fixture).grid.squares[square]?.piece?.id ?? -1;
}

describe("timelineOf", () => {
  it("stands each of a swap's two on the other's square once it is done", () => {
    const timeline = timelineOf(
      BUNCH.record,
      moveStartOf(BUNCH),
      FEEL,
      NORMAL,
      null,
    );

    expect([
      pieceAt(timeline, idOn(BUNCH, 1), FEEL.swapMs),
      pieceAt(timeline, idOn(BUNCH, 4), FEEL.swapMs),
    ]).toMatchObject([
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
  });

  it("huddles the bunch the swap makes once the swap is done", () => {
    const timeline = timelineOf(
      BUNCH.record,
      moveStartOf(BUNCH),
      FEEL,
      NORMAL,
      null,
    );

    expect([
      pieceAt(timeline, idOn(BUNCH, 0), FEEL.swapMs - 1).face,
      pieceAt(timeline, idOn(BUNCH, 0), FEEL.swapMs).face,
    ]).toEqual(["rest", "eep"]);
  });

  it("comes to rest a wave's gap after the last fuzzball has landed", () => {
    const timeline = timelineOf(
      BUNCH.record,
      moveStartOf(BUNCH),
      FEEL,
      NORMAL,
      null,
    );

    expect(timeline.restMs).toBe(
      FEEL.swapMs +
        FEEL.huddleMs +
        3 * FEEL.hopGapMs +
        FEEL.hopMs * FEEL.fallAfterHop +
        FEEL.fallWaitMs +
        2 * FEEL.laneGapMs +
        FEEL.fallBaseMs +
        FEEL.fallPerSquareMs +
        FEEL.waveGapMs,
    );
  });

  it("comes to rest a while after a wave that lets nothing fall", () => {
    const [wave] = BUNCH.record.waves;
    const record = {
      ...BUNCH.record,
      waves: [{ ...wave, falls: [] }],
    };

    const timeline = timelineOf(record, moveStartOf(BUNCH), FEEL, NORMAL, null);

    expect(timeline.restMs).toBe(
      FEEL.swapMs +
        FEEL.huddleMs +
        3 * FEEL.hopGapMs +
        FEEL.hopMs * FEEL.fallAfterHop +
        FEEL.restWithoutFallMs,
    );
  });

  it("lets fuzzballs in from the edge the wind blows from", () => {
    const timeline = timelineOf(
      BUNCH.record,
      { ...moveStartOf(BUNCH), wind: { blows: "up", turnsIn: null } },
      FEEL,
      NORMAL,
      null,
    );

    expect(timeline.pieces.find(({ id }) => id === 10)?.look.y).toBe(3);
  });

  it("plays a special swapped going off, and the fuzzballs it takes", () => {
    const fixture = MOVE_FIXTURES.dasherGoesOff;

    const timeline = timelineOf(
      fixture.record,
      moveStartOf(fixture),
      FEEL,
      NORMAL,
      null,
    );

    expect([
      timeline.pieces.find(({ id }) => id === 5)?.untilMs,
      pieceAt(
        timeline,
        1,
        FEEL.swapMs +
          FEEL.blastAfterMs +
          FEEL.streaksAfterMs +
          FEEL.dasherSquareMs,
      ).face,
    ]).toEqual([FEEL.swapMs + FEEL.blastAfterMs + FEEL.dasherGoneMs, "happy"]);
  });

  it("swaps faster at the Fast pace, by the feel's", () => {
    const timeline = timelineOf(
      BUNCH.record,
      moveStartOf(BUNCH),
      FEEL,
      { speed: "fast", motion: "full" },
      null,
    );

    expect(
      pieceAt(timeline, idOn(BUNCH, 1), FEEL.swapMs / FEEL.fastPace),
    ).toMatchObject({ x: 1, y: 1 });
  });

  it("puts the fuzzball picked up down as the move starts", () => {
    const timeline = timelineOf(
      BUNCH.record,
      { ...moveStartOf(BUNCH), held: 1 },
      FEEL,
      NORMAL,
      null,
    );

    expect([
      pieceAt(timeline, idOn(BUNCH, 1), 0).scaleX,
      pieceAt(timeline, idOn(BUNCH, 1), FEEL.putDownMs).scaleX,
    ]).toEqual([FEEL.pickUpScale, 1]);
  });

  it("comes to rest once a swap refused has leaned out and back", () => {
    const refused = MOVE_FIXTURES.refused;

    const timeline = timelineOf(
      refused.record,
      moveStartOf(refused),
      FEEL,
      NORMAL,
      null,
    );

    expect(timeline.restMs).toBe(FEEL.refusedOutMs + FEEL.refusedBackMs);
  });

  it("flies the bunch's fuzzballs to the goal of their kind, counting it down as each lands", () => {
    const cleared = MOVE_FIXTURES.cleared;

    const timeline = timelineOf(
      cleared.record,
      moveStartOf(cleared),
      FEEL,
      NORMAL,
      { encore: { spares: [] }, stars: 1 },
    );

    expect([
      timeline.flights.map(({ drawn }) => drawn.id),
      timeline.counts.map(({ left }) => left),
    ]).toEqual([
      [1, 5, 3],
      [2, 1, 0],
    ]);
  });

  it("flies a special another sets off to the goal of its kind", () => {
    const setOff = MOVE_FIXTURES.dasherSetsOffPuffer;
    const goal = { what: "gather", kind: "green", count: 5 } as const;

    const timeline = timelineOf(
      setOff.record,
      { ...moveStartOf(setOff), goals: [{ goal, left: 5, met: false }] },
      FEEL,
      NORMAL,
      null,
    );

    expect(timeline.flights.map(({ drawn }) => drawn.id)).toEqual([4]);
  });

  it("flies nothing to the goals with Less motion, counting each a moment on", () => {
    const cleared = MOVE_FIXTURES.cleared;

    const timeline = timelineOf(
      cleared.record,
      moveStartOf(cleared),
      FEEL,
      { speed: "normal", motion: "less" },
      { encore: { spares: [] }, stars: 1 },
    );

    expect([timeline.flights, timeline.counts.map(({ left }) => left)]).toEqual(
      [[], [2, 1, 0]],
    );
  });

  it("pops a bubble for each fuzzball a dasher takes at once, each on its own rung", () => {
    const dasher = MOVE_FIXTURES.dasherGoesOff;

    const timeline = timelineOf(
      dasher.record,
      moveStartOf(dasher),
      FEEL,
      NORMAL,
      null,
    );

    expect(
      timeline.sounds
        .filter(({ sound }) => sound.startsWith("pop"))
        .map(({ sound, cents }) => ({ sound, cents })),
    ).toEqual([onRung("pop", 1), onRung("pop", 2)]);
  });

  it("ends a level cleared with the Cleared card, lighting each star it earned", () => {
    const cleared = MOVE_FIXTURES.cleared;

    const timeline = timelineOf(
      cleared.record,
      moveStartOf(cleared),
      FEEL,
      NORMAL,
      { encore: { spares: [] }, stars: 3 },
    );

    expect(timeline.end?.starsMs).toHaveLength(3);
  });

  it("ends a level run out of moves with the Out of moves card", () => {
    const over = MOVE_FIXTURES.outOfMoves;

    const timeline = timelineOf(
      over.record,
      moveStartOf(over),
      FEEL,
      NORMAL,
      null,
    );

    expect(timeline.end).toEqual({
      cardMs: timeline.restMs + FEEL.overCardAfterMs,
      starsMs: [],
      hurriedFromMs: null,
    });
  });
});

describe("heldTimelineOf", () => {
  /** A board of 3 fuzzballs across, numbered 1 to 3. */
  const GRID = gridOf(boardFrom(["rgb"]));

  it("picks one fuzzball up, as its lookers look its way, and puts another down", () => {
    const timeline = heldTimelineOf(
      GRID,
      { up: 0, lookers: [1], down: 2 },
      FEEL,
      NORMAL,
    );

    expect([
      pieceAt(timeline, 1, FEEL.pickUpMs).scaleX,
      pieceAt(timeline, 2, 0).lookX,
      pieceAt(timeline, 3, FEEL.putDownMs).scaleX,
    ]).toEqual([FEEL.pickUpScale, -1, 1]);
  });

  it("comes to rest once both are done", () => {
    const timeline = heldTimelineOf(
      GRID,
      { up: 0, lookers: [], down: 2 },
      FEEL,
      NORMAL,
    );

    expect(timeline.restMs).toBe(Math.max(FEEL.pickUpMs, FEEL.putDownMs));
  });

  it("is at rest at once for a tap that picks up and puts down nothing", () => {
    const timeline = heldTimelineOf(
      GRID,
      { up: null, lookers: [], down: null },
      FEEL,
      NORMAL,
    );

    expect(timeline.restMs).toBe(0);
  });
});
