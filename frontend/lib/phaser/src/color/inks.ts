// The inks the games drawn on a canvas share, as the numbers Phaser takes; a
// shell that draws one too writes it with `cssHex()`. Each game holds them to
// 3:1 against its own field in its own contrast spec, as no two fields are
// alike.

/** Describes a set of inks for each mode a palette comes in, the same colors in the same order in both. */
export interface ModeInks {
  /** The inks on a light palette, each dark enough to keep 3:1 against its field. */
  readonly light: readonly number[];
  /** The inks on a dark palette, each light enough to keep 3:1 against its field. */
  readonly dark: readonly number[];
}

/**
 * The tints a tile takes, as a brick does, eight in each mode: red, orange,
 * amber, green, teal, blue, violet and pink.
 *
 * A tile is told apart by its shape and its marks first, so two of them may
 * lie closer than two {@link FUZZBALL_INKS} do.
 */
export const TILE_INKS: ModeInks = {
  light: [
    0xd4322d, // red
    0xb9530f, // orange
    0x936908, // amber
    0x29803f, // green
    0x167e7b, // teal
    0x256fd1, // blue
    0x8b55d2, // violet
    0xcb3087, // pink
  ],
  dark: [
    0xec5b56, // red
    0xe46612, // orange
    0xc38b0a, // amber
    0x28a046, // green
    0x169b97, // teal
    0x458cea, // blue
    0xa573e6, // violet
    0xe457a6, // pink
  ],
};

/**
 * The inks that tell fuzzballs apart where several show at once, eight in
 * each mode, so each stands out in a color of its own against the field and
 * the bar, in every palette: coral, orange, gold, green, teal, blue, violet
 * and pink.
 *
 * The light ones are mid-tones, dark enough for a light field and light
 * enough for the fuzzball's eyes to keep 3:1 against each.
 */
export const FUZZBALL_INKS: ModeInks = {
  light: [
    0xd33f37, // coral
    0xc05a0c, // orange
    0x957000, // gold
    0x2c8a3a, // green
    0x0f8378, // teal
    0x2c72d6, // blue
    0x8b55dc, // violet
    0xc83a8e, // pink
  ],
  dark: [
    0xff7b70, // coral
    0xff9b45, // orange
    0xf2cb45, // gold
    0x72d36a, // green
    0x3fd2c2, // teal
    0x72adff, // blue
    0xb892ff, // violet
    0xff7dc3, // pink
  ],
};
