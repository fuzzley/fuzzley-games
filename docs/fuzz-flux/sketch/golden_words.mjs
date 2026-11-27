/**
 * Puts the sketch's play into the game's words: a game as the game's `Game`
 * holds it, and a move's record as its `MoveRecord` does, every square in
 * the screen's frame, for `golden.mjs` to write down.
 */

/** @import { Level, Piece as SketchPiece, Record as SketchRecord, State, Step } from "./engine.mjs" */
/** @import { Game, QuarterTurns } from "../../../frontend/games/fuzz-flux/src/rules/board/board.ts" */
/** @import { ElementGoalId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/goals.ts" */
/** @import { BrickLayers, DustLayers } from "../../../frontend/games/fuzz-flux/src/rules/catalog/elements.ts" */
/** @import { KindId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/kinds.ts" */
/** @import { Piece } from "../../../frontend/games/fuzz-flux/src/rules/catalog/pieces.ts" */
/** @import { BlastId, MadeId, SpecialId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/specials.ts" */
/** @import { Hit, MoveRecord, Strike, Wave } from "../../../frontend/games/fuzz-flux/src/rules/move/record.ts" */

import { onScreen, reach } from "./engine.mjs";

/**
 * Each goal that clears an element, in the game's words, by the sketch's.
 * @type {Readonly<Record<string, ElementGoalId>>}
 */
const ELEMENT_GOALS = {
  dust: "dust",
  brick: "brick",
  cage: "cage",
  sleepy: "sleepyhead",
};

/**
 * Each special fuzzball in the game's words, by the sketch's, a dasher's way
 * the frame's it is in.
 * @type {Readonly<Record<string, SpecialId>>}
 */
const SPECIALS = {
  "dash-h": "dasher-across",
  "dash-v": "dasher-down",
  puff: "puffer",
  wisp: "wisp",
};

/**
 * What a bunch can make, and every blast, in the game's words, by the
 * sketch's, a dasher's way the frame's it goes off in.
 * @type {Readonly<Record<string, BlastId>>}
 */
const BLASTS = {
  ...SPECIALS,
  frizz: "frizzball",
  cross: "two-dashers",
  bigcross: "dasher-and-puffer",
  bigpuff: "two-puffers",
  wisp3: "two-wisps",
  "wisp-dash-h": "wisp-and-dasher-across",
  "wisp-dash-v": "wisp-and-dasher-down",
  "wisp-puff": "wisp-and-puffer",
  "frizz-dash": "frizzball-and-dasher",
  "frizz-puff": "frizzball-and-puffer",
  "frizz-wisp": "frizzball-and-wisp",
  "frizz-frizz": "two-frizzballs",
};

/**
 * Each of the game's words with a dasher's way in it, and its word for the
 * other way, which a quarter turn of the frame makes of it.
 * @type {Readonly<Partial<Record<BlastId, BlastId>>>}
 */
const TURNED = {
  "dasher-across": "dasher-down",
  "dasher-down": "dasher-across",
  "wisp-and-dasher-across": "wisp-and-dasher-down",
  "wisp-and-dasher-down": "wisp-and-dasher-across",
};

/**
 * Each hit that strikes a piece and does no more to it than its word says,
 * in the game's words, by the sketch's.
 * @type {Readonly<Record<string, "uncaged" | "unburred" | "broken" | "ruffled">>}
 */
const PLAIN_HITS = {
  uncage: "uncaged",
  unburr: "unburred",
  break: "broken",
  ruffle: "ruffled",
};

/**
 * Describes a board's frame: its width and height in its own frame, and the
 * quarter turns clockwise it is turned from the screen's.
 * @typedef {Pick<State, "w" | "h" | "rot">} Frame
 */

/**
 * Returns where a square of a board's own frame is on the screen, by the
 * sketch's `onScreen()`, as the screen numbers its squares.
 * @param {Frame} frame
 * @param {number} square
 * @returns {number}
 */
export function onScreenAt(frame, square) {
  // onScreen() reads no more of a game than its frame.
  const { x, y } = onScreen(/** @type {State} */ (frame), square);
  return y * (frame.rot % 2 === 0 ? frame.w : frame.h) + x;
}

/**
 * Returns a game of the sketch's in the game's words, its board in its own
 * frame, as the game's `Game` holds it.
 * @param {State} s
 * @param {Level} level
 * @returns {Game}
 */
