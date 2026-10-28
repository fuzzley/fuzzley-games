/**
 * Returns a color written in CSS hex, as `@fz/style`'s palettes write their
 * roles, as the number Phaser takes.
 *
 * It throws on any other way of writing a color, so a palette written
 * another way fails a spec rather than drawing black.
 */
export function colorNumber(css: string): number {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim())?.[1];
  if (digits === undefined) {
    throw new Error(`Not a color in hex: "${css}"`);
  }
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  return Number.parseInt(full, 16);
}

/**
 * Returns `top` mixed into `under` by `weight`, from 0 to 1, as CSS's
 * `color-mix(in srgb, top weight, under)` mixes them, which is also how `top`
 * at an opacity of `weight` looks laid over `under`.
 *
 * A canvas needs it for `@fz/style`'s washes, which mix the text color with
 * `transparent`, and which `getComputedStyle()` leaves unresolved.
 */
export function mixColors(top: number, under: number, weight: number): number {
  const channel = (shift: number): number => {
    const above = (top >> shift) & 0xff;
    const below = (under >> shift) & 0xff;
    return Math.round(above * weight + below * (1 - weight));
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
