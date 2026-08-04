import { TableLayoutSpec, tableLayout } from "@/engine/render/layout/table_layout";
import { FortyThievesVariant } from "./forty_thieves_rules";
import {
  boardColumnCount,
  fortyThievesZoneSpecs,
} from "./forty_thieves_zones";

/**
 * The board a variant lies on.
 *
 * Stock and waste at the left of the top row, eight foundations filling the rest
 * of it, and the columns beneath. The width is whichever is greater: the number
 * of columns, or the ten slots the top row needs. Forty Thieves and Josephine
 * come out at exactly ten and waste nothing; Maria's nine columns sit centred
 * under a ten-wide top row; Limited's twelve make the board wider than the top
 * row needs.
 *
 * The slots are read from the zones rather than restated, so a pile cannot be
 * declared in one place and positioned in another.
 *
 * Memoized per variant, because a layout is a value rather than a computation
 * and the board factory asks for one every time a scene is built.
 *
 * @param variant Which of the family is being laid out.
 */
export function fortyThievesLayout(
  variant: FortyThievesVariant,
): TableLayoutSpec {
  let layout = layoutByVariant.get(variant);
  if (!layout) {
    layout = buildLayout(variant);
    layoutByVariant.set(variant, layout);
  }
  return layout;
}

const layoutByVariant = new Map<FortyThievesVariant, TableLayoutSpec>();

function buildLayout(variant: FortyThievesVariant): TableLayoutSpec {
  return tableLayout({
    columns: boardColumnCount(variant),
    rows: 2,
    slots: fortyThievesZoneSpecs(variant).map((zone) => zone.slot),
    // Columns run deep: a hundred and four cards against ten columns or fewer,
    // with a strict same-suit build in three of the five, means a lot of cards
    // land back on the tableau before they leave it. Fourteen deep at a 45-unit
    // gap reaches about 1364 from the top of the board, and at ten columns or
    // wider width binds the scale up to about 1415 — so this is free.
    designHeightPx: 1400,
  });
}

/** The board Forty Thieves, Josephine and Rank and File share: ten columns. */
export const FORTY_THIEVES_LAYOUT = fortyThievesLayout(
  FortyThievesVariant.FORTY_THIEVES,
);

/** Maria's board: nine columns centred under a ten-wide top row. */
export const MARIA_LAYOUT = fortyThievesLayout(FortyThievesVariant.MARIA);

/** Limited's board: twelve columns, the widest in the family. */
export const LIMITED_LAYOUT = fortyThievesLayout(FortyThievesVariant.LIMITED);
