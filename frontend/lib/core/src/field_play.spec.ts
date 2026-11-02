import { createClock } from "./clock";
import { EventLog, type NumberedEvent } from "./event_log";
import { FieldPlay, type FieldRules, type PlayFrame } from "./field_play";

/** How long a step of the specs' clock takes. */
const STEP_MS = 10;

/** Describes what the specs' field logs: the step that made each event. */
interface StepEvent extends NumberedEvent {
  step: number;
}

/** Describes the specs' field: its steps, the steering each took, and a log of one event a step. */
interface CountedField {
  readonly events: EventLog<StepEvent>;
  steps: number;
  /** The steering each step took, in turn. */
  readonly steered: number[];
  /** The steering the steps until the next frame follow. */
  steer: number;
}

/** Describes the frame the specs' scene is handed. */
interface CountedFrame extends PlayFrame {
  readonly field: CountedField;
}

/** Steers the specs' field and steps it, an event a step. */
const RULES: FieldRules<CountedField, number> = {
  steer: (field, steer) => {
    field.steer = steer;
  },
  step: (field) => {
    field.steps++;
    field.steered.push(field.steer);
    field.events.next().step = field.steps;
  },
};

/** Returns a new field, at no step, its log empty. */
function newField(): CountedField {
  return {
    events: new EventLog(64, () => ({ serial: 0, step: 0 })),
    steps: 0,
    steered: [],
    steer: 0,
  };
}

/** Returns a play of a field, a new one unless given, its clock's steps 10 ms long, at most 5 a frame. */
function newPlay(
  field = newField(),
): FieldPlay<CountedField, number, StepEvent, CountedFrame> {
  return new FieldPlay(field, RULES, createClock(STEP_MS, 5), {
    field,
    alpha: 0,
  });
}

/** Hears nothing, for a spec that doesn't listen. */
function deaf(): void {
  // Nothing to hear.
}

describe("FieldPlay", () => {
  describe("advance", () => {
    it("steps the field as often as a frame's time holds a step", () => {
      const play = newPlay();

      play.advance(3.6 * STEP_MS, 0, deaf);

      expect(play.field.steps).toBe(3);
    });

    it("steps the field no more than the clock's most a frame", () => {
      const play = newPlay();

      play.advance(60 * STEP_MS, 0, deaf);

      expect(play.field.steps).toBe(5);
    });

    it("draws between steps as far as the time left over goes", () => {
      const play = newPlay();

      play.advance(2.25 * STEP_MS, 0, deaf);

      expect(play.frame().alpha).toBeCloseTo(0.25);
    });

    it("carries the time a frame leaves over into the next", () => {
      const play = newPlay();
      play.advance(0.6 * STEP_MS, 0, deaf);

      play.advance(0.6 * STEP_MS, 0, deaf);

      expect(play.field.steps).toBe(1);
    });

    it("steers the field before it steps it", () => {
      const play = newPlay();

      play.advance(2 * STEP_MS, 7, deaf);

      expect(play.field.steered).toEqual([7, 7]);
    });

    it("hands on each event once, however many steps a frame took", () => {
      const play = newPlay();
      const heard: number[] = [];
      const hear = (event: Readonly<StepEvent>): void => {
        heard.push(event.step);
      };
      play.advance(2 * STEP_MS, 0, hear);

      play.advance(3 * STEP_MS, 0, hear);

      expect(heard).toEqual([1, 2, 3, 4, 5]);
    });

    it("hands on the events the field logged before its play began, once", () => {
      const field = newField();
      field.events.next().step = 0;
      const play = newPlay(field);
      const heard: number[] = [];

      play.advance(STEP_MS, 0, (event) => heard.push(event.step));

      expect(heard).toEqual([0, 1]);
    });
  });

  describe("frame", () => {
    it("hands the scene the same record each frame, written again as the field moves on", () => {
      const play = newPlay();
      const first = play.frame();

      play.advance(1.5 * STEP_MS, 0, deaf);

      expect(play.frame()).toBe(first);
      expect(first.alpha).toBeCloseTo(0.5);
    });
  });

  describe("countCardWait", () => {
    it("says nothing is due before the field's play has come to an end", () => {
      const play = newPlay();

      expect(play.countCardWait(1000, 0)).toBe(false);
    });

    it("waits out the card's wait", () => {
      const play = newPlay();
      play.startCardWait();

      expect(play.countCardWait(100, 300)).toBe(false);
    });

    it("says the card is due once its wait has run, and once only", () => {
      const play = newPlay();
      play.startCardWait();
      play.countCardWait(200, 300);

      const due = [play.countCardWait(100, 300), play.countCardWait(100, 300)];

      expect(due).toEqual([true, false]);
    });

    it("waits the whole wait again once it is started again", () => {
      const play = newPlay();
      play.startCardWait();
      play.countCardWait(200, 300);

      play.startCardWait();

      expect(play.countCardWait(200, 300)).toBe(false);
    });
  });
});