export function gameOf(s, level) {
  const kinds = /** @type {KindId[]} */ (level.kinds);
  return {
    board: {
      width: s.w,
      height: s.h,
      open: Array.from(s.open, (open) => open === 1),
      pieces: s.piece.map((piece) => pieceOf(piece, kinds)),
      dust: /** @type {DustLayers[]} */ (Array.from(s.dust)),
      beds: Array.from(s.bed, (bed) => bed === 1),
    },
    turns: /** @type {QuarterTurns} */ (s.rot),
    kinds,
    goals: level.goals.map((goal) =>
      goal.type === "gather"
        ? {
            what: "gather",
            kind: /** @type {KindId} */ (goal.kind),
            count: goal.count,
          }
        : { what: ELEMENT_GOALS[goal.type] },
    ),
    goalsLeft: s.left.slice(),
    movesLeft: s.moves,
    movesPlayed: s.turn,
    seed: s.seed,
    lanes: /** @type {Game["lanes"]} */ (
      s.spawned.map((lanes) => lanes.slice())
    ),
    nextPieceId: s.nextId,
    wind:
      s.gust === null
        ? null
        : { every: s.gust.every, quarters: s.gust.turn, wait: s.gust.wait },
    outcome: s.won ? "cleared" : s.lost ? "over" : "playing",
  };
}

/**
 * Returns a piece of the sketch's in the game's words, a dasher's way its
 * frame's.
 * @param {SketchPiece | null} piece
 * @param {readonly KindId[]} kinds
 * @returns {Piece | null}
 */
function pieceOf(piece, kinds) {
  switch (piece?.t) {
    case undefined:
      return null;
    case "fuzz":
      return {
        what: "fuzzball",
        id: piece.id,
        kind: kinds[piece.k],
        special: piece.sp === null ? null : SPECIALS[piece.sp],
        caged: piece.cage,
        burred: piece.burr,
      };
    case "frizz":
      return { what: "frizzball", id: piece.id };
    case "brick":
      return {
        what: "brick",
        id: piece.id,
        layers: /** @type {BrickLayers} */ (piece.hp),
      };
    case "sleepy":
      return { what: "sleepyhead", id: piece.id };
  }
}

/**
 * Returns a move's record of the sketch's in the game's words and the
 * screen's frame.
 * @param {SketchRecord} record
 * @param {State} before The game before the move.
 * @param {State} after The game after it.
 * @param {readonly KindId[]} kinds
 * @returns {MoveRecord}
 */
export function recordOf(record, before, after, kinds) {
  const at = (/** @type {number} */ square) => onScreenAt(before, square);
  const turned = (/** @type {number} */ square) => onScreenAt(after, square);
  // The sketch's knock says which brick it hit, not what is left of it.
  /** @type {Map<number, number>} */
  const layers = new Map();
  for (const piece of before.piece) {
    if (piece?.t === "brick") layers.set(piece.id, piece.hp);
  }
  return {
    swap: {
      from: at(record.swap.a),
      to: at(record.swap.b),
      refused: !record.swap.ok,
    },
    waves: record.steps.map((step) => waveOf(step, before, kinds, layers)),
    burrSpread:
      record.burr === null
        ? null
        : {
            from: at(record.burr.from),
            to: at(record.burr.to),
            piece: record.burr.id,
          },
    gust:
      record.gust === null
        ? null
        : {
            turns: /** @type {QuarterTurns} */ (record.gust.rot),
            waves: record.gust.steps.map((step) =>
              waveOf(step, after, kinds, layers),
            ),
          },
    shuffle:
      record.shuffle === null
        ? null
        : {
            moves: record.shuffle.perm.map(({ id, from, to }) => ({
              piece: id,
              from: turned(from),
              to: turned(to),
            })),
          },
    outcome: record.won ? "cleared" : record.lost ? "over" : "playing",
  };
}

/**
 * Returns a wave of the sketch's in the game's words and the screen's frame.
 * @param {Step} step
 * @param {State} frame The game the wave was played on, in the frame it was played in.
 * @param {readonly KindId[]} kinds
 * @param {Map<number, number>} layers Each brick's layers by its id, which the wave's knocks take off.
 * @returns {Wave}
 * @throws {Error} for a hit struck at a step its blast's strikes don't give it.
 */
