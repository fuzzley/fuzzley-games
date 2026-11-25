import { isOneOf } from "@fz/core/records";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { LEVELS, parseLevel } from "../../rules/levels/levels";
import { levelStart } from "../../rules/run/run";
import { describeKind } from "../../rules/run/describe";
import { FLIGHT_RULES } from "../../rules/tuning";
import {
  HELP_KIND_IDS,
  holdsListedKinds,
  kindAbout,
  kindPictures,
  kindWords,
} from "./kinds";
import { HATCH_HELP } from "./kinds/hatch";

/** Each kind of brick a level of the game holds, once each. */
const KINDS_IN_PLAY = new Set(
  LEVELS.flatMap(({ data }) =>
    parseLevel(data).bricks.flatMap((brick) =>
      brick === null ? [] : [brick.kind],
    ),
  ),
);

/** The wall of the game's first level, as it opens on a field 11 deep. */
const FIRST_WALL = levelStart(parseLevel(LEVELS[0]!.data), 11).wall;

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

describe("kindAbout", () => {
  it("says what a kind listed does, as the shell lists it", () => {
    expect(kindAbout("tough")).toBe(kindWords("tough").about);
  });

  it("says what a kind not listed does, as the rules have it", () => {
    const unlisted = KIND_IDS.find((kind) => !isOneOf(kind, HELP_KIND_IDS))!;

    expect(kindAbout(unlisted)).toBe(describeKind(unlisted));
  });
});

describe("holdsListedKinds", () => {
  it("holds a level's wall to the kinds listed", () => {
    expect(holdsListedKinds(FIRST_WALL)).toBe(true);
  });

  it("finds a wall holding a kind not listed", () => {
    const unlisted = KIND_IDS.find((kind) => !isOneOf(kind, HELP_KIND_IDS))!;
    const brick = { kind: unlisted, hits: 0, full: 0, plates: 0, tint: 0 };

    expect(
      holdsListedKinds({
        ...FIRST_WALL,
        bricks: [...FIRST_WALL.bricks, { ...brick, twin: null }],
      }),
    ).toBe(false);
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
