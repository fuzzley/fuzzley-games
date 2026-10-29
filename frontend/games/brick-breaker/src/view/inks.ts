// The game's own colors are written here rather than in a stylesheet, as
// Minesweeper's and Sudoku's inks are, because only the canvas draws them.

/**
 * The tints a brick takes in a light palette, by its tint, 0 to 7, each
 * dark enough to keep 3:1 against a light palette's field.
 */
export const LIGHT_INKS: readonly number[] = [
  0xd4322d, // red
  0xb9530f, // orange
  0x936908, // amber
  0x29803f, // green
  0x167e7b, // teal
  0x256fd1, // blue
  0x8b55d2, // violet
  0xcb3087, // pink
];

/**
 * The tints a brick takes in a dark palette, by its tint, 0 to 7, each light
 * enough to keep 3:1 against a dark palette's field.
 */
export const DARK_INKS: readonly number[] = [
  0xec5b56, // red
  0xe46612, // orange
  0xc38b0a, // amber
  0x28a046, // green
  0x169b97, // teal
  0x458cea, // blue
  0xa573e6, // violet
  0xe457a6, // pink
];
