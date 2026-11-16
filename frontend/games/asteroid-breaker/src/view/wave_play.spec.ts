import type { FieldEvent } from "../rules/field/events";
import { STILL, type Steer } from "../rules/ship/ship";
import { STEP_MS } from "../rules/stepper";
import { MAX_STEPS_PER_FRAME, STEP_S } from "../rules/tuning";
import {
  KEEPER,
  fieldFrom,
  kindsLoggedOn,
  shipOf,
} from "../testing/field_picture";
import { BOULDER_HOLD_MS } from "./effects/timing";
import { PLACE_IDS } from "./places/places";
import { WavePlay } from "./wave_play";

/** Returns a wave's play over a field that stays in play while nothing moves, its rock standing still and no ship. */
function stillPlay(): WavePlay {
  return new WavePlay(fieldFrom(KEEPER), 7);
}

/** Asks for a dash, and nothing else. */
const DASH: Readonly<Steer> = { ...STILL, dash: true };

/** Holds fire, and nothing else. */
const FIRE: Readonly<Steer> = { ...STILL, fire: true };

/** Hears nothing, for a spec that doesn't listen. */
function deaf(): void {
  // Nothing to hear.
}

/** Breaks the rock beside a play's keeper, which its next frame hears. */
function breakBesideKeeper(play: WavePlay): void {
  const [, rock] = play.field.rocks;
  if (!rock) throw new Error("No rock beside the keeper.");
  rock.live = false;
  play.field.events.addBreak(rock, 1, 1, 0);
}

/**
 * Returns a wave's play over a field that stays in play and has no ship, a
 * rock of a size beside its keeper broken, which its first frame hears.
 */
function brokenPlay(size: "B" | "L"): WavePlay {
  const play = new WavePlay(fieldFrom([`L.${size}`]), 7);
  breakBesideKeeper(play);
  return play;
}

/**
 * Returns a wave's play under way, its ship flown a frame, then a boulder
 * beside its keeper broken, which its next frame hears.
 */
function brokenUnderWay(): WavePlay {
  const play = new WavePlay(fieldFrom(["L.B", "", "", "....^"]), 7);
  play.advance(STEP_MS, { ...STILL, thrust: 1 }, deaf, true);
  breakBesideKeeper(play);
  return play;
}

