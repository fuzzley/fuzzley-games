import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { levelStart } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { MOST_CHARGE } from "../rules/tuning";
import {
  canonicalText,
  drawnShots,
  hashOf,
  lineRounds,
  openingRounds,
  roundsHash,
} from "./golden_flights";
import { levelFrom } from "./level_picture";

/** A level of nine bricks of three hits, which no one shot clears. */
const THREES = levelFrom(["333333333"]);

/** A shot straight up, uncharged, as a certificate keeps it. */
const UP = [328, 0] as const;

describe("canonicalText", () => {
  it("sorts each record's keys, at every depth", () => {
    expect(canonicalText({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
      '{"a":{"c":[3,{"e":5,"f":4}],"d":2},"b":1}',
    );
  });

  it("leaves out a key that holds undefined, as one never written", () => {
    expect(canonicalText({ a: undefined, b: 1 })).toBe(canonicalText({ b: 1 }));
  });

  it("writes strings quoted, and every other value as the standard writes it", () => {
    expect(canonicalText(["x", 0.1, 1e21, null, true, Infinity])).toBe(
      '["x",0.1,1e+21,null,true,Infinity]',
    );
  });
});

describe("hashOf", () => {
  it.each([
    ["", "811c9dc5"],
    ["a", "e40c292c"],
    ["foobar", "bf9cf968"],
    ["akd", "0d368b73"],
  ])("hashes %j as 32-bit FNV-1a does, to %s", (text, hash) => {
    expect(hashOf([text])).toBe(hash);
  });

  it("hashes texts one after another, as one text", () => {
    expect(hashOf(["foo", "bar"])).toBe(hashOf(["foobar"]));
  });
});

describe("roundsHash", () => {
  const rounds = lineRounds(THREES, 11, [UP, UP]);

  it("hashes rounds alike whatever order their records' keys were written in", () => {
    const reordered = rounds.map(({ next, outcome, flight }) => ({
      next,
      outcome,
      flight,
    }));

    expect(roundsHash(reordered)).toBe(roundsHash(rounds));
  });

  it.each([
    ["a flight", { flight: { ...rounds[0]!.flight, capped: 1 } }],
    ["an outcome", { outcome: { ...rounds[0]!.outcome, points: 1 } }],
    ["a next start", { next: { ...rounds[0]!.next, x: 1 } }],
  ])("tells a round with another %s apart", (_, changed) => {
    const other = [{ ...rounds[0]!, ...changed }, rounds[1]!];

    expect(roundsHash(other)).not.toBe(roundsHash(rounds));
  });

  it("tells rounds played in another order apart", () => {
    expect(roundsHash([rounds[1]!, rounds[0]!])).not.toBe(roundsHash(rounds));
  });
});

describe("lineRounds", () => {
  it("plays each shot from where the last left the next round", () => {
    const [first, second] = lineRounds(THREES, 11, [UP, [100, 2]]);

    expect(second).toEqual(
      playRound(first!.next, { aim: 100, charge: 2 }, THREES.boon),
    );
  });

  it("plays the first shot from the level's start", () => {
    const [first] = lineRounds(THREES, 13, [UP]);

    expect(first).toEqual(
      playRound(levelStart(THREES, 13), { aim: 328, charge: 0 }, THREES.boon),
    );
  });

  it("stops once the level ends", () => {
    const one = levelFrom(["....o...."]);

    const rounds = lineRounds(one, 11, [UP, UP, UP]);

    expect(rounds.map(({ outcome }) => outcome.result)).toEqual(["cleared"]);
  });
});

describe("drawnShots", () => {
  it("draws 50 shots, each an aim and a charge", () => {
    const shots = drawnShots(1, 11);

    expect({
      count: shots.length,
      aims: shots.every(({ aim }) => aim >= 0 && aim < AIM_COUNT),
      charges: shots.every(
        ({ charge }) => charge >= 0 && charge <= MOST_CHARGE,
      ),
    }).toEqual({ count: 50, aims: true, charges: true });
  });

  it("draws the same shots every run, those its seed gives", () => {
    // golden.json's hashes hang on these: they never change.
    const firsts = [drawnShots(1, 11), drawnShots(2, 13)].map((shots) =>
      shots.slice(0, 2),
    );

    expect(firsts).toEqual([
      [
        { aim: 650, charge: 3 },
        { aim: 527, charge: 5 },
      ],
      [
        { aim: 171, charge: 0 },
        { aim: 490, charge: 2 },
      ],
    ]);
  });

  it("draws other shots for another level or another depth", () => {
    expect([drawnShots(1, 12), drawnShots(2, 11)]).not.toContainEqual(
      drawnShots(1, 11),
    );
  });

  it("draws shots of every charge", () => {
    const charges = new Set(drawnShots(1, 11).map(({ charge }) => charge));

    expect(charges.size).toBe(MOST_CHARGE + 1);
  });
});

describe("openingRounds", () => {
  it("plays each shot from the level's opening on its own", () => {
    const shots = [
      { aim: 328, charge: 0 },
      { aim: 100, charge: 2 },
    ] as const;

    const rounds = openingRounds(THREES, 12, shots);

    expect(rounds).toEqual(
      shots.map((shot) => playRound(levelStart(THREES, 12), shot, THREES.boon)),
    );
  });
});
