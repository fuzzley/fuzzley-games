import { type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { SPECIAL_IDS } from "../../rules/catalog/specials";
import { billionths } from "../../testing/art_frames";
import { BODY } from "./design_square";
import { SPECIAL_ART } from "./specials";

/** The ink the specs draw second furs in. */
const INK = 0x123456;

/** Returns how far a drawing reaches each way from the body's middle, to a billionth. */
function reachOf(commands: readonly DrawCommand[]): {
  left: number;
  right: number;
  up: number;
  down: number;
} {
  const areas = commands.map(extentOf);
  return {
    left: billionths(-Math.min(...areas.map(({ x }) => x))),
    right: billionths(Math.max(...areas.map(({ x, width }) => x + width))),
    up: billionths(-Math.min(...areas.map(({ y }) => y))),
    down: billionths(Math.max(...areas.map(({ y, height }) => y + height))),
  };
}

describe("SPECIAL_ART", () => {
  it.each(SPECIAL_IDS)(
    "draws %s's second fur in the ink it is handed",
    (special) => {
      expect(
        new Set(SPECIAL_ART[special].secondFur(INK).map(({ color }) => color)),
      ).toEqual(new Set([INK]));
    },
  );

  it("streams a dasher across out either side, its long streamers reaching 1.9 of a body's radius along its line, further than it reaches up or down", () => {
    const { left, right, up, down } = reachOf(
      SPECIAL_ART["dasher-across"].secondFur(INK),
    );

    expect({
      past: Math.min(left, right) > 1.9 * BODY,
      across: Math.min(left, right) > Math.max(up, down),
    }).toEqual({ past: true, across: true });
  });

  it("draws a dasher up and down as a dasher across turned a quarter turn", () => {
    const across = reachOf(SPECIAL_ART["dasher-across"].secondFur(INK));

    expect(reachOf(SPECIAL_ART["dasher-down"].secondFur(INK))).toEqual({
      left: across.up,
      right: across.down,
      up: across.left,
      down: across.right,
    });
  });

  it("stands a puffer's ruff out all round, as far each way to within its strands' wobble", () => {
    const { left, right, up, down } = reachOf(
      SPECIAL_ART.puffer.secondFur(INK),
    );
    const reaches = [left, right, up, down];

    expect(Math.max(...reaches) - Math.min(...reaches)).toBeLessThan(
      0.15 * BODY,
    );
  });

  it("raises a wisp's seed-head above its body, a fan of seven hairs, a bead at each tip", () => {
    const beads = SPECIAL_ART.wisp
      .secondFur(INK)
      .flatMap((command) =>
        command.kind === "circle" && command.radius === BODY * 0.085
          ? [command]
          : [],
      );

    expect({
      count: beads.length,
      aboveBody: beads.every(({ y }) => y < -BODY),
    }).toEqual({ count: 7, aboveBody: true });
  });
});
