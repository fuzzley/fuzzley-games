import { eventsOf, flyPicture } from "../../testing/flights";
import { wallFrom } from "../../testing/wall_picture";
import { BRICK_KINDS } from "../catalog/bricks";
import { fly } from "../flight/flight";
import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES, MOST_CHARGE } from "../tuning";
import { TRAIT_RULES } from "./trait_rules";

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
    const flown = flyPicture({ picture: ["....S...."] });

    expect([
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
      eventsOf(flown, "turn").map(({ at, off }) => [at, off]),
    ]).toEqual([[[0, 2]], [[2.5, "face"]]]);
  });

  it("has a charged fuzzball spend its charge on a shell", () => {
    const flown = flyPicture({
      picture: ["....S...."],
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
    const picture = ["....S....", ".....S..."];

    const flown = flyPicture({
      picture,
      lowestRow: 2,
      x: 2.25,
      degrees: 45,
      charge: 2,
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
        wall: wallFrom(["....S...."], { lowestRow: 3 }),
        depth: 11,
        x: 4.5,
        aim: (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE,
        charge: 0,
        hot: false,
        mates: 0,
        friends: 0,
      },
      { bored: 4, kinds: BRICK_KINDS, traits: TRAIT_RULES },
    );

    expect(eventsOf(flown, "yawn").map(({ at }) => at)).toEqual([4]);
  });

  it("has a zap break a shell", () => {
    const flown = flyPicture({ picture: ["..S.-...."] });

    expect(eventsOf(flown, "break").map(({ cell, by }) => [cell, by])).toEqual([
      [4, "fuzzball"],
      [2, "zap"],
    ]);
  });

  it("has a plain fuzzball wear moss, as any brick, in a flight", () => {
    const flown = flyPicture({ picture: ["....M...."] });

    expect(
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
    ).toEqual([[1, 1]]);
  });

  it("leaves a hot shot its charge on steel, unearthed", () => {
    const flown = flyPicture({ picture: ["....#...."], hot: true });

    expect(
      eventsOf(flown, "strike").map(({ charge, earthed }) => [charge, earthed]),
    ).toEqual([[MOST_CHARGE, false]]);
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
