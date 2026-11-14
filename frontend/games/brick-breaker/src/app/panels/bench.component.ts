import { Component, computed, input } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { cssHex } from "@fz/phaser/color";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { createBrick } from "../../rules/bricks/bricks";
import { brickKind } from "../../rules/catalog/bricks";
import { columnOf, rowOf } from "../../rules/grid";
import { type LevelEntry, parseLevel } from "../../rules/levels/levels";
import {
  BRICK_HEIGHT,
  BRICK_WIDTH,
  FIELD_WIDTH,
  MAX_LIVES,
  ROWS,
} from "../../rules/tuning";
import { brickColor } from "../../view/art/brick_art";
import type { BricksPalette } from "../../view/colors/palette";
import { kindsIn, placeInSet } from "./panels";

/** How far in from its cell the next level's picture draws a brick, on each side, in field units. */
const CELL_INSET = 0.08;

/** How strongly the next level's picture draws a brick hidden as the level starts, a ghost. */
const HIDDEN_OPACITY = 0.4;

/**
 * Shows the bench, the panel left of a wide room's field: the level's
 * number, set and name, over a pip for each level of its set, those played
 * before it lit; the lives that wait, each a fuzzball on a plank, and the
 * score the next comes at; and the level after this one, its bricks drawn
 * in their tints, its name and its kinds.
 *
 * It is a region named by its heading, which only a screen reader hears,
 * and takes no pointer, so a press can start over it. The board lays it
 * over its room with `cssRectStyle()`. Each part is one element under the
 * heading, so a panel under 400 px tall keeps the first two
 * (`board-panel($compact: true)`). The pips are one picture, named by
 * where the level stands in its set; the fuzzballs and the next level's
 * picture are hidden from assistive technology, as the words beside them
 * say what they show.
 */
@Component({
  selector: "app-bench",
  imports: [FuzzballComponent],
  host: { role: "region", "aria-labelledby": "bench-title" },
  templateUrl: "./bench.component.html",
  styleUrl: "./bench.component.scss",
})
export class BenchComponent {
  /** The level in play. */
  readonly level = input.required<LevelEntry>();

  /** The lives that wait for the one in play to be lost. */
  readonly livesWaiting = input.required<number>();

  /** The score the next life comes at, or null while the run holds the most it may. */
  readonly nextLifeAt = input.required<number | null>();

  /** The level after the one in play, or null after the last. */
  readonly levelAfter = input.required<LevelEntry | null>();

  /** The palette the field is drawn in, whose tints the next level's bricks take. */
  readonly palette = input.required<BricksPalette>();

  /** The level's number and its set, and its name, as the panel's first part heads it. */
  protected readonly heading = computed(() => {
    const { number, set, data } = this.level();
    return { where: `Level ${String(number)} · ${set.name}`, name: data.name };
  });

  /**
   * How far through its set the level is: a pip for each of the set's
   * levels, done, here or to come, and the same in words.
   */
  protected readonly place = computed(() => {
    const { at, of } = placeInSet(this.level());
    return {
      words: `${String(at)} of ${String(of)} in ${this.level().set.name}`,
      pips: Array.from({ length: of }, (_, i) =>
        i + 1 < at ? "done" : i + 1 === at ? "here" : "to-come",
      ),
    };
  });

  /** A place on the plank for each life waiting. */
  protected readonly lives = computed(() =>
    Array.from({ length: this.livesWaiting() }, (_, i) => i),
  );

  /** How many lives wait, in words. */
  protected readonly waiting = computed(() => {
    const waiting = this.livesWaiting();
    return waiting === 0 ? "None waiting" : `${String(waiting)} waiting`;
  });

  /** The score the next life comes at, in words, or that the run holds the most. */
  protected readonly nextLife = computed(() => {
    const at = this.nextLifeAt();
    return at === null
      ? `${String(MAX_LIVES)} lives at most`
      : `A life at ${formatPoints(at)}`;
  });

  /**
   * The level after this one: its number, its name, its kinds' names, and
   * its bricks as rectangles in their colors, across the field's width
   * and the grid's rows, a ghost faint; or null after the last.
   */
  protected readonly after = computed(() => {
    const entry = this.levelAfter();
    if (!entry) return null;
    const level = parseLevel(entry);
    const palette = this.palette();
    return {
      title: `Level ${String(entry.number)}`,
      name: entry.data.name,
      kinds: kindsIn(level).map((id) => brickKind(id).name),
      viewBox: `0 0 ${String(FIELD_WIDTH)} ${String(ROWS * BRICK_HEIGHT)}`,
      bricks: level.cells.flatMap((placed, cell) => {
        if (!placed) return [];
        const brick = createBrick(placed, cell);
        return [
          {
            x: columnOf(cell) * BRICK_WIDTH + CELL_INSET,
            y: rowOf(cell) * BRICK_HEIGHT + CELL_INSET,
            width: BRICK_WIDTH - 2 * CELL_INSET,
            height: BRICK_HEIGHT - 2 * CELL_INSET,
            color: cssHex(brickColor(brick, palette)),
            opacity: brick.shown ? null : HIDDEN_OPACITY,
          },
        ];
      }),
    };
  });
}
