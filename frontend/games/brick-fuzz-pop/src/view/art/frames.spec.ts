import {
  CHARGES,
  CRACKS,
  FRAMES,
  FRAME_NAMES,
  INKS,
  PIPS,
  THICK_HITS,
} from "./frames";

describe("FRAMES", () => {
  it.each([
    [FRAMES.tile(7), "tile-7"],
    [FRAMES.pips(6), "pips-6"],
    [FRAMES.cracks(1), "cracks-1"],
    [FRAMES.plate("floorward"), "plate-floorward"],
    [FRAMES.shell(3), "shell-3"],
    [FRAMES.moss(2), "moss-2"],
    [FRAMES.zapper("x"), "zapper-x"],
    [FRAMES.portal(2), "portal-2"],
    [FRAMES.cage("hit"), "cage-hit"],
    [FRAMES.fuzzball(0), "fuzzball-0"],
    [FRAMES.friend(5), "friend-5"],
  ])("names a frame %s", (name, expected) => {
    expect(name).toBe(expected);
  });
});

describe("FRAME_NAMES", () => {
  // 8 tiles, 5 pips, 5 cracks, steel, 4 plates, a shell's body and 2 of
  // its pips, 2 moss pips and its cap, 4 zappers, the bomb, the bumper, the
  // prism, 2 portals, wool, 2 cages, 6 fuzzballs, the hot shot, 8 friends,
  // their eyes, 2 meter pips and 2 of the guide's marks.
  it("lists every frame the art draws", () => {
    expect(FRAME_NAMES).toHaveLength(61);
  });

  it("lists each frame once", () => {
    expect(new Set(FRAME_NAMES).size).toBe(FRAME_NAMES.length);
  });

  it("lists every frame that stands alone", () => {
    expect(FRAME_NAMES).toEqual(
      expect.arrayContaining([
        "steel",
        "shell-body",
        "moss-cap",
        "bomb",
        "bumper",
        "prism",
        "wool",
        "hot-shot",
        "fuzzball-eyes",
        "meter-on",
        "meter-off",
        "guide-dot",
        "guide-punch",
      ]),
    );
  });

  it.each(FRAME_NAMES)(
    "names %s in lower case, its words joined by hyphens",
    (name) => {
      expect(name).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
    },
  );
});

describe("the lists of the frames' arguments", () => {
  it.each([
    ["INKS", INKS, [0, 1, 2, 3, 4, 5, 6, 7]],
    ["PIPS", PIPS, [2, 3, 4, 5, 6]],
    ["CRACKS", CRACKS, [1, 2, 3, 4, 5]],
    ["CHARGES", CHARGES, [0, 1, 2, 3, 4, 5]],
    ["THICK_HITS", THICK_HITS, [2, 3]],
  ])("lists %s in order", (_, list, expected) => {
    expect(list).toEqual(expected);
  });
});
