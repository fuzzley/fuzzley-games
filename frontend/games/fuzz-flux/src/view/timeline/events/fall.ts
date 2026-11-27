// A wave's fall: after a moment's wait, each piece falls to where it lands,
// a lane at a time across the board and a stack bottom first, speeding up
// and stretching along the way it falls as it goes, those let in coming
// from over the board's edge; then it squashes against what it lands on,
// with a landing's sound, louder the further it fell, springs back and
// blinks.

import type { Wind } from "../../../rules/board/board";
import { itemAt } from "@fz/core/records";
import { squareOf } from "../../../rules/board/cells";
import type { Piece } from "../../../rules/catalog/pieces";
import type { Fall } from "../../../rules/move/record";
import { fallingIn } from "../board_after";
import { lookAt, restingFace } from "../looks";
import { type Part, cue, facing, moves, sets } from "../part";
import type { Place } from "../timeline";
import type { WavePlay } from "../wave_play";

/** The way each wind blows on the screen, a square at a time. */
export const WAYS = {
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
} as const satisfies Readonly<Record<Wind, Place>>;

/** Describes a fall as it is laid out among its wave's. */
interface Falling {
  readonly fall: Fall;
  /** The piece it brings down. */
  readonly piece: Piece;
  /** Its way down: where it falls from, then each corner it turns, then where it lands. */
  readonly points: readonly Place[];
  readonly startMs: number;
  readonly lengthMs: number;
}

/**
 * Returns the parts of a wave's falls from the moment the board falls,
 * holding it until the last has landed, or none for a wave that lets
 * nothing fall.
 */
export function fallsOf(play: WavePlay, fallMs: number): readonly Part[] {
  const falls = laidOut(play, fallMs);
  return falls.length === 0
    ? []
    : [
        ...falls.flatMap((falling) => fallOf(falling, play)),
        {
          what: "hold",
          atMs: Math.max(
            ...falls.map(({ startMs, lengthMs }) => startMs + lengthMs),
          ),
        },
      ];
}

/**
 * Returns each of a wave's falls laid out: a lane at a time across the
 * board's frame, and up each lane from the bottom, those let in falling
 * from over the edge the wind blows from, stacked there in turn.
 */
function laidOut(play: WavePlay, fallMs: number): readonly Falling[] {
  const { feel, wave } = play;
  const pieces = fallingIn(play.grid, wave);
  const lanes = [...new Set(wave.falls.map(({ lane }) => lane))].sort(
    (a, b) => a - b,
  );
  return wave.falls.map((fall, index) => {
    const below = wave.falls
      .slice(0, index)
      .filter(({ lane }) => lane === fall.lane);
    const path = fall.path.map((square) => squareOf(square, play.grid.width));
    const points = cornersOf([
      fall.from === null
        ? overEdge(
            itemAt(path, 0),
            play,
            below.filter(({ from }) => from === null).length,
          )
        : squareOf(fall.from, play.grid.width),
      ...path,
    ]);
    const squares = lengthOf(points);
    return {
      fall,
      piece: itemAt(pieces, index),
      points,
      startMs:
        fallMs +
        (lanes.indexOf(fall.lane) * feel.laneGapMs +
          below.length * feel.stackGapMs) *
          play.quickening,
      lengthMs:
        (feel.fallBaseMs +
          feel.fallPerSquareMs * squares ** feel.fallExponent) *
        play.quickening,
    };
  });
}

/**
 * Returns where a piece let in starts its fall: over the edge of the board
 * the wind blows from, in line with the square it falls to first, a square
 * further out for each let in down its lane before it.
 */
function overEdge(first: Place, play: WavePlay, letInBelow: number): Place {
  switch (play.blows) {
    case "down":
      return { x: first.x, y: -1 - letInBelow };
    case "up":
      return { x: first.x, y: play.grid.height + letInBelow };
    case "right":
      return { x: -1 - letInBelow, y: first.y };
    case "left":
      return { x: play.grid.width + letInBelow, y: first.y };
  }
}

