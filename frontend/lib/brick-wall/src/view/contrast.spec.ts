import path from "node:path";
import { stylesheetPalettes } from "@fz/style/testing";
import { TEXT, against, holdContrast } from "../testing/contrast";
import { FIELD_ROLES, wallPalette } from "./palette";

/** The palettes every wall game draws in, as `@fz/style` sets them. */
const PALETTES = stylesheetPalettes(
  // Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
  path.join(import.meta.dirname, "../testing/palettes.scss"),
);

// What every wall game's field draws in its shared colors keeps 3:1, the
// bar for graphics, against the field: each tint, steel, the fuzzball and
// the hot shot, the sparks, the guide, and the jump and danger lines. The
// marks are cut out in the field's color, so they keep 3:1 against every
// ink they are cut from; and the fuzzball and the hot shot, which wait on
// the floor, keep it against the floor's band. The lintel's count of the
// rows waiting, in the field's text, keeps 4.5:1, the bar for text, against
// the lintel, in the band's ink. A game holds its own colors in its own
// contrast spec.
holdContrast(({ id, mode }) => {
  const palette = wallPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
  const tints = palette.tints.map(
    (ink, tint) => [`tint ${String(tint)}`, ink] as const,
  );
  const inks = [
    ...tints,
    ["steel", palette.steel],
    ["fuzzball", palette.fuzzball],
    ["hot shot", palette.hotShot],
  ] as const;
  return [
    ...against("field", palette.field, [
      ...inks,
      ["sparks", palette.spark],
      ["guide", palette.guide],
      ["jump line", palette.jumpLine],
      ["danger line", palette.dangerLine],
    ]),
    ...inks.flatMap(([name, ink]) =>
      against(name, ink, [["marks", palette.mark]]),
    ),
    ...against("floor's band", palette.band, [
      ["fuzzball", palette.fuzzball],
      ["hot shot", palette.hotShot],
    ]),
    ...against("lintel", palette.band, [["field's text", palette.text]], TEXT),
  ];
});
