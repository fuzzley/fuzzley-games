import { itemAt } from "@fz/core/records";
import {
  ELEMENT_RULES,
  WIND_RULE,
} from "../../../rules/elements/element_rules";
import type { Fuzzball } from "../../../rules/catalog/pieces";
import { play } from "../../../rules/move/play";
import type { BurrSpread } from "../../../rules/move/record";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../../testing/board_picture";
import {
  MOVE_FIXTURES,
  type MoveFixture,
} from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { moveStartOf } from "../../../testing/shown_board";
import { FRAMES } from "../../art/frame_names";
import type { GridShown } from "../../run_state";
import type { AfterPlay } from "../after_waves";
import { afterSwap, afterWave } from "../board_after";
import { type PlaySettings, timelineOf } from "../build";
import { Draft } from "../draft";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { type Part, cue, facing, facingAgain, spawns } from "../part";
import { frameFor, sampleAt } from "../sample";
import type { Timeline } from "../timeline";
import { brushedOff, burrSpreads, shedBeforeHop } from "./burr";

/** The bunch beside a burred fuzzball played by hand, which brushes off the burr of piece 4, on square 3 of its 3 by 3 board. */
const BRUSHED = MOVE_FIXTURES.burrBrushedOff;

/** The move after which a burr spreads from square 6 to piece 4, on square 3. */
const SPREADS = MOVE_FIXTURES.burrSpreads;

/** When a spread starts, as a spec plays it. */
const SPREAD_MS = 1000;

/** When the burr lands on the fuzzball it spreads to. */
const LANDS_MS = SPREAD_MS + FEEL.burrSpreadMs;

/** Piece 4 of both moves, a red fuzzball, as it stands on square 3 with no burr. */
const RED: Fuzzball = {
  what: "fuzzball",
  id: 4,
  kind: "red",
  special: null,
  caged: false,
  burred: false,
};

/** Returns the move the rules play swapping two squares of a board, on a game of options. */
function playedOn(
  picture: BoardPicture,
  options: GameOptions,
  from: number,
  to: number,
): MoveFixture {
  const { record } = play(
    gameFrom(picture, options),
    from,
    to,
    ELEMENT_RULES,
    WIND_RULE,
  );
  return { picture, options, record };
}

/**
 * Returns the move the rules play swapping square 1 with 4 on the board of
 * `BRUSHED`, a bunch of 3 blue across its top, its first wearing a burr, on
 * a game whose goal gathers blue.
 */
function burrInBunch(): MoveFixture {
  return playedOn(
    { pieces: BRUSHED.picture.pieces, marks: ["*..", "...", "..."] },
    { goals: [{ what: "gather", kind: "blue", count: 30 }], seed: 3 },
    1,
    4,
  );
}

/**
 * Returns the move the rules play swapping square 6 with 7 on the board of
 * `MOVE_FIXTURES.dasherAcrossMade`, a bunch of 4 blue down its left that
 * makes a dasher on square 6, its first, on square 0, wearing a burr.
 */
function burrRunsIn(): MoveFixture {
  const made = MOVE_FIXTURES.dasherAcrossMade;
  return playedOn(
    { pieces: made.picture.pieces, marks: ["*..", "...", "...", "..."] },
    made.options,
    6,
    7,
  );
}

/** Returns the board a move played by hand leaves once its waves are done. */
function afterWavesOf(fixture: MoveFixture): GridShown {
  const swapped = afterSwap(moveStartOf(fixture).grid, fixture.record.swap);
  return fixture.record.waves.reduce(afterWave, swapped);
}

/** Returns a board with nothing on a square. */
function emptiedOn(grid: GridShown, square: number): GridShown {
  return {
    ...grid,
    squares: grid.squares.map((shown, index) =>
      index === square && shown !== null ? { ...shown, piece: null } : shown,
    ),
  };
}

/** Returns how a burr's spread plays on the board `SPREADS` leaves, from `SPREAD_MS`. */
function spreadPlay(): AfterPlay {
  return {
    atMs: SPREAD_MS,
    grid: afterWavesOf(SPREADS),
    feel: FEEL,
    motion: "full",
  };
}

