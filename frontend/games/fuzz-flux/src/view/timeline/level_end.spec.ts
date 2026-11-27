import { itemAt } from "@fz/core/records";
import type { EncoreRecord } from "../../rules/move/record";
import { gameFrom } from "../../testing/board_picture";
import { ENCORE_FIXTURE } from "../../testing/move_fixtures";
import { pieceAt } from "../../testing/played_parts";
import { gridOf } from "../../testing/shown_board";
import { Draft } from "./draft";
import { FEEL } from "./feel";
import { POOLS } from "./limits";
import { BIGGEST_CHEER } from "./events/cheer";
import type { Motion } from "./less_motion";
import { type LevelEnd, playLevelEnd } from "./level_end";
import type { Part } from "./part";
import type { Timeline } from "./timeline";

/** When the level's last move lets the board rest. */
const REST_MS = 1000;

/** The board the encore played by hand plays on. */
const GRID = gridOf(
  gameFrom(ENCORE_FIXTURE.picture, ENCORE_FIXTURE.options).board,
);

/** Describes a level's end played, and the timeline it makes. */
interface Ended {
  readonly ended: LevelEnd;
  readonly timeline: Timeline;
}

/** Returns a level cleared, by the encore played by hand or another, earning 2 stars, with some more parts played beside it, in a motion. */
function clearedBy(
  encore: EncoreRecord = ENCORE_FIXTURE.record,
  beside: readonly Part[] = [],
  motion: Motion = "full",
): Ended {
  const draft = new Draft(GRID, [], motion);
  const ended = playLevelEnd(
    draft,
    "cleared",
    { encore, stars: 2 },
    { endMs: REST_MS, grid: GRID, blows: "down" },
    FEEL,
  );
  draft.add(beside);
  return {
    ended,
    timeline: draft.finish(ended.restMs, ended.end, FEEL, POOLS),
  };
}

/** When the encore's first spare move gives its fuzzball a special's fur. */
const GIVEN_MS = REST_MS + FEEL.encoreAfterMs;

