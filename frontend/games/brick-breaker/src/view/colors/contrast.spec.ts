import { BRICK_SLAB, slabCommands } from "@fz/phaser/bricks";
import { THEMES } from "@fz/style/themes";
import { contrast, deltaE, rgbOf } from "@fz/style/testing";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { PALETTES } from "../../testing/roles";
import { bricksPalette } from "./palette";

/** Returns a record's entries, each named by its key and what it is. */
function named(
  record: Readonly<Record<string, number>>,
  what: string,
): readonly (readonly [string, number])[] {
  return Object.entries(record).map(([key, color]) => [
    `${key} ${what}`,
    color,
  ]);
}

/** A brick's cell, at a size whose slab draws its lip and its strip. */
const BRICK_CELL = { x: 0, y: 0, width: 80, height: 40 } as const;

/**
 * Returns the colors of the slab a brick is drawn on in a color, as the art
 * kit draws it, each named: its lip, its face and its strip, all of which
 * lie under the edge the guide outlines it along.
 */
function slabOf([name, ink]: readonly [string, number]): readonly (readonly [
  string,
  number,
])[] {
  const [lip, face, strip] = slabCommands(BRICK_CELL, ink, BRICK_SLAB);
  return [
    [`${name}'s lip`, lip?.color ?? NaN],
    [name, face?.color ?? NaN],
    [`${name}'s strip`, strip?.color ?? NaN],
  ];
}

/** The contrast a hidden ghost keeps against the field: faint by design, as the art draws it, yet there to be found. */
const FAINT = 2;

/**
 * How far apart in CIELAB, by CIE76, the two pairs of portals' inks keep,
 * as far as any two fuzzballs' inks do, so two side by side never look
 * alike to a player who tells inks apart.
 */
const PAIRS_APART = 27;

