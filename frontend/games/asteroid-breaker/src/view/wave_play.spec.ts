import type { FieldEventKind } from "../rules/events";
import { STILL, type Steer } from "../rules/ship";
import { STEP_MS } from "../rules/stepper";
import { KEEPER, fieldFrom, shipOf } from "../testing/field_picture";
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
    it("hands the scene the field, its events and the run's seed", () => {
      const play = stillPlay();

      const { field, events, seed } = play.frame();

      expect({ field, events, seed }).toEqual({
        field: play.field,
        events: play.field.events,
        seed: 7,
      });
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

    it("draws between steps as far as the time left over goes", () => {
      const play = stillPlay();

      play.advance(3.6 * STEP_MS, STILL, deaf);

      expect(play.frame().alpha).toBeCloseTo(0.6);
    });

    it("carries the time a frame leaves over into the next", () => {
      const play = stillPlay();
      play.advance(3.6 * STEP_MS, STILL, deaf);

      play.advance(0.5 * STEP_MS, STILL, deaf);

      expect(play.field.steps).toBe(4);
    });

    it("steers the field before it steps it", () => {
      const play = new WavePlay(fieldFrom(["L.......^"]), 7);
      const from = shipOf(play.field).y;
      const thrust: Steer = { ...STILL, thrust: 1 };

      play.advance(STEP_MS, thrust, deaf);

      expect(shipOf(play.field).y).toBeLessThan(from);
    });

    it("hands on each event once", () => {
      const play = stillPlay();
      const heard: FieldEventKind[] = [];
      play.field.events.add("fired", 0, 0);
      play.advance(0, STILL, (event) => heard.push(event.kind));

      play.advance(0, STILL, (event) => heard.push(event.kind));

      expect(heard).toEqual(["fired"]);
    });
  });

  describe("countCardWait", () => {
    it("says nothing is due before the wave is cleared or the run ends", () => {
      const play = stillPlay();

      expect(play.countCardWait(1000, 0)).toBe(false);
    });

    it("waits out the card's wait", () => {
      const play = stillPlay();
      play.startCardWait();

      expect(play.countCardWait(100, 300)).toBe(false);
    });

    it("says the card is due once its wait has run, and once only", () => {
      const play = stillPlay();
      play.startCardWait();
      play.countCardWait(200, 300);

      const due = [play.countCardWait(100, 300), play.countCardWait(100, 300)];

      expect(due).toEqual([true, false]);
    });
  });
});