/** Returns the parts of `SPREADS`' burr spreading. */
function spreadParts(): readonly Part[] {
  return burrSpreads(SPREADS.record.burrSpread, spreadPlay());
}

/** Returns where the burr hopping across stands at a moment of a timeline, across and down. */
function hopAt(timeline: Timeline, ms: number): readonly [number, number] {
  const hop = itemAt(
    sampleAt(timeline, FEEL, ms, frameFor(timeline)).sprites,
    0,
  );
  return [hop.x + hop.leanX, hop.y + hop.leanY];
}

/** Returns the timeline of a move played by hand, in a motion. */
function moveTimeline(
  fixture: MoveFixture,
  motion: PlaySettings["motion"],
): Timeline {
  return timelineOf(
    fixture.record,
    moveStartOf(fixture),
    FEEL,
    { speed: "normal", motion },
    null,
  );
}

/** Returns how many tufts of a burr a timeline throws. */
function burrTuftsIn(timeline: Timeline): number {
  return timeline.effects.reduce(
    (sum, effect) =>
      effect.what === "fluff" && effect.tuft === FRAMES.burrTuft
        ? sum + effect.count
        : sum,
    0,
  );
}

describe("brushedOff", () => {
  it("brushes the burr off as the hit lands, to its sound, in a puff of its tufts, its fuzzball happy a while", () => {
    const parts = brushedOff(
      { what: "unburred", square: 3, step: 1, blast: null, piece: 4 },
      300,
      firstWaveOf(BRUSHED),
    );

    expect(parts).toEqual([
      cue("burr-off", 300),
      { what: "becomes", piece: 4, atMs: 300, drawn: RED },
      spawns({
        what: "fluff",
        atMs: 300,
        at: { x: 0, y: 1 },
        tuft: FRAMES.burrTuft,
        count: FEEL.burrOffTufts,
        power: FEEL.tuftPower,
      }),
      facing(4, 300, "happy"),
      facingAgain(4, 300 + FEEL.burrOffHappyMs, "rest", 300),
    ]);
  });

  it("draws the fuzzball without its burr from the moment the bunch beside it strikes it", () => {
    const timeline = moveTimeline(BRUSHED, "full");
    const struckMs = timeline.sounds.find(
      ({ sound }) => sound === "burr-off",
    )?.atMs;

    expect([
      pieceAt(timeline, 4, (struckMs ?? 0) - 1).drawn,
      pieceAt(timeline, 4, struckMs ?? 0).drawn,
    ]).toEqual([{ ...RED, burred: true }, RED]);
  });

  it("throws a quarter of the burr's tufts with Less motion, rounded", () => {
    expect([
      burrTuftsIn(moveTimeline(BRUSHED, "full")),
      burrTuftsIn(moveTimeline(BRUSHED, "less")),
    ]).toEqual([
      FEEL.burrOffTufts,
      Math.round(FEEL.burrOffTufts * FEEL.lessMotionFluff),
    ]);
  });
});

