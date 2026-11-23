import { TEXT, against, holdContrast } from "@fz/brick-wall/testing/contrast";
import { KIND_IDS } from "../../rules/catalog/kinds";
import { PORTAL_MARKS } from "../../rules/levels/legend";
import { PALETTES } from "../../testing/roles";
import { brickColor } from "./brick_colors";
import { FIELD_ROLES, wallPalette } from "./palette";

/** A color, named for what it draws. */
type Named = readonly [string, number];

// The colors every wall game draws in are held in `@fz/brick-wall`'s own
// contrast spec: the tints, steel, the fuzzball, the hot shot, the sparks
// and the flames, the guide, the lines and the lintel's count. Rickashay's
// own keep 3:1, the bar for graphics, against the field, in every palette:
// each kind's color, in its first ink, and each pair of portals', since
// a row's other inks are the library's tints; the rally's pill; the
// guide's rings; and the streak the dash home leaves. The marks are cut
// out in the field's color, so they keep 3:1 against every kind's color.
// The floor bounces' springs, lit and unlit, keep 3:1 against the floor's
// band they stand in, and the rally's number, text, 4.5:1 against its
// pill.
describe("the field's contrast", () => {
  holdContrast(({ id, mode }) => {
    const palette = wallPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    const kinds: readonly Named[] = [
      ...KIND_IDS.map((kind): Named => [
        `${kind}'s color`,
        brickColor({ kind, tint: 0 }, palette),
      ]),
      ...PORTAL_MARKS.map((mark, pair): Named => [
        `portals marked ${mark}`,
        brickColor({ kind: "portal", tint: pair }, palette),
      ]),
    ];
    return [
      ...against("field", palette.field, [
        ...kinds,
        ["rally's pill", palette.pill.fill],
        ["guide's rings", palette.guideRing],
        ["fuzzball's streak", palette.streak.plain],
        ["hot shot's streak", palette.streak.hot],
      ]),
      ...kinds.flatMap(([name, color]) =>
        against(name, color, [["marks", palette.mark]]),
      ),
      ...against("floor's band", palette.band, [
        ["lit springs", palette.springs.on],
        ["unlit springs", palette.springs.off],
      ]),
      ...against(
        "rally's pill",
        palette.pill.fill,
        [["rally's number", palette.pill.text]],
        TEXT,
      ),
    ];
  });
});
