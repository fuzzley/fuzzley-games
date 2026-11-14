// The sliders: trains of bricks that step a cell along their rows together,
// on the field's beat, and turn at a wall or a brick.

import { BRICK_KIND_IDS, type BrickKindId, hasTrait } from "../catalog/bricks";
import type { Field } from "../field/field";
import { CELLS, cellIndex, cellMiddleX, cellMiddleY, columnOf } from "../grid";
import { isBallInCell } from "../paddle/balls";
import { stepsIn } from "../stepper";
import { COLUMNS, ROWS, SLIDER_BEAT_MS } from "../tuning";
import type { Brick } from "./bricks";

/** The field's beat, in steps: the sliders step on every step it divides. */
const BEAT = stepsIn(SLIDER_BEAT_MS);

/** The sliders' kinds, read at every cell on the beat, so a step makes nothing. */
const SLIDERS: ReadonlySet<BrickKindId> = new Set(
  BRICK_KIND_IDS.filter((id) => hasTrait(id, "slides")),
);

// Made once and reused, so a step makes nothing: the trains found on a beat,
// each by the cells of its ends, the leftmost first.
const firsts: number[] = Array.from({ length: CELLS }, () => 0);
const lasts: number[] = Array.from({ length: CELLS }, () => 0);

/** Returns whether a brick is a slider. */
function isSlider(brick: Readonly<Brick>): boolean {
  return SLIDERS.has(brick.kind);
}

/**
 * Steps every train of sliders on the field's beat: the unbroken sliders of
 * a row that touch and head the same way, found as the beat comes, each a
 * cell its way, row by row from the top, each row from the left.
 *
 * A train whose lead's next cell is a wall or an unbroken brick turns and
 * stays; one with a ball in that cell waits, whole; any other steps into
 * it, and the brick broken there, if any, takes the cell the train left.
 * Each slider that steps records `slid` at its new cell.
 */
export function stepSliders(field: Field): void {
  if (field.steps % BEAT !== 0) return;
  let trains = 0;
  for (let row = 0; row < ROWS; row++) {
    let column = 0;
    while (column < COLUMNS) {
      const first = sliderAt(field, column, row);
      if (!first) {
        column++;
        continue;
      }
      let last = column;
      while (sliderAt(field, last + 1, row)?.heading === first.heading) last++;
      firsts[trains] = cellIndex(column, row);
      lasts[trains] = cellIndex(last, row);
      trains++;
      column = last + 1;
    }
  }
  for (let train = 0; train < trains; train++) {
    stepTrain(field, firsts[train] ?? 0, lasts[train] ?? 0);
  }
}

/**
 * Puts each brick of a field in the cell it says it stands in, as a field
 * taken up from storage lays them where the level drew them first.
 */
export function placeBricks(field: Field): void {
  const cells = cellsOf(field);
  const bricks = cells.filter((brick) => brick !== null);
  cells.fill(null);
  for (const brick of bricks) cells[brick.cell] = brick;
}

/** Returns the unbroken slider in a cell of a row, or null for none or past its end. */
function sliderAt(field: Field, column: number, row: number): Brick | null {
  if (column >= COLUMNS) return null;
  const brick = field.bricks[cellIndex(column, row)];
  return brick && !brick.broken && isSlider(brick) ? brick : null;
}

/** Steps a train of sliders, from its leftmost cell to its rightmost, its way, or turns it, or leaves it waiting. */
function stepTrain(field: Field, first: number, last: number): void {
  const cells = cellsOf(field);
  const heading = cells[first]?.heading ?? 0;
  const lead = heading > 0 ? last : first;
  const column = columnOf(lead) + heading;
  const next = lead + heading;
  const there = column >= 0 && column < COLUMNS ? cells[next] : undefined;
  if (there === undefined || (there && !there.broken)) {
    for (let cell = first; cell <= last; cell++) {
      const brick = cells[cell];
      if (brick) brick.heading = -heading;
    }
    return;
  }
  if (isBallInCell(field.balls, next)) return;
  const tail = heading > 0 ? first : last;
  for (let cell = lead; cell !== tail - heading; cell -= heading) {
    const slider = cells[cell] ?? null;
    put(cells, cell + heading, slider);
    field.events.add(
      "slid",
      cellMiddleX(cell + heading),
      cellMiddleY(cell + heading),
      cell + heading,
      null,
      0,
      heading,
    );
  }
  put(cells, tail, there);
}

/** Puts a brick, or none, in a cell, where it says it stands. */
function put(cells: (Brick | null)[], cell: number, brick: Brick | null): void {
  cells[cell] = brick;
  if (brick) brick.cell = cell;
}

/**
 * Returns the field's bricks as a list the sliders may change: the field
 * holds them read-only to everything else, as only a slider moves a brick.
 */
function cellsOf(field: Field): (Brick | null)[] {
  return field.bricks as (Brick | null)[];
}
