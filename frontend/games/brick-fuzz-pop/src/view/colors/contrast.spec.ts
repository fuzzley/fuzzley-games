import { against, holdContrast } from "@fz/brick-wall/testing/contrast";
import { FIELD_ROLES, type KindInks } from "@fz/brick-wall/view/palette";
import { colorNumber } from "@fz/phaser/color";
import { PALETTES } from "../../testing/roles";
import { wallPalette } from "./palette";

/** A color, named for what it draws. */
type Named = readonly [string, number];

// The colors every wall game draws in are held in `@fz/brick-wall`'s own
// contrast spec: the tints, steel, the fuzzball, the hot shot, the sparks,
// the guide, the lines and the lintel's count. Brick Fuzz Pop's own keep
// 3:1, the bar for graphics, against the field, in every palette: each
// special kind's body, every friend and the meter. A kind's glyph keeps
// 3:1 against the face it is drawn on, and against the field too unless it
// is cut out in the field's color. The marks are cut out in the field's
// color, so they keep 3:1 against every kind's body and every friend they
// are cut from. A friend keeps 3:1 against the bar, where the crew waits,
// and against a cage's inside, where it waits to be freed; and the meter,
// which waits on the floor, against the floor's band. The gauge over an
// aiming finger shows the meter's pips again on a plate of its own, so its
// lit pips and its unlit pips' rim keep 3:1 against the plate.
describe("the field's contrast", () => {
  holdContrast(({ id, mode }) => {
    const palette = wallPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    const bar = colorNumber(PALETTES.role(id, "bar"));
    const kinds: readonly (readonly [string, KindInks])[] = [
      ...Object.entries(palette.kinds),
      ...palette.portals.map(
        (inks, pair) => [`portal of pair ${String(pair + 1)}`, inks] as const,
      ),
    ];
    const bodies = kinds.map(([kind, { body }]): Named => [
      `${kind}'s body`,
      body,
    ]);
    const friends = palette.friends.map((ink, i): Named => [
      `friend's ink ${String(i)}`,
      ink,
    ]);
    const meter: readonly Named[] = [
      ["meter's lit pips", palette.meter.on],
      ["meter's unlit pips", palette.meter.off],
    ];
    const [red, amber, blue] = palette.rays;
    return [
      ...against("field", palette.field, [...bodies, ...friends, ...meter]),
      ...kinds.flatMap(([kind, { glyph, face }]) =>
        against(`${kind}'s face`, face, [[`${kind}'s glyph`, glyph]]),
      ),
      ...kinds
        .filter(([, { glyph }]) => glyph !== palette.mark)
        .flatMap(([kind, { glyph }]) =>
          against("field", palette.field, [
            [`${kind}'s glyph, which isn't cut out`, glyph],
          ]),
        ),
      ...against("prism's glass", palette.kinds.prism.face, [
        ["prism's red ray", red],
        ["prism's amber ray", amber],
        ["prism's blue ray", blue],
      ]),
      ...against("cross zapper's tile", palette.kinds.crossZapper.face, [
        ["cross zapper's diamond, in the field's text", palette.text],
      ]),
      ...[...bodies, ...friends].flatMap(([name, color]) =>
        against(name, color, [["marks", palette.mark]]),
      ),
      ...against("bar", bar, friends),
      ...against("cage's inside", palette.kinds.cage.face, friends),
      ...against("floor's band", palette.band, meter),
      ...against("gauge's plate", palette.gauge.plate, [
        ["gauge's lit pips", palette.meter.on],
        ["gauge's unlit pips' rim", palette.meter.off],
      ]),
    ];
  });
});
