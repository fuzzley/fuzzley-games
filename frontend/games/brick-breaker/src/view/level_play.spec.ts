import { createServeGuide, serveGuide } from "../rules/field/guide";
import type { Steer } from "../rules/paddle/paddle";
import { STEP_MS } from "../rules/stepper";
import { MAX_STEPS_PER_FRAME, STEP_S } from "../rules/tuning";
import {
  KEEPER,
  NO_STEER,
  fieldFrom,
  playWithoutBall,
} from "../testing/field_picture";
import { SERVE_MS } from "./effects/timing";
import { LevelPlay } from "./level_play";
import type { PlayerSteer } from "./steering/steering";

/** Steering that holds the serve's aim at an angle, with the guide shown. */
function aimedAt(aim: number): PlayerSteer {
  return { ...NO_STEER, aim, showsGuide: true };
}

/** Returns a level's play over a field that stays in play while nothing moves. */
function stillPlay(): LevelPlay {
  return new LevelPlay(playWithoutBall(fieldFrom(KEEPER)));
}

/** Returns a level's play whose ball waits to be served, under a brick. */
function servingPlay(): LevelPlay {
  return new LevelPlay(fieldFrom(KEEPER));
}

/** Returns a level's play whose last ball was just lost. */
function lostPlay(): LevelPlay {
  const play = stillPlay();
  play.field.state = "lost";
  return play;
}

/** Hears nothing, for a spec that doesn't listen. */
function deaf(): void {
  // Nothing to hear.
}

describe("LevelPlay", () => {
  describe("frame", () => {
    it("hands the scene the field and its events", () => {
      const play = stillPlay();

      const { field, events } = play.frame();

      expect({ field, events }).toEqual({
        field: play.field,
        events: play.field.events,
      });
    });
  });

  describe("advance", () => {
    it("steps the field as often as a frame's time holds a step", () => {
      const play = stillPlay();

      play.advance(3.6 * STEP_MS, NO_STEER, deaf);

      expect(play.field.steps).toBe(3);
    });

    it("steps the field no more than its most a frame", () => {
      const play = stillPlay();

      play.advance((MAX_STEPS_PER_FRAME + 3) * STEP_MS, NO_STEER, deaf);

      expect(play.field.steps).toBe(MAX_STEPS_PER_FRAME);
    });

    it("steps the field once for each of the tuning's steps a frame's time holds", () => {
      const play = stillPlay();

      play.advance(3 * STEP_S * 1000, NO_STEER, deaf);

      expect(play.field.steps).toBe(3);
    });

    it("steers the field before it steps it", () => {
      const play = stillPlay();
      const from = play.field.paddle.x;
      const toward: Steer = { to: from - 5, by: 0, push: 0, aim: null };

      play.advance(STEP_MS, toward, deaf);

      expect(play.field.paddle.x).toBeLessThan(from);
    });
  });

  describe("the serve's guide", () => {
    it("is none while the steering doesn't say it shows", () => {
      const play = servingPlay();

      play.advance(STEP_MS, NO_STEER, deaf);

      expect(play.frame().guide).toBeNull();
    });

    it("is none while the steering leaves out whether it shows", () => {
      const play = servingPlay();

      play.advance(STEP_MS, { ...NO_STEER, aim: -30 }, deaf);

      expect(play.frame().guide).toBeNull();
    });

    it("is the rules' guide along the aim held, from the field as it stands, while the steering says it shows", () => {
      const play = servingPlay();
      const expected = createServeGuide();

      play.advance(STEP_MS, aimedAt(-30), deaf);
      serveGuide(play.field, expected);

      expect({
        guide: play.frame().guide,
        empty: expected.dots.count === 0,
      }).toEqual({ guide: expected, empty: false });
    });

    it("is written into one record each frame", () => {
      const play = servingPlay();
      play.advance(STEP_MS, aimedAt(-30), deaf);
      const first = play.frame().guide;

      play.advance(STEP_MS, aimedAt(30), deaf);

      expect({
        same: play.frame().guide === first,
        shown: first !== null,
      }).toEqual({ same: true, shown: true });
    });

    it("is none once the field no longer serves, though the steering says it shows", () => {
      const play = stillPlay();

      play.advance(STEP_MS, aimedAt(0), deaf);

      expect(play.frame().guide).toBeNull();
    });

    it("is none again once the steering stops showing it", () => {
      const play = servingPlay();
      play.advance(STEP_MS, aimedAt(0), deaf);

      play.advance(STEP_MS, NO_STEER, deaf);

      expect(play.frame().guide).toBeNull();
    });
  });

  describe("serveAfterLoss", () => {
    it("waits out a lost ball's beat", () => {
      const play = lostPlay();

      play.serveAfterLoss(SERVE_MS / 2);

      expect(play.field.state).toBe("lost");
    });

    it("serves once the beat has run", () => {
      const play = lostPlay();
      play.serveAfterLoss(SERVE_MS / 2);

      play.serveAfterLoss(SERVE_MS / 2);

      expect(play.field.state).toBe("serve");
    });

    it("counts the beat only from the loss", () => {
      const play = stillPlay();
      play.serveAfterLoss(SERVE_MS / 2);
      play.field.state = "lost";

      play.serveAfterLoss(SERVE_MS / 2);

      expect(play.field.state).toBe("lost");
    });

    it("waits a whole beat again after the next loss", () => {
      const play = lostPlay();
      play.serveAfterLoss(SERVE_MS);
      play.field.state = "lost";

      play.serveAfterLoss(SERVE_MS / 2);

      expect(play.field.state).toBe("lost");
    });
  });
});
