import type { Field } from "../../rules/field/field";
import { stepsIn } from "../../rules/stepper";
import { KEEPER, fieldFrom } from "../../testing/field_picture";
import type { SoundName } from "./sounds";
import { DASHES_A_CALL, PATIENCE_MS, Voice } from "./voice";

/** Describes a call the voice made, and where. */
interface Called {
  readonly call: SoundName;
  readonly across: number;
}

/** Logs events on a field, for a frame to hear. */
type Logger = (field: Field) => void;

/**
 * Hears a frame: the field shown, its clock moved on a time in
 * milliseconds, and what a logger logs on it, then returns what the voice
 * said.
 */
type Frame = (log?: Logger, afterMs?: number) => Called[];

/** How long a frame of the spec's takes, in milliseconds, but where it says. */
const FRAME_MS = 16;

/**
 * Returns a voice's frames over the field a spec shows, each event heard
 * at its place across a field 100 units wide, and the first frame heard.
 */
function listenTo(shown: () => Field): Frame {
  const voice = new Voice();
  const frame: Frame = (log, afterMs = FRAME_MS) => {
    const field = shown();
    field.steps += stepsIn(afterMs);
    voice.hearField(field);
    const since = field.events.latest;
    log?.(field);
    field.events.forEachSince(since, (event) => {
      voice.hear(event, event.x / 50 - 1);
    });
    const called: Called[] = [];
    voice.speak((call, across) => {
      called.push({ call, across });
    });
    return called;
  };
  frame();
  return frame;
}

/** Returns a voice's frames over a field of its own. */
function listen(): Frame {
  const field = fieldFrom(KEEPER);
  return listenTo(() => field);
}

/** Returns the calls alone of what a voice said. */
function callsOf(called: readonly Called[]): SoundName[] {
  return called.map(({ call }) => call);
}

/** Logs a dash in the field's middle. */
function dash(field: Field): void {
  field.events.addDash(50, 20, 0);
}

/** Returns a logger of a stray drifting in, at a place across the field. */
function stray(x = 0): Logger {
  return (field) => {
    field.events.addPilot("strayed", x, 20, 4, field.crew);
  };
}

/** Returns a logger of the wave cleared, at a place across the field. */
function cleared(x = 50): Logger {
  return (field) => {
    field.events.add("cleared", x, 20);
  };
}

/** Each event the fuzzball calls at, how to log it, and its call. */
const CALLS: readonly (readonly [string, Logger, SoundName])[] = [
  ["dashed", dash, "voice-whee"],
  ["cleared", cleared(), "voice-cheer"],
  [
    "knocked",
    (field) => {
      field.events.addKnocked(50, 20, 1, field.crew, 1, 0);
    },
    "voice-ouch",
  ],
  [
    "recaught",
    (field) => {
      field.events.addPilot("recaught", 50, 20, 1, field.crew);
    },
    "voice-yay",
  ],
  [
    "joined",
    (field) => {
      field.events.addPilot("joined", 50, 20, 4, field.crew);
    },
    "voice-yay",
  ],
  [
    "home",
    (field) => {
      field.events.addPilot("home", 50, 20, 4, field.crew);
    },
    "voice-yay",
  ],
  ["strayed", stray(50), "voice-ooh"],
  [
    "grazed",
    (field) => {
      field.events.addGraze(50, 20, 1, 0);
    },
    "voice-eep",
  ],
  [
    "floated",
    (field) => {
      field.events.addPilot("floated", 50, 20, 1, field.crew);
    },
    "voice-aww",
  ],
  [
    "lost",
    (field) => {
      field.events.addPilot("lost", 50, 20, 0, field.crew);
    },
    "voice-aww",
  ],
];

/**
 * Each call and the next commoner one, as the plan ranks them: a wave
 * cleared, the run's end and those floating home, a knock, a rescue, a
 * stray's arrival, a near miss and a dash.
 */
const RANKED_PAIRS: readonly (readonly [SoundName, SoundName])[] = [
  ["voice-cheer", "voice-aww"],
  ["voice-aww", "voice-ouch"],
  ["voice-ouch", "voice-yay"],
  ["voice-yay", "voice-ooh"],
  ["voice-ooh", "voice-eep"],
  ["voice-eep", "voice-whee"],
];

/** Returns how to log an event the fuzzball makes a call at. */
function loggerOf(call: SoundName): Logger {
  const found = CALLS.find(([, , each]) => each === call);
  if (found === undefined) throw new Error(`No event calls ${call}.`);
  return found[1];
}

