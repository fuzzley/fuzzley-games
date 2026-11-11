import { eventsOf, flyPicture } from "../../testing/flights";
import { struckOf } from "../../testing/stand_ins";
import { wallFrom } from "../../testing/wall_picture";
import {
  BRICK_KINDS,
  type BrickKinds,
  type BrickTrait,
  type TraitKind,
  type TraitOf,
} from "../catalog/bricks";
import { fly } from "../flight/flight";
import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES, MOST_CHARGE } from "../tuning";
import { TRAIT_RULES } from "./trait_rules";

/** Returns the catalog with its tough brick standing in for a kind of a trait, so a picture's `2` is one of 2 hits. */
function toughWith(trait: BrickTrait): BrickKinds {
  return {
    ...BRICK_KINDS,
    tough: { ...BRICK_KINDS.tough, traits: [trait] },
  };
}

/** The catalog with a shell of 2 hits standing in for the tough brick of 2. */
const SHELLS = toughWith({ kind: "shelled" });

/** The catalog with moss of 2 hits standing in for the tough brick of 2. */
const MOSS = toughWith({ kind: "regrows" });

describe("TRAIT_RULES", () => {
  it.each<{ trait: BrickTrait; level: number }>([
    { trait: { kind: "recharges" }, level: 14 },
    { trait: { kind: "frees" }, level: 15 },
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

  it("turns a plain fuzzball off a shell, which takes no hit", () => {
    const flown = flyPicture({ picture: ["....2...."], kinds: SHELLS });

    expect([
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
      eventsOf(flown, "turn").map(({ at, off }) => [at, off]),
    ]).toEqual([[[0, 2]], [[2.5, "face"]]]);
  });

  it("has a charged fuzzball spend its charge on a shell", () => {
    const flown = flyPicture({
      picture: ["....2...."],
      kinds: SHELLS,
      charge: 1,
    });

    expect(
      eventsOf(flown, "strike").map(({ took, left, charge }) => [
        took,
        left,
        charge,
      ]),
    ).toEqual([[1, 1, 0]]);
  });

  // Aimed at 45° into the pocket under one shell and left of another a row
  // lower, it meets both faces at once, and spends its charge on the first.
  it("turns a fuzzball off a shell met plain once a strike at the same moment spent its charge", () => {
    const picture = ["....2....", ".....2..."];

    const flown = flyPicture({
      picture,
      lowestRow: 2,
      x: 2.25,
      degrees: 45,
      charge: 2,
      kinds: SHELLS,
    });

    expect(
      eventsOf(flown, "strike").map(({ cell, took, left }) => [
        cell,
        took,
        left,
      ]),
    ).toEqual([
      [5, 2, 0],
      [13, 0, 2],
    ]);
  });

  it("counts no strike a shell shields as a hit against a fuzzball's boredom", () => {
    const flown = fly(
      {
        wall: wallFrom(["....2...."], { lowestRow: 3 }),
        depth: 11,
        x: 4.5,
        aim: (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE,
        charge: 0,
        hot: false,
        mates: 0,
        friends: 0,
      },
      { bored: 4, kinds: SHELLS, traits: TRAIT_RULES },
    );

    expect(eventsOf(flown, "yawn").map(({ at }) => at)).toEqual([4]);
  });

  it("has a zap break a shell", () => {
    const flown = flyPicture({ picture: ["..2.-...."], kinds: SHELLS });

    expect(eventsOf(flown, "break").map(({ cell, by }) => [cell, by])).toEqual([
      [4, "fuzzball"],
      [2, "zap"],
    ]);
  });

  it("has a plain fuzzball wear moss, as any brick, in a flight", () => {
    const flown = flyPicture({ picture: ["....2...."], kinds: MOSS });

    expect(
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
    ).toEqual([[1, 1]]);
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
