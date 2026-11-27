// The inks the board's pieces are drawn in, the same in every palette of a
// mode, as no palette's role gives them: each kind's, from the house's
// fuzzball inks, and a special's second fur; a brick's cushions, a cage's
// steel, a burr's thorns and the sleepyhead. Each keeps 3:1 against what
// it lies on in every palette of its mode, the squares, dust and thick
// dust, or for a cage's bars every kind they cross, so several stand
// further off the board than the design's art, its colors sampled from
// pictures, drew them.

import { itemAt, recordOf } from "@fz/core/records";
import { FUZZBALL_INKS, colorNumber, mixColors } from "@fz/phaser/color";
import { FUZZBALL } from "@fz/style/fuzzball";
import type { ColorMode } from "@fz/style/themes";
import type { BrickLayers } from "../../rules/catalog/elements";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";

/** Describes a cage's steel. */
export interface CageInks {
  /** Its 4 bars, across its fuzzball. */
  readonly bars: number;
  /** Its frame, round its square. */
  readonly frame: number;
}

/** Describes the sleepyhead's gray-blue. */
export interface SleepyheadInks {
  readonly body: number;
  /** Its nightcap, a shade darker. */
  readonly nightcap: number;
}

/** Describes the inks the elements are drawn in, in one mode. */
interface ElementInks {
  /**
   * A brick's cushions by their place in its pile, from the bottom, which
   * is a pile's count of layers where it lies on top: oat at the bottom to
   * taupe on top of 4, in even steps of lightness, so a darker top tells a
   * thicker brick to every kind of sight.
   */
  readonly cushions: Readonly<Record<BrickLayers, number>>;
  readonly cage: CageInks;
  /** A burr's ring of thorns. */
  readonly burr: number;
  readonly sleepyhead: SleepyheadInks;
}

/** Describes the inks the board's pieces are drawn in, in one mode. */
export interface PieceInks extends ElementInks {
  /** Each kind's ink. */
  readonly kinds: Readonly<Record<KindId, number>>;
  /**
   * The second fur a special of each kind wears behind its own: its ink
   * mixed toward white in a dark palette and toward black in a light one,
   * as `SECOND_FUR` says, so it stands off its kind and the square alike.
   */
  readonly secondFurs: Readonly<Record<KindId, number>>;
}

/**
 * Each kind's place among `FUZZBALL_INKS`, whose inks there are named in
 * the library's comments: blue, coral for the red kind, gold for amber,
 * green, violet and pink.
 */
const KIND_INK_PLACES = {
  blue: 5,
  red: 0,
  amber: 2,
  green: 3,
  violet: 6,
  pink: 7,
} as const satisfies Readonly<Record<KindId, number>>;

/**
 * What a special's second fur is mixed from its kind's ink toward, and how
 * far, in each mode: in a light palette, far enough toward black that every
 * kind keeps 3:1 against its fur; in a dark one, where no fur could keep
 * 3:1 against the kinds' light inks, half way to white, as the design's art
 * mixes it.
 */
const SECOND_FUR: Readonly<
  Record<ColorMode, { readonly toward: number; readonly share: number }>
> = {
  light: { toward: 0x000000, share: 0.64 },
  dark: { toward: 0xffffff, share: 0.5 },
};

/**
 * A cage's bars: the eyes' ink, the same in every palette, since both lie
 * on a fuzzball, which every kind's ink keeps 3:1 against.
 */
const CAGE_BARS = colorNumber(FUZZBALL.ink);

/** The elements' inks in each mode. */
const ELEMENT_INKS: Readonly<Record<ColorMode, ElementInks>> = {
  light: {
    cushions: { 1: 0x90704c, 2: 0x7c5b42, 3: 0x67483a, 4: 0x513531 },
    cage: { bars: CAGE_BARS, frame: 0x535a64 },
    burr: 0x7a5c22,
    sleepyhead: { body: 0x66738a, nightcap: 0x4b5566 },
  },
  dark: {
    cushions: { 1: 0xe2d0ad, 2: 0xccb39b, 3: 0xb59a8d, 4: 0x9d8481 },
    cage: { bars: CAGE_BARS, frame: 0xa4aebd },
    burr: 0xb8944f,
    sleepyhead: { body: 0x9fb0c9, nightcap: 0x8193ad },
  },
};

/** Returns the inks the board's pieces are drawn in, in a palette of a mode. */
export function pieceInks(mode: ColorMode): PieceInks {
  const kinds = recordOf(KIND_IDS, (kind) =>
    itemAt(FUZZBALL_INKS[mode], KIND_INK_PLACES[kind]),
  );
  const { toward, share } = SECOND_FUR[mode];
  return {
    kinds,
    secondFurs: recordOf(KIND_IDS, (kind) =>
      mixColors(toward, kinds[kind], share),
    ),
    ...ELEMENT_INKS[mode],
  };
}