// Everything a player follows, aims at or dodges is held to 3:1, the bar for
// graphics, against the field, in every palette, the paddle's caps, its hooks
// and its cannons among it, a bad capsule's gold lip, which says it pays
// double, the sparks about a ball at the streak's top multiplier and a
// seeking ball's sight, each outlined as a ball is, and the ring a broken
// regrowing brick fills as it grows back, and so are the last bricks' glow
// and the serve's guide, one ink, whose dots lie on the field. Its outline
// lies on a brick, which the text can't clear in every palette, so the ink is
// ringed each side in the outline's color, which it is held to 3:1 against;
// and the outline is held to 3:1 against each brick it can lie on, its slab's
// lip and strip among it, though nothing else is, and the inks at a brick's
// edge, by whichever of its ring and its ink stands further from it, since a
// hidden ghost, steel's frame and the moss's shadows sit near the field in
// one mode or the other, where the ink clears them;
// the wall, which only frames the field, is left at a wash of the text, as
// Snake's is. A ball or a capsule falls through the gutter under the paddle,
// washed with the danger color, so each is held to 3:1 against it too, and
// the gutter's chevrons to FAINT against it, faint as the gutter is. A ball
// or a capsule crosses bricks too, and its color can't also clear every tint:
// the tints and the warning and danger colors all sit on the same side of the
// field, so a color 3:1 from both the field and a tint would need 9:1 from
// the field, which only the text reaches. So each is outlined, in a color
// held to 3:1 against everything it crosses. The marks that tell a brick's
// kind and state apart, a ball's kind, and a capsule's symbol are held to 3:1
// against what they are drawn on: the marks' color against every brick, a
// moss cap and a shown ghost among them, steel's frame and rivets against the
// steel, and a blast brick's spark against the mark it is lit on; the bolts
// in the paddle's caps are the marks' color too. A friend freed from a cage
// is a ball in an ink of its own, held as every ball is, and so is the
// friend a cage holds, behind bars of steel, inside it cut out in the marks'
// color. A plated brick's plate is steel, which keeps no contrast with a
// brick's tint, so the brick is cut away round it in the marks' color, which
// the plate and its teeth are held to; its rivets, like a gate's keyhole,
// are held against the steel, and a key's gold and its key are held as a
// brick and its marks are. A bumper is a brick in the accent, its ring cut
// out of it in the marks' color, its ticks in the accent too. A portal's
// ring is a brick in its pair's tint, round a middle and under a badge's disc
// in the marks' color, which its arms and badge are held to; its two pairs
// share a luminance, as every tint does, so they are held apart by hue, to
// PAIRS_APART, and the art spec holds their badges apart in shape, a dot and
// a diamond, for a player who can't tell the inks apart. A slider is a brick
// in its tint, its lit chevron in the marks' color, and the two trailing it
// are held to FAINT against its tint, faint as a trail is. A hidden ghost is
// held only to FAINT, since it is meant to be hard to see, and a brick's
// shading (its lip and strip, steel's sheen, a gift's ribbon, the moss's
// shadows, a plate's shine, a gate's gold ends, which its keyhole tells, and
// a bumper's shadow and cap), the paddle's (its lip and pad), a good
// capsule's (its lip and shine), the rim's lip and the regrowing ring's track
// to nothing, since none tells a kind: a gift's bow is outlined in the marks'
// color.
describe("the field's contrast", () => {
  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const palette = bricksPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    // Numbered from 1, as a level's tints are.
    const tints = palette.tints.map(
      (tint, i) => [`tint ${String(i + 1)}`, tint] as const,
    );
    const toughTints = palette.toughTints.map(
      (tint, i) => [`tough tint ${String(i + 1)}`, tint] as const,
    );
    const shownGhosts = palette.ghostTints.shown.map(
      (tint, i) => [`shown ghost's tint ${String(i + 1)}`, tint] as const,
    );
    const hiddenGhosts = palette.ghostTints.hidden.map(
      (tint, i) => [`hidden ghost's tint ${String(i + 1)}`, tint] as const,
    );
    // Numbered from 1, as the friends a level frees are counted.
    const friends = palette.friendInks.map(
      (ink, i) => [`friend ${String(i + 1)}'s ink`, ink] as const,
    );
    // Numbered from 1, as `@` is the first pair and `%` the second.
    const portalRings = palette.portals.map(
      ({ ring }, i) => [`portal pair ${String(i + 1)}'s ring`, ring] as const,
    );
    const portalGlyphs = palette.portals.map(
      ({ glyph }, i) =>
        [`portal pair ${String(i + 1)}'s arms and badge`, glyph] as const,
    );
    const outlined = [
      ...named(palette.balls, "ball"),
      ...friends,
      ...named(palette.capsules, "capsule"),
    ];
    const crossed = [
      ...tints,
      ...toughTints,
      ...shownGhosts,
      ...named(palette.bricks, "brick"),
      ...portalRings,
      ["moss", palette.kindInks.moss] as const,
      ["paddle", palette.paddle] as const,
      ["paddle's caps", palette.paddleInks.cap] as const,
    ];
    const paddleMarks = [
      ["paddle's hooks", palette.paddleInks.hook] as const,
      ["cannons and their bolts", palette.paddleInks.cannon] as const,
    ];
    const capsuleMarks = [
      ["bad capsule's gold lip", palette.capsuleLips.bad] as const,
    ];
    const ballMarks = [
      ["sparks about a ball at ×4", palette.streakSparks] as const,
      ["seeking ball's sight", palette.capsules.good] as const,
    ];
    const regrowing = [
      ["regrowing brick's ring", palette.kindInks.regrowRing] as const,
    ];
    const guideLiesOn = [
      ...[
        ...tints,
        ...toughTints,
        ...shownGhosts,
        ...named(palette.bricks, "brick"),
      ].flatMap(slabOf),
      ...hiddenGhosts,
      ["moss", palette.kindInks.moss] as const,
      ["moss's shadows", palette.kindInks.mossShadow] as const,
      ["plate", palette.kindInks.plate] as const,
      ["plate's shine", palette.kindInks.plateShine] as const,
      ["steel's frame", palette.kindInks.steelLine] as const,
      ["gift's ribbon", palette.kindInks.ribbon] as const,
    ];

    it.each([
      ...crossed,
      ...outlined,
      ...paddleMarks,
      ...capsuleMarks,
      ...ballMarks,
      ...regrowing,
      ["glow", palette.glow] as const,
      ["serve's guide", palette.guide] as const,
    ])("keeps the %s at 3:1 or more against the field", (_, color) => {
      expect(
        contrast(rgbOf(color), rgbOf(palette.field)),
      ).toBeGreaterThanOrEqual(3);
    });

    it("keeps the serve's guide at 3:1 or more against the ring each side of its outline", () => {
      expect(
        contrast(rgbOf(palette.guide), rgbOf(palette.outline)),
      ).toBeGreaterThanOrEqual(3);
    });

    it.each(guideLiesOn)(
      "keeps the guide's outline at 3:1 or more against the %s, by its ring or its ink",
      (_, color) => {
        expect(
          Math.max(
            contrast(rgbOf(palette.outline), rgbOf(color)),
            contrast(rgbOf(palette.guide), rgbOf(color)),
          ),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each(hiddenGhosts)(
      "keeps the %s at 2:1 or more against the field, faint but there",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.field)),
        ).toBeGreaterThanOrEqual(FAINT);
      },
    );

    it.each(outlined)(
      "keeps the %s at 3:1 or more against its outline",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.outline)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each(crossed)(
      "keeps the outline at 3:1 or more against the %s",
      (_, color) => {
        expect(
          contrast(rgbOf(palette.outline), rgbOf(color)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each([...crossed, ...outlined])(
      "keeps the marks at 3:1 or more against the %s",
      (_, color) => {
        expect(
          contrast(rgbOf(palette.mark), rgbOf(color)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each([...outlined, ...ballMarks, ...capsuleMarks])(
      "keeps the %s at 3:1 or more against the gutter it falls through",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.fieldInks.gutter)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each(
      palette.sliderTrails.map(
        (trail, i) =>
          [`tint ${String(i + 1)}`, trail, palette.tints[i] ?? NaN] as const,
      ),
    )(
      "keeps the chevrons trailing a slider's lit one at 2:1 or more against its %s, faint as a trail is",
      (_, trail, tint) => {
        expect(contrast(rgbOf(trail), rgbOf(tint))).toBeGreaterThanOrEqual(
          FAINT,
        );
      },
    );

    it("keeps the gutter's chevrons at 2:1 or more against the gutter, faint as it is", () => {
      expect(
        contrast(
          rgbOf(palette.fieldInks.chevron),
          rgbOf(palette.fieldInks.gutter),
        ),
      ).toBeGreaterThanOrEqual(FAINT);
    });

    it.each([
      ["steel", palette.bricks.steel],
      ["plate", palette.kindInks.plate],
      ["gate", palette.bricks.gate],
    ] as const)(
      "keeps steel's frame and rivets, a plate's rivets and a gate's keyhole at 3:1 or more against the %s",
      (_, color) => {
        expect(
          contrast(rgbOf(palette.kindInks.steelLine), rgbOf(color)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each([
      ["plate and its teeth", palette.kindInks.plate],
      ["cage's bars", palette.bricks.cage],
    ] as const)(
      "keeps a %s at 3:1 or more against the marks' color they stand in",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.mark)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each(portalGlyphs)(
      "keeps the %s at 3:1 or more against the marks' color its middle and its badge's disc are filled in",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.mark)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each([
      ["rings", palette.portals.map(({ ring }) => ring)],
      ["arms and badges", palette.portals.map(({ glyph }) => glyph)],
    ])(
      `keeps the two pairs of portals' %s ${String(PAIRS_APART)} or more apart`,
      (_, [first = NaN, second = NaN]) => {
        expect(deltaE(rgbOf(first), rgbOf(second))).toBeGreaterThanOrEqual(
          PAIRS_APART,
        );
      },
    );

    it("keeps a blast brick's spark at 3:1 or more against the marks it is lit on", () => {
      expect(
        contrast(rgbOf(palette.kindInks.spark), rgbOf(palette.mark)),
      ).toBeGreaterThanOrEqual(3);
    });
  });
});
