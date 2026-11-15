import { STILL, type Steer } from "../rules/ship/ship";
import { STEP_MS } from "../rules/stepper";
import { MAX_STEPS_PER_FRAME, STEP_S } from "../rules/tuning";
import { KEEPER, fieldFrom, shipOf } from "../testing/field_picture";
import { PLACE_IDS } from "./places/places";
import { WavePlay } from "./wave_play";

/** Returns a wave's play over a field that stays in play while nothing moves, its rock standing still and no ship. */
function stillPlay(): WavePlay {
  return new WavePlay(fieldFrom(KEEPER), 7);
}

/** Hears nothing, for a spec that doesn't listen. */
function deaf(): void {
  // Nothing to hear.
}

describe("WavePlay", () => {
  describe("frame", () => {
    it("hands the scene the field, its events and the run's seed, no constellation and the first sector's place unless given others", () => {
      const play = stillPlay();

      const { field, events, seed, constellation, place } = play.frame();

      expect({ field, events, seed, constellation, place }).toEqual({
        field: play.field,
        events: play.field.events,
        seed: 7,
        constellation: null,
        place: PLACE_IDS[0],
      });
    });

    it("hands the scene where an Endless wave's constellation lies", () => {
      const play = new WavePlay(fieldFrom(KEEPER), 7, { x: 0.3, y: 0.6 });

      expect(play.frame().constellation).toEqual({ x: 0.3, y: 0.6 });
    });

    it("hands the scene the place the wave is played in", () => {
      const play = new WavePlay(fieldFrom(KEEPER), 7, null, "storm");

      expect(play.frame().place).toBe("storm");
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
});
