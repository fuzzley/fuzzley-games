import { type Playing, Turns } from "./turns";

/** Describes a record of the specs' flourish, which tells each apart. */
interface Spot extends Playing {
  readonly id: number;
}

/** Returns a flourish of so many records, numbered from 0 as they are made. */
function turnsOf(count: number): Turns<Spot> {
  let made = 0;
  return new Turns(count, () => ({ id: made++, at: -Infinity, x: 0, y: 0 }));
}

/** Returns the ids of the records a flourish plays, played so many times. */
function idsPlayed(turns: Turns<Spot>, times: number): number[] {
  return Array.from({ length: times }, (_, i) => turns.play(i, i, i).id);
}

describe("Turns", () => {
  it("makes so many records, none of them playing", () => {
    const turns = turnsOf(3);

    expect(turns.all).toEqual([
      { id: 0, at: -Infinity, x: 0, y: 0 },
      { id: 1, at: -Infinity, x: 0, y: 0 },
      { id: 2, at: -Infinity, x: 0, y: 0 },
    ]);
  });

  it("starts a record playing from a place, at a time", () => {
    const turns = turnsOf(3);

    const played = turns.play(4, 5, 100);

    expect(played).toEqual({ id: 0, at: 100, x: 4, y: 5 });
  });

  it("takes the oldest for the newest once every one is playing", () => {
    const turns = turnsOf(3);

    const ids = idsPlayed(turns, 5);

    expect(ids).toEqual([0, 1, 2, 0, 1]);
  });

  it("plays its own record, which the caller writes the rest of", () => {
    const turns = turnsOf(2);

    const played = turns.play(1, 2, 3);

    expect(played).toBe(turns.all[0]);
  });

  it("throws as a flourish of no records plays", () => {
    const turns = turnsOf(0);

    expect(() => turns.play(0, 0, 0)).toThrow(RangeError);
  });
});
