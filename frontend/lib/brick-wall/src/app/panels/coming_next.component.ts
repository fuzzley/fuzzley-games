import { Component, computed, input } from "@angular/core";
import type { Brick, Wall } from "../../rules/wall";
import { waitingRows } from "./waiting";

/** Describes the level in play as Coming next names it: by its number and its name. */
export interface PanelLevel {
  readonly number: number;
  readonly data: { readonly name: string };
}

/**
 * Shows Coming next, the panel left of a wide room's field: the level's
 * number and name; the rows waiting over the ceiling, small squares in
 * each brick's ink, the next to come in lowest, as many as fit; how many
 * are left; and what the jump does, each in the game's words.
 *
 * It is a region named by its heading, and takes no pointer, so a press
 * can start over it. The board lays it over its room with
 * `cssRectStyle()`; the squares are hidden from assistive technology, as
 * the sentence beside them says what they show.
 */
@Component({
  selector: "fz-coming-next",
  host: { role: "region", "aria-labelledby": "fz-coming-next-title" },
  templateUrl: "./coming_next.component.html",
  styleUrl: "./coming_next.component.scss",
})
export class ComingNextComponent<K extends string> {
  /** The level in play. */
  readonly level = input.required<PanelLevel>();

  /** The level's wall, as the round in play started. */
  readonly wall = input.required<Wall<K>>();

  /** The field's depth, as the round in play started. */
  readonly depth = input.required<number>();

  /** Returns the ink a brick is drawn in on the field, as CSS, which its square takes. */
  readonly inkOf = input.required<(brick: Brick<K>) => string>();

  /** How many rows wait over the ceiling, in the words the lintel says it in. */
  readonly waiting = input.required<string>();

  /** What the level's jump does, in the game's words. */
  readonly jump = input.required<string>();

  /** The level's number and name, as the panel names it under its heading. */
  protected readonly title = computed(
    () => `Level ${String(this.level().number)}: ${this.level().data.name}`,
  );

  /**
   * The rows waiting over the ceiling, the furthest first: each brick's ink
   * as CSS, or null where there is none.
   */
  protected readonly rows = computed(() => {
    const inkOf = this.inkOf();
    return waitingRows(this.wall(), this.depth()).map((row) =>
      row.map((brick) => (brick === null ? null : inkOf(brick))),
    );
  });
}
