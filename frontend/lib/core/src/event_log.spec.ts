import { EventLog, type EventLogView, type NumberedEvent } from "./event_log";

/** An event of the logs here: a word noted. */
interface Note extends NumberedEvent {
  word: string;
}

/** How many notes the logs here keep. */
const SIZE = 4;

/** Returns a record for a log's ring, before it is filled. */
function blankNote(): Note {
  return { serial: 0, word: "" };
}

/** Returns a log of {@link SIZE} notes. */
function newLog(): EventLog<Note> {
  return new EventLog(SIZE, blankNote);
}

/** Notes each word in a log, in order. */
function note(log: EventLog<Note>, ...words: string[]): void {
  for (const word of words) log.next().word = word;
}

/** Returns copies of the notes a log holds past a serial, oldest first. */
function notesSince(log: EventLog<Note>, serial: number): Note[] {
  const notes: Note[] = [];
  log.forEachSince(serial, (event) => notes.push({ ...event }));
  return notes;
}

describe("EventLog", () => {
  it.each([0, -1, 2.5, Number.NaN])("can't keep %f events", (size) => {
    expect(() => new EventLog(size, blankNote)).toThrow(RangeError);
  });

  it("holds no event before the first", () => {
    const log = newLog();

    expect({ latest: log.latest, notes: notesSince(log, 0) }).toEqual({
      latest: 0,
      notes: [],
    });
  });

  it("hands its writer a blank record for a new event, numbered", () => {
    const log = newLog();

    const event = log.next();

    expect({ ...event }).toEqual({ serial: 1, word: "" });
  });

  it("numbers each event one more than the last", () => {
    const log = newLog();

    note(log, "one", "two");

    expect({ latest: log.latest, notes: notesSince(log, 0) }).toEqual({
      latest: 2,
      notes: [
        { serial: 1, word: "one" },
        { serial: 2, word: "two" },
      ],
    });
  });

  it("visits only the events past a serial", () => {
    const log = newLog();
    note(log, "one", "two", "three");

    const serials = notesSince(log, 1).map((event) => event.serial);

    expect(serials).toEqual([2, 3]);
  });

  it("visits the events past a serial between two from the later of them", () => {
    const log = newLog();
    note(log, "one", "two", "three");

    const serials = notesSince(log, 1.5).map((event) => event.serial);

    expect(serials).toEqual([2, 3]);
  });

  it("visits no event from a serial before the first", () => {
    const log = newLog();

    expect(notesSince(log, -1)).toEqual([]);
  });

  it("keeps only the latest events once more were added than it holds", () => {
    const log = newLog();

    note(log, "one", "two", "three", "four", "five", "six");

    expect(notesSince(log, 0)).toEqual([
      { serial: 3, word: "three" },
      { serial: 4, word: "four" },
      { serial: 5, word: "five" },
      { serial: 6, word: "six" },
    ]);
  });

  it("makes every record with the log, and none as events are added", () => {
    let made = 0;
    const log = new EventLog(SIZE, () => {
      made++;
      return blankNote();
    });

    note(log, "one", "two", "three", "four", "five", "six");

    expect(made).toBe(SIZE);
  });

  it("fills the oldest event's record again once the ring has come round", () => {
    const log = newLog();
    const first = log.next();
    note(log, "two", "three", "four");

    const fifth = log.next();

    expect(fifth).toBe(first);
  });
});

describe("EventLogView", () => {
  it("is what a log's readers see of it", () => {
    expectTypeOf<EventLog<Note>>().toExtend<EventLogView<Note>>();
  });

  it("keeps its readers from adding an event", () => {
    expectTypeOf<EventLogView<Note>>().not.toHaveProperty("next");
  });
});