describe("Voice", () => {
  describe("its calls", () => {
    it.each(CALLS)("calls at %s with its call", (_, log, call) => {
      const frame = listen();

      expect(callsOf(frame(log))).toEqual([call]);
    });

    it("calls where the event it calls at happened", () => {
      const frame = listen();

      expect(frame(stray(75))).toEqual([{ call: "voice-ooh", across: 0.5 }]);
    });

    it("calls at nothing else the field logs", () => {
      const frame = listen();

      const called = frame((field) => {
        field.events.addFired(50, 20, "gun");
        field.events.add("warned", 0, 20);
        field.events.addPickup("caught", 50, 20, "spread");
        field.events.addSpark(50, 20, 0, 10, 1);
        field.events.addStep(50, 20, 1, false);
        field.events.addZap(50, 20, 0);
        field.events.addArc(
          { x: 60, y: 20, kind: "stone", size: "small", slot: 0 },
          10,
          0,
        );
      });

      expect(called).toEqual([]);
    });

    it("calls nothing in a frame that called for nothing", () => {
      const frame = listen();

      expect(frame()).toEqual([]);
    });
  });

  describe("its dashes", () => {
    it(`calls at the first dash, then at one in ${String(DASHES_A_CALL)}`, () => {
      const frame = listen();

      const called = Array.from(
        { length: 7 },
        () => callsOf(frame(dash, PATIENCE_MS)).length,
      );

      expect(called).toEqual([1, 0, 0, 1, 0, 0, 1]);
    });

    it("counts the dashes over every field it hears", () => {
      let shown = fieldFrom(KEEPER);
      const frame = listenTo(() => shown);
      frame(dash);
      shown = fieldFrom(KEEPER);

      const called = Array.from({ length: 3 }, () =>
        callsOf(frame(dash, PATIENCE_MS)),
      );

      expect(called).toEqual([[], [], ["voice-whee"]]);
    });

    it("passes a dash's turn whose call its patience drops", () => {
      const frame = listen();
      frame(stray());

      const called = Array.from({ length: 4 }, () =>
        callsOf(frame(dash, PATIENCE_MS / 2)),
      );

      expect(called).toEqual([[], [], [], ["voice-whee"]]);
    });

    it("leaves a frame's other call to be made where a dash's turn hasn't come", () => {
      const frame = listen();
      frame(dash);

      const called = frame((field) => {
        dash(field);
        stray()(field);
      }, PATIENCE_MS);

      expect(callsOf(called)).toEqual(["voice-ooh"]);
    });
  });

  describe("its patience", () => {
    it(`calls no more than once in ${String(PATIENCE_MS)} ms of the field's steps`, () => {
      const frame = listen();
      frame(stray());

      expect(frame(stray(), PATIENCE_MS - 10)).toEqual([]);
    });

    it("calls again once its patience has run", () => {
      const frame = listen();
      frame(stray());

      expect(callsOf(frame(stray(), PATIENCE_MS))).toEqual(["voice-ooh"]);
    });

    it("keeps it by the field's steps, however many frames pass", () => {
      const frame = listen();
      frame(stray());
      for (let frames = 0; frames < 300; frames++) frame(undefined, 0);

      expect(frame(stray(), FRAME_MS)).toEqual([]);
    });

    it("drops a call due while it keeps its patience, rather than put it off", () => {
      const frame = listen();
      frame(stray());
      frame(cleared(), 1000);

      expect(frame(undefined, PATIENCE_MS)).toEqual([]);
    });

    it("starts it afresh with a new field", () => {
      let shown = fieldFrom(KEEPER);
      const frame = listenTo(() => shown);
      frame(stray());
      shown = fieldFrom(KEEPER);

      expect(callsOf(frame(stray()))).toEqual(["voice-ooh"]);
    });
  });

  describe("a frame of many calls", () => {
    it.each(RANKED_PAIRS)(
      "makes %s over %s, heard after it",
      (rarer, commoner) => {
        const frame = listen();

        const called = frame((field) => {
          loggerOf(commoner)(field);
          loggerOf(rarer)(field);
        });

        expect(callsOf(called)).toEqual([rarer]);
      },
    );

    it("makes its rarest call, once, where its event happened", () => {
      const frame = listen();

      const called = frame((field) => {
        dash(field);
        stray(0)(field);
        cleared(75)(field);
        stray(25)(field);
      });

      expect(called).toEqual([{ call: "voice-cheer", across: 0.5 }]);
    });

    it("makes the first of its rarest calls where two are alike", () => {
      const frame = listen();

      const called = frame((field) => {
        stray(25)(field);
        stray(75)(field);
      });

      expect(called).toEqual([{ call: "voice-ooh", across: -0.5 }]);
    });

    it("forgets the calls of a frame it kept its patience in", () => {
      const frame = listen();
      frame(stray());
      frame(cleared(), 1000);

      expect(callsOf(frame(stray(), PATIENCE_MS))).toEqual(["voice-ooh"]);
    });
  });
});
