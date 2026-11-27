import { type Playing, Turns } from "@fz/core/turns";
import { grownTurns } from "./painter";

/** Returns turns of records named in order, none playing yet. */
function turnsNamed(
  ...names: readonly string[]
): Turns<Playing & { readonly name: string }> {
  const records = names.map((name) => ({
    at: Number.NEGATIVE_INFINITY,
    x: 0,
    y: 0,
    name,
  }));
  let next = 0;
  return new Turns(records.length, () => {
    const record = records[next++];
    if (record === undefined) throw new Error("No record left to make.");
    return record;
  });
}

/** Returns the names of the records turns play next, so many of them, each at a time after the last. */
function playedNext(
  turns: Turns<Playing & { readonly name: string }>,
  count: number,
): string[] {
  return Array.from(
    { length: count },
    (_, index) => turns.play(0, 0, 100 + index).name,
  );
}

/** Returns a record that plays nowhere, named "new". */
function newRecord(): Playing & { readonly name: string } {
  return { at: Number.NEGATIVE_INFINITY, x: 0, y: 0, name: "new" };
}

describe("grownTurns", () => {
  it("plays the new records first, then those held, the one that started playing longest ago first", () => {
    const held = turnsNamed("a", "b", "c");
    held.play(0, 0, 10);
    held.play(0, 0, 20);

    const grown = grownTurns(held, 5, newRecord);

    expect(playedNext(grown, 5)).toEqual(["new", "new", "c", "a", "b"]);
  });

  it("keeps the records held, playing as they played", () => {
    const held = turnsNamed("a", "b");
    const playing = held.play(1, 1, 10);

    const grown = grownTurns(held, 4, newRecord);

    expect(grown.all).toContain(playing);
  });

  it.each([2, 1])(
    "leaves turns that hold as many as a count of %d as they were",
    (count) => {
      const held = turnsNamed("a", "b");

      expect(grownTurns(held, count, newRecord)).toBe(held);
    },
  );
});
