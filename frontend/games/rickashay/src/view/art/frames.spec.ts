import {
  BOLTS,
  CRACKS,
  FRAMES,
  FRAME_NAMES,
  FURS,
  HATCH_HOLDS,
  INKS,
  LOCK_LOOKS,
  MOSS_HITS,
  PIPS,
  PLATED_HITS,
  PLATINGS,
  PORTAL_MARKS,
  RAMP_CORNERS,
} from "./frames";

describe("FRAMES", () => {
  it.each([
    [FRAMES.tile(7), "tile-7"],
    [FRAMES.pips(6), "pips-6"],
    [FRAMES.cracks(1), "cracks-1"],
    [FRAMES.ramp("ceilingward-right"), "ramp-ceilingward-right"],
    [FRAMES.hatch(3), "hatch-3"],
    [FRAMES.gem(2), "gem-2"],
    [FRAMES.portal(2), "portal-2"],
    [FRAMES.plated("floorward-sides", 2), "plated-floorward-sides-2"],
    [FRAMES.moss(3), "moss-3"],
    [FRAMES.lock("3-1"), "lock-3-1"],
    [FRAMES.fuzzball(0), "fuzzball-0"],
  ])("names a frame %s", (name, expected) => {
    expect(name).toBe(expected);
  });
});

describe("FRAME_NAMES", () => {
  // 8 tiles, 5 pips, 5 cracks, steel, 4 ramps, 3 hatches' bars and an open
  // one, the spring brick, 8 gems, 2 portals, 2 platings at each of 3 hits
  // left, moss's cap and 2 of its pips, locks of 1, 2 and 3 bolts with 0 to
  // all of them shut (2 + 3 + 4), 4 lifts of the fuzzball's fur, the hot
  // shot, the eyes, 2 of the guide's marks and the floor bounces' 2 springs.
  it("lists every frame the art draws", () => {
    expect(FRAME_NAMES).toHaveLength(66);
  });

  it("lists each frame once", () => {
    expect(new Set(FRAME_NAMES).size).toBe(FRAME_NAMES.length);
  });

  it("lists a lock with each of its bolts shut, and none", () => {
    expect(FRAME_NAMES.filter((name) => name.startsWith("lock-"))).toEqual([
      "lock-1-0",
      "lock-1-1",
      "lock-2-0",
      "lock-2-1",
      "lock-2-2",
      "lock-3-0",
      "lock-3-1",
      "lock-3-2",
      "lock-3-3",
    ]);
  });

  it("names no lock with more bolts shut than it has", () => {
    // @ts-expect-error A lock of 1 bolt never has 3 shut.
    const name = FRAMES.lock("1-3");

    expect(FRAME_NAMES).not.toContain(name);
  });

  it("lists every frame that stands alone", () => {
    expect(FRAME_NAMES).toEqual(
      expect.arrayContaining([
        "steel",
        "hatch-open",
        "spring",
        "moss-cap",
        "hot-shot",
        "fuzzball-eyes",
        "guide-dot",
        "guide-ring",
        "bounce-off",
        "bounce-on",
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
    [
      "RAMP_CORNERS",
      RAMP_CORNERS,
      [
        "floorward-left",
        "floorward-right",
        "ceilingward-left",
        "ceilingward-right",
      ],
    ],
    ["HATCH_HOLDS", HATCH_HOLDS, [1, 2, 3]],
    ["PORTAL_MARKS", PORTAL_MARKS, [1, 2]],
    ["PLATINGS", PLATINGS, ["floorward", "floorward-sides"]],
    ["PLATED_HITS", PLATED_HITS, [1, 2, 3]],
    ["MOSS_HITS", MOSS_HITS, [2, 3]],
    ["BOLTS", BOLTS, [1, 2, 3]],
    ["LOCK_LOOKS[1]", LOCK_LOOKS[1], ["1-0", "1-1"]],
    ["LOCK_LOOKS[2]", LOCK_LOOKS[2], ["2-0", "2-1", "2-2"]],
    ["LOCK_LOOKS[3]", LOCK_LOOKS[3], ["3-0", "3-1", "3-2", "3-3"]],
    ["FURS", FURS, [0, 1, 2, 3]],
  ])("lists %s in order", (_, list, expected) => {
    expect(list).toEqual(expected);
  });
});
