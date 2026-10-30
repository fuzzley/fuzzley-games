import type { FieldEventKind } from "../rules/events";
import type { Steer } from "../rules/paddle";
import { STEP_MS } from "../rules/stepper";
import {
  KEEPER,
  NO_STEER,
  fieldFrom,
  playWithoutBall,
} from "../testing/field_picture";
import { LevelPlay } from "./level_play";
import { SERVE_MS } from "./timing";

/** Returns a level's play over a field that stays in play while nothing moves. */
function stillPlay(): LevelPlay {
  return new LevelPlay(playWithoutBall(fieldFrom(KEEPER)));
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
  describe("advance", () => {
    it("steps the field as often as a frame's time holds a step", () => {
      const play = stillPlay();

      play.advance(3.6 * STEP_MS, NO_STEER, deaf);

      expect(play.field.steps).toBe(3);
    });

    it("draws between steps as far as the time left over goes", () => {
      const play = stillPlay();

      play.advance(3.6 * STEP_MS, NO_STEER, deaf);

      expect(play.frame().alpha).toBeCloseTo(0.6);
    });

    it("carries the time a frame leaves over into the next", () => {
      const play = stillPlay();
      play.advance(3.6 * STEP_MS, NO_STEER, deaf);

      play.advance(0.5 * STEP_MS, NO_STEER, deaf);

      expect(play.field.steps).toBe(4);
    });

    it("steers the field before it steps it", () => {
      const play = stillPlay();
      const from = play.field.paddle.x;
      const toward: Steer = { to: from - 5, by: 0, push: 0 };

      play.advance(STEP_MS, toward, deaf);

      expect(play.field.paddle.x).toBeLessThan(from);
    });

    it("hands on each event once", () => {
      const play = stillPlay();
      const heard: FieldEventKind[] = [];
      play.field.events.add("paddle", 0, 0);
      play.advance(0, NO_STEER, (event) => heard.push(event.kind));

      play.advance(0, NO_STEER, (event) => heard.push(event.kind));

      expect(heard).toEqual(["paddle"]);
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

  describe("countCardWait", () => {
    it("says nothing is due before the level is cleared or the run ends", () => {
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
