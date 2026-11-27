import { BLAST_IDS } from "../../rules/catalog/specials";
import { FEEL } from "../timeline/feel";
import { blastShakePx, madeShakePx } from "./shakes";

describe("madeShakePx", () => {
  it.each([
    ["dasher-across", 2.5],
    ["puffer", 2.5],
    ["wisp", 2.5],
    ["frizzball", 5],
  ] as const)(
    "shakes the board as a %s is made by the design's %d px",
    (made, px) => {
      expect(madeShakePx(made, FEEL)).toBe(px);
    },
  );
});

describe("blastShakePx", () => {
  it("shakes the board as each blast goes off by the design's px", () => {
    expect(
      Object.fromEntries(
        BLAST_IDS.map((blast) => [blast, blastShakePx(blast, FEEL)]),
      ),
    ).toEqual({
      "dasher-across": 3,
      "dasher-down": 3,
      puffer: 6,
      wisp: 0,
      frizzball: 6,
      "two-dashers": 4,
      "dasher-and-puffer": 7,
      "two-puffers": 10,
      "two-wisps": 0,
      "wisp-and-dasher-across": 0,
      "wisp-and-dasher-down": 0,
      "wisp-and-puffer": 0,
      "frizzball-and-dasher": 4,
      "frizzball-and-puffer": 4,
      "frizzball-and-wisp": 4,
      "two-frizzballs": 10,
    });
  });
});