describe("WavePlay", () => {
  describe("frame", () => {
    it("hands the scene the field, its events and the run's seed, no constellation, the first sector's place and no sector's end unless given others", () => {
      const play = stillPlay();

      const { field, events, seed, constellation, place, endsSector } =
        play.frame();

      expect({ field, events, seed, constellation, place, endsSector }).toEqual(
        {
          field: play.field,
          events: play.field.events,
          seed: 7,
          constellation: null,
          place: PLACE_IDS[0],
          endsSector: false,
        },
      );
    });

    it("hands the scene where an Endless wave's constellation lies", () => {
      const play = new WavePlay(fieldFrom(KEEPER), 7, { x: 0.3, y: 0.6 });

      expect(play.frame().constellation).toEqual({ x: 0.3, y: 0.6 });
    });

    it("hands the scene the place the wave is played in", () => {
      const play = new WavePlay(fieldFrom(KEEPER), 7, null, "storm");

      expect(play.frame().place).toBe("storm");
    });

    it("hands the scene whether the wave is its sector's last", () => {
      const play = new WavePlay(fieldFrom(KEEPER), 7, null, "storm", true);

      expect(play.frame().endsSector).toBe(true);
    });

    it("hands the scene the same record each frame", () => {
      const play = stillPlay();
      const first = play.frame();
      play.advance(STEP_MS, STILL, deaf);

      expect(play.frame()).toBe(first);
    });
  });

  describe("advance", () => {
    it("steps the field as often as a frame's time holds a step", () => {
      const play = stillPlay();

      play.advance(3.6 * STEP_MS, STILL, deaf);

      expect(play.field.steps).toBe(3);
    });

    it("steps the field no more than its most a frame", () => {
      const play = stillPlay();

      play.advance((MAX_STEPS_PER_FRAME + 3) * STEP_MS, STILL, deaf);

      expect(play.field.steps).toBe(MAX_STEPS_PER_FRAME);
    });

    it("steps the field once for each of the tuning's steps a frame's time holds", () => {
      const play = stillPlay();

      play.advance(3 * STEP_S * 1000, STILL, deaf);

      expect(play.field.steps).toBe(3);
    });

    it("steers the field before it steps it", () => {
      const play = new WavePlay(fieldFrom(["L.......^"]), 7);
      const from = shipOf(play.field).y;
      const thrust: Steer = { ...STILL, thrust: 1 };

      play.advance(STEP_MS, thrust, deaf);

      expect(shipOf(play.field).y).toBeLessThan(from);
    });
  });

  describe("advance where motion is welcome", () => {
    it("holds the field still for a boulder's first beat, from the frame after its break", () => {
      const play = brokenPlay("B");
      play.advance(STEP_MS, STILL, deaf, true);

      play.advance(BOULDER_HOLD_MS, STILL, deaf, true);

      expect(play.field.steps).toBe(1);
    });

    it("moves the field on by what a frame holds past the hold", () => {
      const play = brokenPlay("B");
      play.advance(STEP_MS, STILL, deaf, true);

      play.advance(BOULDER_HOLD_MS + 2.5 * STEP_MS, STILL, deaf, true);

      expect(play.field.steps).toBe(3);
    });

    it("holds the field still across frames, the hold's time all told", () => {
      const play = brokenPlay("B");
      play.advance(STEP_MS, STILL, deaf, true);
      play.advance(BOULDER_HOLD_MS / 2, STILL, deaf, true);

      play.advance(BOULDER_HOLD_MS / 2 + 1.5 * STEP_MS, STILL, deaf, true);

      expect(play.field.steps).toBe(2);
    });

    it.each([Number.NaN, -STEP_MS])(
      "holds none of a frame of %d ms, the field stepping once the hold is over",
      (frameMs) => {
        const play = brokenPlay("B");
        play.advance(STEP_MS, STILL, deaf, true);
        play.advance(frameMs, STILL, deaf, true);

        play.advance(BOULDER_HOLD_MS + 1.5 * STEP_MS, STILL, deaf, true);

        expect(play.field.steps).toBe(2);
      },
    );

    it.each([
      ["fire", FIRE, "fired"],
      ["dash", DASH, "dashed"],
    ] as const)(
      "keeps a %s pressed and let go while the field holds still for its next step",
      (_, press, logged) => {
        const play = brokenUnderWay();
        play.advance(STEP_MS, STILL, deaf, true);
        play.advance(STEP_MS, press, deaf, true);

        play.advance(BOULDER_HOLD_MS + STEP_MS / 2, STILL, deaf, true);

        expect(kindsLoggedOn(play.field)).toContain(logged);
      },
    );

    it.each([
      ["fire", FIRE],
      ["dash", DASH],
    ] as const)("keeps no %s past the field's next step", (press, steer) => {
      const play = brokenUnderWay();
      play.advance(STEP_MS, STILL, deaf, true);
      play.advance(STEP_MS, steer, deaf, true);
      play.advance(BOULDER_HOLD_MS + STEP_MS / 2, STILL, deaf, true);

      play.advance(STEP_MS, STILL, deaf, true);

      expect(play.field.steer[press]).toBe(false);
    });

    it("holds the field still for no large rock's break", () => {
      const play = brokenPlay("L");
      play.advance(STEP_MS, STILL, deaf, true);

      play.advance(2.5 * STEP_MS, STILL, deaf, true);

      expect(play.field.steps).toBe(3);
    });

    it("hands on each event it hears, once", () => {
      const play = brokenPlay("B");
      const heard: string[] = [];
      const hear = ({ kind, size }: Readonly<FieldEvent>): void => {
        heard.push(`${kind} ${String(size)}`);
      };

      play.advance(STEP_MS, STILL, hear, true);
      play.advance(STEP_MS, STILL, hear, true);

      expect(heard).toEqual(["broken boulder"]);
    });
  });

  describe("advance where motion isn't welcome", () => {
    it("holds the field still for no boulder's break", () => {
      const play = brokenPlay("B");
      play.advance(STEP_MS, STILL, deaf);

      play.advance(2.5 * STEP_MS, STILL, deaf, false);

      expect(play.field.steps).toBe(3);
    });
  });
});
