import { eventsOf, flyPicture } from "../../testing/flights";
import { struckOf } from "../../testing/stand_ins";
import type { BrickTrait, TraitKind, TraitOf } from "../catalog/bricks";
import { MOST_CHARGE } from "../tuning";
import { TRAIT_RULES } from "./trait_rules";

describe("TRAIT_RULES", () => {
  it.each<{ trait: BrickTrait; level: number }>([
    { trait: { kind: "recharges" }, level: 14 },
    { trait: { kind: "frees" }, level: 15 },
    { trait: { kind: "kicks", radius: 0.38 }, level: 19 },
    { trait: { kind: "splits", cos: Math.sqrt(3) / 2, sin: 0.5 }, level: 20 },
    { trait: { kind: "teleports" }, level: 21 },
    { trait: { kind: "plated" }, level: 22 },
    { trait: { kind: "shelled" }, level: 28 },
    { trait: { kind: "regrows" }, level: 29 },
  ])(
    "throws for the $trait.kind trait, which isn't played until level $level",
    ({ trait, level }) => {
      const striking = () => {
        strikeWith(trait.kind, trait);
      };

      expect(striking).toThrow(
        `The "${trait.kind}" trait is not until level ${String(level)}.`,
      );
    },
  );
});

/** Runs a trait's rule for a strike on its brick, as `fly()` runs it. */
function strikeWith<K extends TraitKind>(kind: K, trait: TraitOf[K]): void {
  TRAIT_RULES[kind].struck?.(struckOf(), trait);
}

describe("the bricks' own rules, flown", () => {
  // A fuzzball straight up from the floor meets a brick in field row 3 at
  // 2.5.
  it("earths a charged fuzzball's charge on steel, which turns it", () => {
    const flown = flyPicture({ picture: ["....#...."], charge: 3 });

    expect([
      eventsOf(flown, "strike"),
      eventsOf(flown, "turn").map(({ at, off }) => [at, off]),
    ]).toEqual([
      [
        {
          at: 2.5,
          kind: "strike",
          ball: 0,
          cell: 4,
          took: 0,
          left: 0,
          charge: 0,
          earthed: true,
        },
      ],
      [[2.5, "face"]],
    ]);
  });

  // It bounces off the floor once, and strikes the steel again.
  it("leaves a hot shot its charge on steel, unearthed", () => {
    const flown = flyPicture({ picture: ["....#...."], hot: true });

    expect(
      eventsOf(flown, "strike").map(({ charge, earthed }) => [charge, earthed]),
    ).toEqual([
      [MOST_CHARGE, false],
      [MOST_CHARGE, false],
    ]);
  });

  // Aimed at 45° into the pocket under one tough brick and left of another
  // a row lower, it meets both faces at once.
  it("spends the charge on the bricks met at once from the floor up", () => {
    const picture = ["....2....", ".....2..."];

    const flown = flyPicture({
      picture,
      lowestRow: 2,
      x: 2.25,
      degrees: 45,
      charge: 2,
    });

    expect([
      eventsOf(flown, "strike").map(({ cell, took, left }) => [
        cell,
        took,
        left,
      ]),
      eventsOf(flown, "turn").map(({ dx, dy, off }) => [
        Math.sign(dx),
        Math.sign(dy),
        off,
      ]),
    ]).toEqual([
      [
        [5, 2, 0],
        [13, 1, 1],
      ],
      [[1, -1, "face"]],
    ]);
  });
});
