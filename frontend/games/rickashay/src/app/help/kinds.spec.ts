import { isOneOf } from "@fz/core/records";
import type { KindId } from "../../rules/catalog/kinds";
import { LEVELS, parseLevel } from "../../rules/levels/levels";
import { FLIGHT_RULES } from "../../rules/tuning";
import { HELP_KIND_IDS, kindAbout, kindPictures, kindWords } from "./kinds";
import { HATCH_HELP } from "./kinds/hatch";
import { LOCK_HELP } from "./kinds/lock";
import { MOSS_HELP } from "./kinds/moss";

/** Each kind of brick a level of the game holds, once each. */
const KINDS_IN_PLAY = new Set(
  LEVELS.flatMap(({ data }) =>
    parseLevel(data).bricks.flatMap((brick) =>
      brick === null ? [] : [brick.kind],
    ),
  ),
);

/** Returns a picture as a scene hands one over, holding nothing but a kind's id. */
function pictureOf(kind: KindId): string {
  return `data:image/png;base64,${btoa(kind)}`;
}

describe("HELP_KIND_IDS", () => {
  it("lists every kind a level of the game holds", () => {
    expect(
      [...KINDS_IN_PLAY].filter((kind) => !isOneOf(kind, HELP_KIND_IDS)),
    ).toEqual([]);
  });

  it("lists the kinds in the catalog's order", () => {
    expect(HELP_KIND_IDS).toEqual([
      "brick",
      "tough",
      "steel",
      "ramp",
      "hatch",
      "spring",
      "gem",
      "portal",
      "plated",
      "moss",
      "lock",
    ]);
  });
});

describe("kindWords", () => {
  it("names a kind as the catalog does, with what it does", () => {
    expect(kindWords("steel")).toEqual({
      name: "Steel brick",
      about: "Can't be broken. A bounce off it doesn't add to your rally.",
    });
  });
});

describe("HATCH_HELP", () => {
  it("says the hatch's line, the hatches' holds between them", () => {
    expect(HATCH_HELP.about).toBe(
      `Lets the fuzzball up through. All the hatches bounce it back up ${String(FLIGHT_RULES.hatchHolds)} times a shot, then open.`,
    );
  });
});

describe("MOSS_HELP", () => {
  it("says the moss brick's line, as a player reads it at the tuning's numbers", () => {
    expect(MOSS_HELP.about).toBe(
      "Takes 2 or 3 strikes. Grows 1 pip back after each shot it survives.",
    );
  });
});

describe("LOCK_HELP", () => {
  it("says the lock's line, as a player reads it at the tuning's numbers", () => {
    expect(LOCK_HELP.about).toBe(
      "Opens after 4 turns of your shot for each bolt. Then takes 1 strike.",
    );
  });
});

describe("kindAbout", () => {
  it("says what a kind does, as the shell lists it", () => {
    expect(kindAbout("lock")).toBe(kindWords("lock").about);
  });
});

describe("kindPictures", () => {
  it("gives the picture of each kind listed, as the scene baked it", () => {
    const pictures = kindPictures({
      brick: pictureOf("brick"),
      tough: pictureOf("tough"),
      steel: pictureOf("steel"),
      ramp: pictureOf("ramp"),
      hatch: pictureOf("hatch"),
      spring: pictureOf("spring"),
      gem: pictureOf("gem"),
      portal: pictureOf("portal"),
      plated: pictureOf("plated"),
      moss: pictureOf("moss"),
      lock: pictureOf("lock"),
    });

    expect(HELP_KIND_IDS.map((kind) => pictures?.[kind])).toEqual(
      HELP_KIND_IDS.map(pictureOf),
    );
  });

  it("gives none while a kind listed has no picture", () => {
    expect(
      kindPictures({ brick: pictureOf("brick"), steel: pictureOf("steel") }),
    ).toBeNull();
  });
});