describe("shedBeforeHop", () => {
  it("sheds a burr a moment before its fuzzball hops off, in a smaller puff of its tufts", () => {
    const at = { x: 1, y: 2 };

    expect(
      shedBeforeHop({ piece: { ...RED, burred: true }, at }, 500, FEEL),
    ).toEqual([
      { what: "becomes", piece: 4, atMs: 500 - FEEL.hopShedLeadMs, drawn: RED },
      spawns({
        what: "fluff",
        atMs: 500 - FEEL.hopShedLeadMs,
        at,
        tuft: FRAMES.burrTuft,
        count: FEEL.burrInBunchTufts,
        power: FEEL.tuftPower,
      }),
    ]);
  });

  it("sheds nothing from a fuzzball with no burr", () => {
    expect(
      shedBeforeHop({ piece: RED, at: { x: 0, y: 0 } }, 500, FEEL),
    ).toEqual([]);
  });

  it("sheds the burr of a fuzzball a bunch takes in before it hops off, so its copy flies bare", () => {
    const timeline = moveTimeline(burrInBunch(), "full");

    expect({
      tufts: burrTuftsIn(timeline),
      flown: timeline.flights.map(({ drawn }) => drawn),
    }).toMatchObject({
      tufts: FEEL.burrInBunchTufts,
      flown: [{ burred: false }, { burred: false }, { burred: false }],
    });
  });

  it("keeps the burr of a fuzzball that runs into the special its bunch makes", () => {
    const timeline = moveTimeline(burrRunsIn(), "full");

    expect(burrTuftsIn(timeline)).toBe(0);
  });

  it("sheds it with Less motion, where the bunch hops off, in a quarter of the tufts, rounded", () => {
    const timeline = moveTimeline(burrRunsIn(), "less");

    expect(burrTuftsIn(timeline)).toBe(
      Math.round(FEEL.burrInBunchTufts * FEEL.lessMotionFluff),
    );
  });
});

describe("burrSpreads", () => {
  it("draws the burr hopping across at half its size, over the rest", () => {
    const timeline = timelineOfParts(spreadPlay().grid, spreadParts());

    const { drawn, look } = itemAt(timeline.sprites, 0);

    expect({ drawn, size: look.scaleX, raise: look.raise }).toEqual({
      drawn: { what: "frame", frame: FRAMES.burr },
      size: FEEL.burrSpreadScale,
      raise: RAISED.top,
    });
  });

  it("hops it from the burred fuzzball to the one it spreads to", () => {
    const timeline = timelineOfParts(spreadPlay().grid, spreadParts());

    expect([
      hopAt(timeline, SPREAD_MS),
      hopAt(timeline, LANDS_MS - 0.001),
    ]).toEqual([
      [0, 2],
      [expect.closeTo(0, 3), expect.closeTo(1, 3)],
    ]);
  });

  it("bends the hop aside and lifts it at its middle", () => {
    const timeline = timelineOfParts(spreadPlay().grid, spreadParts());

    const middle = hopAt(timeline, SPREAD_MS + FEEL.burrSpreadMs / 2);

    expect(middle).toEqual([
      expect.closeTo(FEEL.burrSpreadBendSquares * FEEL.curveArc, 9),
      expect.closeTo(1.5 - FEEL.curveRiseSquares, 9),
    ]);
  });

  it("puts the burr on the fuzzball it lands on, cross, squashed and springing back", () => {
    const timeline = timelineOfParts(spreadPlay().grid, spreadParts());
    const squashedMs = LANDS_MS + FEEL.burrLandSquashMs;

    expect([
      pieceAt(timeline, 4, LANDS_MS - 1).drawn,
      pieceAt(timeline, 4, LANDS_MS).drawn,
      pieceAt(timeline, 4, LANDS_MS).face,
      pieceAt(timeline, 4, squashedMs).scaleX,
      pieceAt(timeline, 4, squashedMs + FEEL.burrLandBackMs).scaleX,
    ]).toEqual([RED, { ...RED, burred: true }, "cross", FEEL.burrLandScale, 1]);
  });

  it("holds the board until the spread lets it go on", () => {
    const draft = new Draft(spreadPlay().grid, [], "full");

    expect(draft.add(spreadParts())).toBe(SPREAD_MS + FEEL.burrSpreadHoldMs);
  });

  it("plays its hop across with Less motion too, the hop being the game", () => {
    expect(
      moveTimeline(SPREADS, "less").sprites.map(({ drawn }) => drawn),
    ).toEqual([{ what: "frame", frame: FRAMES.burr }]);
  });

  it("throws for a spread to a square where no fuzzball stands", () => {
    const toNothing: BurrSpread = { from: 6, to: 0, piece: 1 };
    const shown = spreadPlay();
    const grid = emptiedOn(shown.grid, 0);

    expect(() => burrSpreads(toNothing, { ...shown, grid })).toThrow(
      RangeError,
    );
  });
});