/** Returns a way through some places with each place it passes straight through left out. */
function cornersOf(places: readonly Place[]): readonly Place[] {
  return places.filter((place, index) => {
    const before = places[index - 1];
    const after = places[index + 1];
    return (
      before === undefined ||
      after === undefined ||
      Math.sign(place.x - before.x) !== Math.sign(after.x - place.x) ||
      Math.sign(place.y - before.y) !== Math.sign(after.y - place.y)
    );
  });
}

/** Returns how many squares long a way through some places is. */
function lengthOf(points: readonly Place[]): number {
  return points.reduce((length, point, index) => {
    const before = points[index - 1];
    return before === undefined
      ? length
      : length + Math.hypot(point.x - before.x, point.y - before.y);
  }, 0);
}

/** Returns the parts of one piece's fall and landing. */
function fallOf(
  { fall, piece, points, startMs, lengthMs }: Falling,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const way = WAYS[play.blows];
  const across = Math.abs(way.x);
  const down = Math.abs(way.y);
  const landMs = startMs + lengthMs;
  const look = { lookX: way.x * feel.fallLook, lookY: way.y * feel.fallLook };
  const shows: readonly Part[] =
    fall.from === null
      ? [
          {
            what: "shows",
            piece,
            atMs: startMs,
            look: { ...lookAt(itemAt(points, 0)), ...look },
            face: restingFace(piece),
          },
        ]
      : sets(fall.piece, startMs, look);
  return [
    ...shows,
    ...along(fall.piece, points, startMs, lengthMs),
    // Its stretch grows with its speed, whole a share of the way along,
    // which a fall eased in reaches at the root of that share of its time.
    ...moves(
      fall.piece,
      startMs,
      lengthMs * Math.sqrt(1 / feel.fallStretchGrowth),
      "in",
      {
        scaleX: 1 - feel.fallNarrow * down + feel.fallStretch * across,
        scaleY: 1 - feel.fallNarrow * across + feel.fallStretch * down,
      },
    ),
    cue(
      "land",
      landMs,
      Math.min(
        1,
        feel.landVolume + lengthOf(points) * feel.landVolumePerSquare,
      ),
    ),
    ...sets(fall.piece, landMs, { lookX: 0, lookY: 0 }),
    ...moves(fall.piece, landMs, feel.landSquashMs, "out", {
      scaleX: 1 + feel.landWiden * down - feel.landSquash * across,
      scaleY: 1 + feel.landWiden * across - feel.landSquash * down,
    }),
    ...moves(
      fall.piece,
      landMs + feel.landSquashMs,
      feel.landMs - feel.landSquashMs,
      "spring",
      { scaleX: 1, scaleY: 1 },
    ),
    ...(piece.what === "sleepyhead"
      ? []
      : [
          facing(fall.piece, landMs + feel.landBlinkAfterMs, "blink"),
          facing(
            fall.piece,
            landMs + feel.landBlinkAfterMs + feel.blinkMs,
            restingFace(piece),
          ),
        ]),
  ];
}

/**
 * Returns the parts that move a piece along its way, eased in over the
 * whole: the first stretch at its own ease, each after it straight on, at
 * the pace that brings it to its corner when the whole's ease would.
 */
function along(
  piece: number,
  points: readonly Place[],
  startMs: number,
  lengthMs: number,
): readonly Part[] {
  const squares = lengthOf(points);
  const reachedMs = (point: number): number =>
    startMs +
    lengthMs * Math.sqrt(lengthOf(points.slice(0, point + 1)) / squares);
  return points.slice(1).flatMap((point, index) => {
    const fromMs = reachedMs(index);
    return moves(
      piece,
      fromMs,
      reachedMs(index + 1) - fromMs,
      index === 0 ? "in" : "linear",
      point,
    );
  });
}
