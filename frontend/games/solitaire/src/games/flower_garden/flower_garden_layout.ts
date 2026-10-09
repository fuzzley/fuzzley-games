import { boardLayout } from "../common/board_layout";
import {
  arrangedLayouts,
  pileIdsInRow,
  pilesInRow,
} from "../common/arranged_layouts";
import { foundationPileId } from "../common/pile_ids";
import {
  BED_COUNT,
  BOARD_COLUMN_COUNT,
  BOUQUET_SIZE,
  bouquetPileId,
  flowerGardenZoneSpecs,
} from "./flower_garden_zones";

/** The zones the grids are read from. */
const ZONES = flowerGardenZoneSpecs();

/** The bouquet's cards, left to right as a larger screen fans them. */
const BOUQUET = Array.from({ length: BOUQUET_SIZE }, (_, index) =>
  bouquetPileId(index),
);

/** The foundations, left to right. */
const FOUNDATIONS = Array.from({ length: 4 }, (_, index) =>
  foundationPileId(index),
);

/**
 * How many grid columns an upright phone fans the bouquet across: the whole
 * width of the beds, which leaves each card a third of a column in view.
 */
const UPRIGHT_BOUQUET_SPAN = BED_COUNT - 1;

/**
 * The Flower Garden board: the bouquet fanned across the top left, the
 * foundations at the top right, and six beds centred beneath.
 */
export const FLOWER_GARDEN_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: ZONES,
  // Beds take the whole bouquet between them, so one can grow well past its
  // six cards; a fifteen-card bed ends about 1377 from the top of the board.
  designHeightPx: 1377,
});

/**
 * The Flower Garden board in every arrangement. The bouquet and foundations go
 * above the beds or along the bottom; an upright phone, as wide as the beds,
 * takes them in two lines, the foundations centred next to the beds and the
 * bouquet fanned across the whole width on the edge. On a phone on its side,
 * the bouquet's cards stack down both rails, each showing its index, with the
 * foundations under the second half, so neither rail is taller than the beds.
 *
 * It has no side pile: a mirror would turn the bouquet's fan around, leaving
 * each card's right edge in view rather than the corner its rank is printed
 * in.
 */
export const FLOWER_GARDEN_ARRANGED_LAYOUTS = arrangedLayouts({
  roomy: FLOWER_GARDEN_LAYOUT,
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  uprightLines: [
    FOUNDATIONS.map((pileId, index) => ({
      pileId,
      column: (BED_COUNT - FOUNDATIONS.length) / 2 + index,
    })),
    BOUQUET.map((pileId, index) => ({
      pileId,
      column: (index * UPRIGHT_BOUQUET_SPAN) / (BOUQUET_SIZE - 1),
    })),
  ],
  rails: {
    left: BOUQUET.slice(0, BOUQUET_SIZE / 2).map((pileId) => ({
      pileId,
      overlapped: true,
    })),
    right: [...BOUQUET.slice(BOUQUET_SIZE / 2), ...FOUNDATIONS].map(
      (pileId) => ({ pileId, overlapped: true }),
    ),
  },
  // A fifteen-card bed. The grid with the piles below needs no more height
  // than the grid above has.
  longestColumn: { faceDown: 0, faceUp: 15 },
});
