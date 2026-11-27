import { boardFrom } from "../../../testing/board_picture";
import { pieceAt, timelineOfParts } from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { standingOn } from "../standing";
import { pickedUp, putDown } from "./pick_up";

/** A board of 4 fuzzballs, numbered 1 to 4 across, then a fifth under the first. */
const GRID = gridOf(boardFrom(["rgbp", "a   "]));

describe("pickedUp", () => {
  const timeline = timelineOfParts(
    GRID,
    pickedUp(
      standingOn(GRID, 0),
      [standingOn(GRID, 2), standingOn(GRID, 4)],
      FEEL,
    ),
  );

  it("grows the fuzzball picked up a little past its size held on the way", () => {
    expect(pieceAt(timeline, 1, FEEL.pickUpMs / 2).scaleX).toBeGreaterThan(
      FEEL.pickUpScale,
    );
  });

  it("settles it at its size held", () => {
    expect(pieceAt(timeline, 1, FEEL.pickUpMs)).toMatchObject({
      scaleX: FEEL.pickUpScale,
      scaleY: FEEL.pickUpScale,
    });
  });

  it("raises it over the board", () => {
    expect(pieceAt(timeline, 1, 0).raise).toBe(RAISED.held);
  });

  it("turns the eyes of those that would bunch with it its way, by a square at most", () => {
    expect([
      [pieceAt(timeline, 3, 0).lookX, pieceAt(timeline, 3, 0).lookY],
      [pieceAt(timeline, 5, 0).lookX, pieceAt(timeline, 5, 0).lookY],
    ]).toEqual([
      [-1, 0],
      [0, -1],
    ]);
  });

  it("leaves the eyes of the others ahead", () => {
    expect(pieceAt(timeline, 2, 0).lookX).toBe(0);
  });

  it("holds the board until it has grown", () => {
    expect(timeline.restMs).toBe(FEEL.pickUpMs);
  });
});

describe("putDown", () => {
  const timeline = timelineOfParts(GRID, putDown(standingOn(GRID, 0), FEEL));

  it("springs the fuzzball from its size held back to its own", () => {
    expect([
      pieceAt(timeline, 1, 0).scaleY,
      pieceAt(timeline, 1, FEEL.putDownMs).scaleY,
    ]).toEqual([FEEL.pickUpScale, 1]);
  });

  it("holds the board until it has", () => {
    expect(timeline.restMs).toBe(FEEL.putDownMs);
  });
});