function waveOf(step, frame, kinds, layers) {
  const at = (/** @type {number} */ square) => onScreenAt(frame, square);
  const kindOf = (/** @type {number} */ k) => (k < 0 ? null : kinds[k]);
  const strikes = step.blasts.map((blast) => strikesOf(blast, frame));
  return {
    number: step.n,
    bunches: step.bunches.map((bunch) => ({
      squares: bunch.cells.map(at).sort((p, q) => p - q),
      kind: kinds[bunch.kind],
      makes:
        bunch.born === null
          ? null
          : {
              what: madeOnScreen(bunch.born, frame),
              square: at(bunch.keeper),
              piece: bunch.bornId,
            },
    })),
    blasts: step.blasts.map((blast, place) => ({
      what: blastOnScreen(blast.what, frame),
      square: at(blast.i),
      piece: blast.id < 0 ? null : blast.id,
      kind: kindOf(blast.kind),
      setOffBy: blast.after < 0 ? null : blast.after,
      wait: blast.wait,
      strikes: strikes[place].map(({ square, step }) => ({
        square: at(square),
        step,
      })),
    })),
    hits: step.hits.map((hit) => {
      const square = at(hit.i);
      if (hit.what === "born") {
        const bunch = step.bunches.find(({ bornId }) => bornId === hit.id);
        return {
          what: "born",
          square,
          piece: hit.id,
          made: madeOnScreen(/** @type {string} */ (bunch?.born), frame),
          kind: kinds[/** @type {number} */ (hit.kind)],
        };
      }
      if (hit.what === "bed") return { what: "bedded", square, piece: hit.id };
      const blast = hit.src < 0 ? null : hit.src;
      if (blast !== null) {
        const strike = strikes[blast].find(({ square }) => square === hit.i);
        if (strike?.step !== hit.rank) {
          throw new Error(
            `Blast ${blast} hit square ${hit.i} at step ${hit.rank}, where its strikes say ${strike?.step}.`,
          );
        }
      }
      return hitOf(hit, { square, step: hit.rank, blast }, kindOf, layers);
    }),
    falls: step.falls.map((fall) => ({
      piece: fall.id,
      kind: kindOf(fall.kind),
      from: fall.spawn ? null : at(fall.path[0]),
      path: fall.path.slice(1).map(at),
      lane: fall.lane,
    })),
    goalsLeft: step.left.slice(),
  };
}

/**
 * Returns a hit of the sketch's that a bunch or a blast struck, in the
 * game's words.
 * @param {Step["hits"][number]} hit
 * @param {{ square: number, step: number, blast: number | null }} struck Where it was struck, at what step and by which blast, in the game's words.
 * @param {(k: number) => KindId | null} kindOf
 * @param {Map<number, number>} layers Each brick's layers by its id, which a knock takes one off.
 * @returns {Hit}
 */
function hitOf(hit, struck, kindOf, layers) {
  switch (hit.what) {
    case "gather":
      return {
        ...struck,
        what: "gathered",
        piece: hit.id,
        kind: kindOf(/** @type {number} */ (hit.kind)),
      };
    case "knock": {
      const left = /** @type {number} */ (layers.get(hit.id)) - 1;
      layers.set(hit.id, left);
      return {
        ...struck,
        what: "knocked",
        piece: hit.id,
        layersLeft: /** @type {BrickLayers} */ (left),
      };
    }
    case "dust":
      return {
        ...struck,
        what: "dusted",
        layersLeft: /** @type {DustLayers} */ (hit.dustLeft),
      };
    default:
      return { ...struck, what: PLAIN_HITS[hit.what], piece: hit.id };
  }
}

/**
 * Returns each square a blast of the sketch's strikes, with the step it
 * strikes it at, as the sketch's `wave()` counts them: a wisp's flights and
 * a frizzball's fuzzballs one a step from 1, and the rest by the ring
 * `reach()` puts each square in.
 * @param {Step["blasts"][number]} blast
 * @param {Pick<State, "w" | "h" | "open">} board The board it went off on, in its own frame.
 * @returns {Strike[]}
 */
function strikesOf(blast, board) {
  if (blast.targets !== undefined || /^frizz(-(?!frizz)|$)/.test(blast.what)) {
    return blast.cells.map((square, place) => ({ square, step: place + 1 }));
  }
  const rings = new Map(
    reach(
      /** @type {State} */ (board),
      blast.what === "frizz-frizz" ? "all" : blast.what,
      blast.i,
    ).map(({ i, rank }) => [i, rank]),
  );
  return blast.cells.map((square) => ({
    square,
    step: /** @type {number} */ (rings.get(square)),
  }));
}

/**
 * Returns the game's word for a special, a pair or the frizzball as a frame
 * turned so many quarter turns from the one it was named in names it: a
 * dasher's way turns with the frame.
 * @template {BlastId} T
 * @param {T} what
 * @param {number} turns
 * @returns {T}
 */
export function turnedWith(what, turns) {
  // TURNED takes a special to a special and a pair to a pair, so T holds of SpecialId and BlastId alike.
  return turns % 2 === 0 ? what : /** @type {T} */ (TURNED[what] ?? what);
}

/**
 * Returns the game's word for a special, a pair or the frizzball going off,
 * a dasher's way the screen's.
 * @param {string} what The sketch's word.
 * @param {Frame} frame The frame it goes off in.
 * @returns {BlastId}
 */
function blastOnScreen(what, frame) {
  return turnedWith(BLASTS[what], frame.rot);
}

/**
 * Returns the game's word for what a bunch makes, a dasher's way the
 * screen's.
 * @param {string} born The sketch's word.
 * @param {Frame} frame The frame it is made in.
 * @returns {MadeId}
 */
function madeOnScreen(born, frame) {
  return /** @type {MadeId} */ (blastOnScreen(born, frame));
}
