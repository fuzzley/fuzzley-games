import { TEXT, against, holdContrast } from "@fz/brick-wall/testing/contrast";
import { KIND_IDS } from "../../rules/catalog/kinds";
import { PORTAL_MARKS } from "../../rules/levels/legend";
import { PALETTES } from "../../testing/roles";
import { tileCommands } from "../art/kinds/brick";
import { gemFacets } from "../art/kinds/gem";
import { portalInks } from "../art/kinds/portal";
import { brickColor } from "./brick_colors";
import { FIELD_ROLES, wallPalette } from "./palette";

/** A color, named for what it draws. */
type Named = readonly [string, number];

/** Returns the color of the strip along the top of a tile in an ink, as the tile draws it: its last shape. */
function stripOf(ink: number): number {
  const cell = { x: 0, y: 0, width: 100, height: 100 };
  return tileCommands(cell, ink).at(-1)?.color ?? NaN;
}

// The colors every wall game draws in are held in `@fz/brick-wall`'s own
// contrast spec: the tints, steel, the fuzzball, the hot shot, the sparks
// and the flames, the guide, the lines and the lintel's count. Rickashay's
// own keep 3:1, the bar for graphics, against the field, in every palette:
// each kind's color, in its first ink, and each pair of portals', since
// a row's other inks are the library's tints; the rally's pill; the
// guide's rings; and the streak the dash home leaves. The marks are cut
// out in the field's color, so they keep 3:1 against every kind's color;
// and since a tough brick's cracks run in from its tile's edges, two of
// them across the lighter strip along its top, against each ink's strip
// too. None crosses the darker lip along its foot, which they keep less
// than 3:1 against in Midnight blue, and steel's frame and rivets keep off
// its strip, which they keep less than 3:1 against in the light palettes.
// A ramp's bright edge, which keeps less than 3:1 against the light
// palettes' field, lies inside a rim of the ramp's steel. A gem's outline
// is its facets', its upper half lighter and its lower edges darker, so
// each keeps 3:1 against the field in every ink.
// A hatch's chevrons, and an open hatch's posts, lie on the field, which
// they keep 3:1 against.
// The floor bounces' springs, lit and unlit, keep 3:1 against the floor's
// band they stand in, and the rally's number, text, 4.5:1 against its
// pill. Each pair of portals' arms keep 3:1 against its eye, and its
// badge, in the arms' color, against the disc it is cut out on, in the
// marks' color. A moss brick's cap, which tops its outline, keeps 3:1
// against the field, and its sprout, cut out of the cap in the marks'
// color, against the cap; its pips are the marks on its amber tile, its
// kind's color. The cap's scalloped foot, and the shadow under it, keep
// less than 3:1 against that tile in every palette, as Brick Fuzz Pop's
// do: the kind is told by its sprout and its cap's outline, which keep it.
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
        ...palette.tints.flatMap((ink, tint): Named[] => {
          const { light, dark } = gemFacets(ink);
          return [
            [`gem's light facet in ink ${String(tint)}`, light],
            [`gem's dark facet in ink ${String(tint)}`, dark],
          ];
        }),
        ["hatch's chevrons", palette.chevrons],
        ["moss's cap", palette.mossCap],
      ]),
      ...kinds.flatMap(([name, color]) =>
        against(name, color, [["marks", palette.mark]]),
      ),
      ...palette.tints.flatMap((ink, tint) =>
        against(`tile's strip in ink ${String(tint)}`, stripOf(ink), [
          ["cracks", palette.mark],
        ]),
      ),
      ...against("moss's cap", palette.mossCap, [
        ["moss's sprout", palette.mark],
      ]),
      ...against("floor's band", palette.band, [
        ["lit springs", palette.springs.on],
        ["unlit springs", palette.springs.off],
      ]),
      ...PORTAL_MARKS.flatMap((mark, pair) => {
        const { middle, glyph, disc } = portalInks(pair, palette);
        return [
          ...against(`eye of portals marked ${mark}`, middle, [
            [`arms of portals marked ${mark}`, glyph],
          ]),
          ...against(`badge's disc of portals marked ${mark}`, disc, [
            [`badge of portals marked ${mark}`, glyph],
          ]),
        ];
      }),
      ...against(
        "rally's pill",
        palette.pill.fill,
        [["rally's number", palette.pill.text]],
        TEXT,
      ),
    ];
  });
});
