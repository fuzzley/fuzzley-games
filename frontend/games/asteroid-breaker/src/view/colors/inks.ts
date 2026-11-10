import type { RockKindId } from "../../rules/catalog/rocks";

// Unlike Minesweeper's and Sudoku's inks, which live in a stylesheet, the
// game's own colors are written here, because only the canvas draws them.

/** Describes the inks a palette's mode gives the rocks. */
export interface RockInks {
  /** Each kind's ink: its body's, but a crystal's, which is its gem's. */
  readonly kinds: Readonly<Record<RockKindId, number>>;
  /** The glow at a volatile rock's middle. */
  readonly core: number;
}

/** The rocks' inks in a light palette, each kind's body dark enough to keep 3:1 against a light palette's field. */
export const LIGHT_ROCK_INKS: RockInks = {
  kinds: {
    stone: 0x8b7f70,
    ice: 0x3f88ad,
    crystal: 0x7a4fd0,
    iron: 0x4d5866,
    volatile: 0xc4452c,
    lodestone: 0x9a3456,
    boulder: 0x6e6255,
  },
  core: 0xffd27a,
};

/** The rocks' inks in a dark palette, each kind's body light enough to keep 3:1 against a dark palette's field. */
export const DARK_ROCK_INKS: RockInks = {
  kinds: {
    stone: 0xa99d8e,
    ice: 0x86cdee,
    crystal: 0xb99cff,
    iron: 0x8e9cab,
    volatile: 0xf0886a,
    lodestone: 0xe57d9c,
    boulder: 0xc4b6a3,
  },
  core: 0xffe6a8,
};
