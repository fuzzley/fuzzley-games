import { FEEL } from "../timeline/feel";
import { madeShakePx } from "./shakes";

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
