import type { CssRect } from "@fz/phaser/layout";
import type { Fuzzball } from "../../rules/catalog/pieces";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  drawnPlay,
  layoutOf,
  playTo,
  startBoard,
} from "../../testing/scene_shell";
import { placeOf } from "../../view/board/spaces";
import { FEEL } from "../../view/timeline/feel";
import { lookAt } from "../../view/timeline/looks";
import { sampleFlight } from "../../view/timeline/sample";
import type { Flight, Sampled } from "../../view/timeline/timeline";
import type { PieceSprite } from "./piece_sprite";

/** The fuzzball whose copy flies. */
const RED: Fuzzball = {
  what: "fuzzball",
  id: 7,
  kind: "red",
  special: null,
  caged: false,
  burred: false,
};

/** A red fuzzball's copy flying from the middle square to the first goal, from the tap. */
const FLIGHT: Flight = {
  atMs: 0,
  ms: FEEL.flightMs,
  drawn: RED,
  from: { x: 1, y: 1 },
  goal: 0,
};

/** Where the first goal's picture lies on the bar, above the board's left. */
const GOAL: CssRect = { x: 10, y: 4, width: 24, height: 24 };

/** The device pixels to a CSS pixel of the canvas the copies fly on. */
const PIXEL_RATIO = 2;

/** Runs the scene on a board flying the copies given to a goal's picture, on a canvas of two device pixels to a CSS pixel, and plays them a time in. */
async function flyingBoard(
  flights: readonly Flight[],
  ms = 16,
  goals: readonly CssRect[] = [GOAL],
): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch, (shell) => {
    shell.goalRects = goals;
  });
  board.run.game.scale.displayScale.set(PIXEL_RATIO, PIXEL_RATIO);
  playTo(board, drawnPlay({ flights }), ms);
  return board;
}

/** Returns the copies' sprites flying, their bodies shown. */
function flying({ scene }: Board): readonly PieceSprite[] {
  return scene.flights.flights.all
    .map(({ sprite }) => sprite)
    .filter(({ body }) => body.visible);
}

/** Returns where the flight's copy stands a time into its flight, in squares, as the view samples it to the goal's picture on the board laid out. */
function sampledAt(board: Board, ms: number): Sampled {
  const to = { x: 0, y: 0 };
  placeOf(layoutOf(board), PIXEL_RATIO, GOAL, to);
  return sampleFlight(FLIGHT, to, FEEL, ms, {
    ...lookAt({ x: 0, y: 0 }),
    shown: false,
    face: "rest",
    drawn: null,
  });
}

describe("FlightsPainter", () => {
  it("flies a fuzzball's copy from the board to its goal's picture, as the view samples its flight", async () => {
    const board = await flyingBoard([FLIGHT], 160);
    const { x, y, square } = layoutOf(board);
    const sampled = sampledAt(board, 160);

    const [copy] = flying(board);

    expect({
      frame: copy?.body.frame.name,
      at: [copy?.body.x, copy?.body.y],
    }).toEqual({
      frame: "body-red-plain-rest",
      at: [
        expect.closeTo(x + (sampled.x + sampled.leanX + 0.5) * square, 9),
        expect.closeTo(y + (sampled.y + sampled.leanY + 0.5) * square, 9),
      ],
    });
  });

  it("lets a copy go once it has landed", async () => {
    const board = await flyingBoard([FLIGHT], FEEL.flightMs + 16);

    expect(flying(board)).toEqual([]);
  });

  it("flies a copy on as the next play starts", async () => {
    const board = await flyingBoard([FLIGHT]);

    playTo(board, drawnPlay({}), 16);

    expect(flying(board)).toHaveLength(1);
  });

  it("flies on the most copies a move lets fly as the next move sets off as many", async () => {
    const most = Array.from({ length: FEEL.mostFlights }, () => FLIGHT);
    const board = await flyingBoard(most);

    playTo(board, drawnPlay({ flights: most }), 16);

    expect(flying(board)).toHaveLength(2 * FEEL.mostFlights);
  });

  it("flies on as many copies as a play's feel, tuned past the design's, lets a move fly, as the next move sets off as many", async () => {
    const feel = { ...FEEL, mostFlights: FEEL.mostFlights + 3 };
    const most = Array.from({ length: feel.mostFlights }, () => FLIGHT);
    const board = await flyingBoard([]);
    playTo(board, { ...drawnPlay({ flights: most }), feel }, 16);

    playTo(board, { ...drawnPlay({ flights: most }), feel }, 16);

    expect(flying(board)).toHaveLength(2 * feel.mostFlights);
  });

  it("flies on the copies of a move at the design's feel as the next move, tuned to let more fly, sets off its own", async () => {
    const feel = { ...FEEL, mostFlights: FEEL.mostFlights + 3 };
    const board = await flyingBoard(
      Array.from({ length: FEEL.mostFlights }, () => FLIGHT),
    );

    playTo(
      board,
      {
        ...drawnPlay({
          flights: Array.from({ length: feel.mostFlights }, () => FLIGHT),
        }),
        feel,
      },
      16,
    );

    expect(flying(board)).toHaveLength(FEEL.mostFlights + feel.mostFlights);
  });

  it("flies every copy set off at once", async () => {
    const board = await flyingBoard([
      FLIGHT,
      { ...FLIGHT, from: { x: 0, y: 2 } },
    ]);

    expect(flying(board)).toHaveLength(2);
  });

  it("flies no copy to a goal with no picture", async () => {
    const board = await flyingBoard([FLIGHT], 16, []);

    expect(flying(board)).toEqual([]);
  });
});
