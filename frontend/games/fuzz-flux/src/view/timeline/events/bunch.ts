// A bunch gathered: it sees itself and huddles, wide-eyed, then each of it
// hops off in turn along it, or, where it makes a special, the rest run
// into the one that stays as the special shows.

import { squareOf } from "../../../rules/board/cells";
import type { KindId } from "../../../rules/catalog/kinds";
import type { Bunch, Hit } from "../../../rules/move/record";
import type { FeelTuning } from "../feel";
import { RAISED } from "../looks";
import { type Part, facing, moves, sets, tuftsOf } from "../part";
import { type Standing, standingOn } from "../standing";
import type { Place } from "../timeline";
import { type WavePlay, stayingThrough } from "../wave_play";
import { hopOff } from "./hop";
import { type Made, madeOf } from "./made";

/** Describes a fuzzball of a bunch gathered from its square. */
interface Member {
  readonly standing: Standing;
  /** The kind it is gathered as, or null for the frizzball. */
  readonly kind: KindId | null;
}

/**
 * Returns the parts of a bunch gathered, the wave's bunches hopping off in
 * the order given, holding the board until it may fall.
 */
export function bunchOf(
  bunch: Bunch,
  order: number,
  play: WavePlay,
): readonly Part[] {
  const { feel, grid } = play;
  const members = play.wave.hits.flatMap((hit) => memberOf(bunch, hit, play));
  const making = bunch.makes;
  const stays =
    making !== null && grid.squares[making.square]?.piece?.id === making.piece;
  const keeper = making === null ? null : squareOf(making.square, grid.width);
  const hopsMs = play.hopsMs + order * feel.bunchGapMs;
  const lastHopMs = hopsMs + members.length * feel.hopGapMs;
  return [
    ...[
      ...members.map(({ standing }) => standing),
      ...(making !== null && stays ? [standingOn(grid, making.square)] : []),
    ].flatMap((standing) =>
      huddle(standing, keeper ?? middleOf(bunch, grid.width), play),
    ),
    ...members.flatMap(({ standing, kind }, index) =>
      keeper === null
        ? hopOff(
            standing,
            kind,
            hopsMs + (index + 1) * feel.hopGapMs,
            play.before,
            feel,
          )
        : runIn(standing, kind, keeper, hopsMs, feel),
    ),
    { what: "hold", atMs: lastHopMs + feel.hopMs * feel.fallAfterHop },
    ...(making === null
      ? []
      : specialMade(
          {
            making,
            kind: bunch.kind,
            at: squareOf(making.square, grid.width),
            stays,
            onlookers: stayingThrough(play).filter(
              ({ piece }) => piece.id !== making.piece,
            ),
          },
          hopsMs,
          feel,
        )),
  ];
}

/** Returns the parts of the special a bunch makes as the rest run into it from a moment, holding the board until it may fall. */
function specialMade(
  made: Made,
  runInMs: number,
  feel: FeelTuning,
): readonly Part[] {
  return [
    ...madeOf(made, runInMs + feel.runInMs - feel.madeLeadMs, feel),
    { what: "hold", atMs: runInMs + feel.runInMs + feel.fallAfterMadeMs },
  ];
}

/** Returns a hit as a fuzzball of a bunch gathered from its square, or none for any other hit. */
function memberOf(bunch: Bunch, hit: Hit, play: WavePlay): readonly Member[] {
  return hit.what === "gathered" &&
    hit.blast === null &&
    hit.step === 0 &&
    bunch.squares.includes(hit.square)
    ? [{ standing: standingOn(play.grid, hit.square), kind: hit.kind }]
    : [];
}

/** Returns the middle of a bunch's squares. */
function middleOf(bunch: Bunch, width: number): Place {
  const places = bunch.squares.map((square) => squareOf(square, width));
  return {
    x: places.reduce((sum, { x }) => sum + x, 0) / places.length,
    y: places.reduce((sum, { y }) => sum + y, 0) / places.length,
  };
}

/** Returns the parts of a fuzzball of a bunch huddling toward a place, wide-eyed, as the wave starts. */
function huddle(
  { piece, at }: Standing,
  toward: Place,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const across = toward.x - at.x;
  const down = toward.y - at.y;
  const far = Math.hypot(across, down) || 1;
  return [
    facing(piece.id, play.startMs, "eep"),
    ...sets(piece.id, play.startMs, { lookX: across / far, lookY: down / far }),
    ...moves(piece.id, play.startMs, feel.huddleMs * play.quickening, "out", {
      x: at.x + (across / far) * feel.huddleLean,
      y: at.y + (down / far) * feel.huddleLean,
      scaleX: feel.huddleScale,
      scaleY: feel.huddleScale,
    }),
  ];
}

/** Returns the parts of a fuzzball of a bunch running into the special it makes, shrinking and fading as it goes. */
function runIn(
  { piece, at }: Standing,
  kind: KindId | null,
  keeper: Place,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const fadeMs = atMs + feel.runInMs * feel.runInFadeFrom;
  return [
    facing(piece.id, atMs, "happy"),
    ...sets(piece.id, atMs, { raise: RAISED.moving }),
    ...moves(piece.id, atMs, feel.runInMs, "in", {
      ...keeper,
      scaleX: feel.runInScale,
      scaleY: feel.runInScale,
    }),
    ...moves(piece.id, fadeMs, feel.runInMs * (1 - feel.runInFadeFrom), "in", {
      fade: 1,
    }),
    ...tuftsOf(kind, atMs, at, feel.runInTufts, feel.tuftPower),
    { what: "leaves", piece: piece.id, atMs: atMs + feel.runInMs },
  ];
}
