import { BLAST_IDS, MADE_IDS, SPECIAL_IDS } from "./specials";

describe("MADE_IDS", () => {
  it("lists every special, then the frizzball, the design's five things a bunch leaves", () => {
    expect(MADE_IDS).toEqual([...SPECIAL_IDS, "frizzball"]);
  });
});

describe("BLAST_IDS", () => {
  it("lists what a bunch leaves going off alone, first", () => {
    expect(BLAST_IDS.slice(0, MADE_IDS.length)).toEqual(MADE_IDS);
  });

  // The design's "Swapped together": a wisp and a dasher or a puffer is
  // one row there, and three blasts here, by what the wisp carries.
  it("lists each pair the design swaps together after them", () => {
    expect(BLAST_IDS.slice(MADE_IDS.length)).toHaveLength(11);
  });

  it("names each blast once", () => {
    expect(new Set(BLAST_IDS).size).toBe(BLAST_IDS.length);
  });

  it.each(BLAST_IDS)(
    "names %s in lower case, its words joined by hyphens",
    (id) => {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    },
  );
});
