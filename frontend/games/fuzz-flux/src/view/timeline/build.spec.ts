import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { pieceAt } from "../../testing/played_parts";
import { gridOf, moveStartOf } from "../../testing/shown_board";
import { heldTimelineOf, timelineOf } from "./build";
import { FEEL } from "./feel";
import type { Pace } from "./pace";

/** The pace a move plays at unless the player sets Fast. */
const NORMAL: Pace = { speed: "normal" };

/** The bunch of 3 played by hand, from square 1 to 4, on its board. */
const BUNCH = MOVE_FIXTURES.bunch;

/** Returns the id of the piece on a square of a move played by hand as it starts. */
function idOn(fixture: typeof BUNCH, square: number): number {
  return moveStartOf(fixture).grid.squares[square]?.piece?.id ?? -1;
}

describe("timelineOf", () => {
  it("stands each of a swap's two on the other's square once it is done", () => {
    const timeline = timelineOf(BUNCH.record, moveStartOf(BUNCH), FEEL, NORMAL);

    expect([
      pieceAt(timeline, idOn(BUNCH, 1), FEEL.swapMs),
      pieceAt(timeline, idOn(BUNCH, 4), FEEL.swapMs),
    ]).toMatchObject([
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
  });

  it("swaps faster at the Fast pace, by the feel's", () => {
    const timeline = timelineOf(BUNCH.record, moveStartOf(BUNCH), FEEL, {
      speed: "fast",
    });

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
    );

    expect(timeline.restMs).toBe(FEEL.refusedOutMs + FEEL.refusedBackMs);
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
