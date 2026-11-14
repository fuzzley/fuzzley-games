import { catchCapsule, endEffect } from "../../rules/bricks/capsules";
import type { Field } from "../../rules/field/field";
import { parseLevel } from "../../rules/levels/levels";
import { stepsIn } from "../../rules/stepper";
import { MAX_LIVES } from "../../rules/tuning";
import {
  fieldFrom,
  playWithoutBall,
  stepTimes,
} from "../../testing/field_picture";
import { SPEC_LEVEL, SPEC_LEVELS, TWO_SETS } from "../../testing/play";
import {
  capsulesHere,
  effectsInPlay,
  firstLevels,
  kindsHere,
  kindsIn,
  nextLifeOf,
  placeInSet,
  showsEffects,
} from "./panels";

/** Returns a field in play, with no ball and nothing to break, after catching capsules where it stands. */
function fieldCatching(
  ...capsules: Parameters<typeof catchCapsule>[1][]
): Field {
  const field = playWithoutBall(fieldFrom(["#"]));
  for (const id of capsules) catchCapsule(field, id, 13, 28);
  return field;
}

/** Returns the specs' level of a number, ready to play. */
function specLevel(number: number): ReturnType<typeof parseLevel> {
  const entry = SPEC_LEVELS[number - 1];
  if (!entry) throw new Error(`No level ${String(number)}.`);
  return parseLevel(entry);
}

describe("nextLifeOf", () => {
  it("gives the score the next life comes at", () => {
    expect(nextLifeOf({ lives: MAX_LIVES - 1, nextLifeAt: 60_000 })).toBe(
      60_000,
    );
  });

  it("gives none while the run holds the most lives it may", () => {
    expect(nextLifeOf({ lives: MAX_LIVES, nextLifeAt: 60_000 })).toBeNull();
  });
});

describe("placeInSet", () => {
  it.each([
    { levels: SPEC_LEVELS, number: 3, place: { at: 3, of: 8 } },
    { levels: TWO_SETS, number: 3, place: { at: 1, of: 1 } },
  ])(
    "counts a level's place in its own set: level $number is $place.at of $place.of",
    ({ levels, number, place }) => {
      expect(placeInSet(levels[number - 1]!)).toEqual(place);
    },
  );
});

describe("kindsIn", () => {
  it("lists the kinds of brick a level holds, once each, in How to play's order", () => {
    const { level } = fieldFrom(["*o#o*", "2?.~+"]);

    expect(kindsIn(level)).toEqual([
      "plain",
      "tough",
      "steel",
      "blast",
      "gift",
      "ghost",
      "regrow",
    ]);
  });
});

describe("firstLevels", () => {
  it("gives each kind the first level, by number, that holds it", () => {
    expect(Object.fromEntries(firstLevels(SPEC_LEVELS))).toEqual({
      blast: SPEC_LEVEL.blasts,
      steel: SPEC_LEVEL.wide,
      gift: SPEC_LEVEL.wide,
      plain: SPEC_LEVEL.steel,
    });
  });
});

describe("kindsHere", () => {
  it("marks each kind the level is the first to hold as new", () => {
    const firsts = firstLevels(SPEC_LEVELS);

    expect(
      kindsHere(specLevel(SPEC_LEVEL.steel), SPEC_LEVEL.steel, firsts),
    ).toEqual([
      { id: "plain", isNew: true },
      { id: "steel", isNew: false },
    ]);
  });
});

describe("capsulesHere", () => {
  it("lists the level's pool where a brick may let one fall by chance, in How to play's order", () => {
    const { level } = fieldFrom(["ooo"], {
      drops: 0.1,
      capsules: ["slow", "wide", "narrow"],
    });

    expect(capsulesHere(level, "normal")).toEqual(["wide", "slow", "narrow"]);
  });

  it("leaves out what the speed keeps from falling", () => {
    const { level } = fieldFrom(["ooo"], {
      drops: 0.1,
      capsules: ["wide", "narrow"],
    });

    expect(capsulesHere(level, "relaxed")).toEqual(["wide"]);
  });

  it("lists none where nothing may fall", () => {
    const { level } = fieldFrom(["ooo"], { capsules: ["wide"] });

    expect(capsulesHere(level, "normal")).toEqual([]);
  });

  it("lists a gift's pinned capsule alone where nothing falls by chance", () => {
    expect(capsulesHere(specLevel(SPEC_LEVEL.wide), "normal")).toEqual([
      "wide",
    ]);
  });

  it("lists the pool a gift draws from where none is pinned to it", () => {
    const { level } = fieldFrom(["o?o"], { capsules: ["wide", "multi"] });

    expect(capsulesHere(level, "normal")).toEqual(["wide", "multi"]);
  });

  it("lists the pool a gift draws from where the speed keeps its pinned capsule from falling", () => {
    const { level } = fieldFrom(["o?o"], {
      capsules: ["wide", "narrow"],
      gift: "narrow",
    });

    expect(capsulesHere(level, "relaxed")).toEqual(["wide"]);
  });
});

describe("effectsInPlay", () => {
  it("lists the effects in play in the order their tags show, each whole, with its whole seconds", () => {
    const field = fieldCatching("laser", "wide");

    expect(effectsInPlay(field)).toEqual([
      { capsule: "wide", share: 1, seconds: 20 },
      { capsule: "laser", share: 1, seconds: 12 },
    ]);
  });

  it("gives each its share and its seconds left, rounded up", () => {
    const field = fieldCatching("laser");

    stepTimes(field, stepsIn(3000) + 1);

    expect(effectsInPlay(field)).toEqual([
      {
        capsule: "laser",
        share: expect.closeTo(0.75, 2) as unknown,
        seconds: 9,
      },
    ]);
  });

  it("gives one that lasts until it is used no seconds, and all its share", () => {
    expect(effectsInPlay(fieldCatching("net"))).toEqual([
      { capsule: "net", share: 1, seconds: null },
    ]);
  });

  it("lists none on a field with none in play", () => {
    expect(effectsInPlay(fieldCatching())).toEqual([]);
  });
});

describe("showsEffects", () => {
  it("holds within an effect's whole second", () => {
    const field = fieldCatching("laser", "net");
    const shown = effectsInPlay(field);

    stepTimes(field, stepsIn(1000) - 1);

    expect(showsEffects(shown, field)).toBe(true);
  });

  it("fails once a whole second has gone", () => {
    const field = fieldCatching("laser");
    const shown = effectsInPlay(field);

    stepTimes(field, stepsIn(1000));

    expect(showsEffects(shown, field)).toBe(false);
  });

  it("fails once another effect has started", () => {
    const field = fieldCatching("laser");
    const shown = effectsInPlay(field);

    catchCapsule(field, "wide", 13, 28);

    expect(showsEffects(shown, field)).toBe(false);
  });

  it("fails once another capsule of the group has taken over", () => {
    const field = fieldCatching("laser");
    const shown = effectsInPlay(field);

    catchCapsule(field, "catch", 13, 28);

    expect(showsEffects(shown, field)).toBe(false);
  });

  it("fails once an effect has ended", () => {
    const field = fieldCatching("laser", "wide");
    const shown = effectsInPlay(field);

    endEffect(field, "paddle-mode");

    expect(showsEffects(shown, field)).toBe(false);
  });
});