describe("playLevelEnd", () => {
  it("ends nothing after a move with which the level plays on", () => {
    expect(
      playLevelEnd(
        new Draft(GRID, [], "full"),
        "playing",
        null,
        { endMs: REST_MS, grid: GRID, blows: "down" },
        FEEL,
      ),
    ).toEqual({ restMs: REST_MS, end: null });
  });

  it("shows the Out of moves card a while after a move that runs out, with no star", () => {
    expect(
      playLevelEnd(
        new Draft(GRID, [], "full"),
        "over",
        null,
        { endMs: REST_MS, grid: GRID, blows: "down" },
        FEEL,
      ),
    ).toEqual({
      restMs: REST_MS,
      end: { cardMs: REST_MS + FEEL.overCardAfterMs, starsMs: [] },
    });
  });

  it("sounds the loss a moment after a move that runs out", () => {
    const draft = new Draft(GRID, [], "full");

    playLevelEnd(
      draft,
      "over",
      null,
      { endMs: REST_MS, grid: GRID, blows: "down" },
      FEEL,
    );

    expect(draft.finish(REST_MS, null, FEEL, POOLS).sounds).toEqual([
      {
        atMs: REST_MS + FEEL.loseSoundAfterMs,
        sound: "lose",
        cents: 0,
        volume: 1,
      },
    ]);
  });

  describe("a level cleared", () => {
    const { ended, timeline } = clearedBy();

    it("sounds the win a moment after the board rests", () => {
      expect(timeline.sounds[0]).toEqual({
        atMs: REST_MS + FEEL.winSoundAfterMs,
        sound: "win",
        cents: 0,
        volume: 1,
      });
    });

    it("sounds the encore as each spare move's fuzzball is given its fur", () => {
      const encores = timeline.sounds.filter(({ sound }) => sound === "encore");

      expect([encores.length, encores[0]?.atMs]).toEqual([
        ENCORE_FIXTURE.record.spares.length,
        GIVEN_MS,
      ]);
    });

    it("plays each star's note as it lights", () => {
      expect(timeline.sounds.slice(-2)).toEqual([
        { atMs: ended.end?.starsMs[0], sound: "star-1", cents: 0, volume: 1 },
        { atMs: ended.end?.starsMs[1], sound: "star-2", cents: 0, volume: 1 },
      ]);
    });

    it("cheers its biggest as the board rests", () => {
      expect(pieceAt(timeline, 1, REST_MS + FEEL.cheerUpMs).scaleY).toBe(
        1 + FEEL.cheerStretch * BIGGEST_CHEER,
      );
    });

    it("gives each spare move's fuzzball the fur of the special it makes, wide-eyed, glowing", () => {
      expect([
        timeline.pieces.find(({ id }) => id === 5)?.becomes,
        pieceAt(timeline, 5, GIVEN_MS),
      ]).toMatchObject([
        [{ atMs: GIVEN_MS, piece: { id: 5, special: "dasher-across" } }],
        { furIn: 0, face: "eep", glow: FEEL.encoreGlow },
      ]);
    });

    it("sets the special off a moment after it is made, as a move would", () => {
      const offMs = GIVEN_MS + FEEL.encoreSpareMs + FEEL.blastAfterMs;

      expect(timeline.pieces.find(({ id }) => id === 5)?.untilMs).toBe(
        offMs + FEEL.dasherGoneMs,
      );
    });

    it("plays each spare move in turn, the next once the board may go on", () => {
      const secondMs = timeline.pieces
        .find(({ id }) => id === 11)
        ?.becomes.at(0)?.atMs;

      expect(secondMs).toBeGreaterThan(GIVEN_MS + FEEL.encoreSpareMs);
    });

    it("shows the Cleared card a while after the encore, lighting each star it earned a beat apart", () => {
      const cardMs = ended.restMs + FEEL.clearedCardAfterMs;

      expect(ended.end).toEqual({
        cardMs,
        starsMs: [
          cardMs + FEEL.starsAfterMs + FEEL.starGapMs,
          cardMs + FEEL.starsAfterMs + 2 * FEEL.starGapMs,
        ],
      });
    });
  });

  it("cheers nothing with Less motion", () => {
    const { timeline } = clearedBy(ENCORE_FIXTURE.record, [], "less");

    expect(pieceAt(timeline, 1, REST_MS + FEEL.cheerUpMs).scaleY).toBe(1);
  });

  it("keeps the flashes from the board's rest a gap at the hurried pace apart, as a tap may hurry the encore", () => {
    const flash = (atMs: number): Part => ({
      what: "effect",
      effect: { what: "flash", atMs, ms: 110, at: { x: 0, y: 0 }, radius: 2 },
    });

    const { timeline } = clearedBy({ spares: [] }, [
      flash(REST_MS),
      flash(REST_MS + FEEL.flashGapMs),
    ]);

    expect(
      timeline.effects
        .filter(({ what }) => what === "flash")
        .map(({ atMs }) => atMs),
    ).toEqual([REST_MS]);
  });

  it("refuses a move that clears its level with no encore", () => {
    expect(() =>
      playLevelEnd(
        new Draft(GRID, [], "full"),
        "cleared",
        null,
        { endMs: REST_MS, grid: GRID, blows: "down" },
        FEEL,
      ),
    ).toThrow(new RangeError("A move that clears its level needs its encore."));
  });

  it("refuses a spare move whose first blast is no special a fuzzball is made", () => {
    const wave = itemAt(itemAt(ENCORE_FIXTURE.record.spares, 0).waves, 0);
    const pair = { ...itemAt(wave.blasts, 0), what: "two-dashers" as const };

    expect(() =>
      clearedBy({ spares: [{ waves: [{ ...wave, blasts: [pair] }] }] }),
    ).toThrow(
      new RangeError(
        "A spare move sets off two-dashers, which no fuzzball is made.",
      ),
    );
  });
});
