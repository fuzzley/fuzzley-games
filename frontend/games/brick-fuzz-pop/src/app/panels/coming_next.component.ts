import { Component, computed, input } from "@angular/core";
import { count } from "@fz/core/format";
import { cssHex } from "@fz/phaser/color";
import type { LevelEntry } from "../../rules/levels/levels";
import type { RoundStart } from "../../rules/round/round";
import { describeBoon } from "../../rules/run/describe";
import type { Boon } from "../../rules/shot";
import { brickColor } from "../../view/colors/brick_colors";
import type { WallPalette } from "../../view/colors/palette";
import { waitingRows } from "./panels";

/**
 * Shows Coming next, the panel left of a wide room's field: the level's
 * number and name; the rows waiting over the ceiling, small squares in
 * each brick's ink, the next to come in lowest, as many as fit; how many
 * are left; and the jump, in a sentence.
 *
 * It is a region named by its heading, and takes no pointer, so a press
 * can start over it. The board lays it over its room with
 * `cssRectStyle()`; the squares are hidden from assistive technology, as
 * the sentence beside them says what they show.
 */
@Component({
  selector: "app-coming-next",
  host: { role: "region", "aria-labelledby": "coming-next-title" },
  templateUrl: "./coming_next.component.html",
  styleUrl: "./coming_next.component.scss",
})
export class ComingNextComponent {
  /** The level in play. */
  readonly level = input.required<LevelEntry>();

  /** The boon the level's jumps earn. */
  readonly boon = input.required<Boon>();

  /** Where the round in play started: its wall and the field's depth. */
  readonly start = input.required<RoundStart>();

  /** The palette the field is drawn in, whose inks the squares take. */
  readonly palette = input.required<WallPalette>();

  /** The level's number and name, as the panel names it under its heading. */
  protected readonly title = computed(
    () => `Level ${String(this.level().number)}: ${this.level().data.name}`,
  );

  /**
   * The rows waiting over the ceiling, the furthest first: each brick's ink
   * as CSS, or null where there is none.
   */
  protected readonly rows = computed(() => {
    const { wall, depth } = this.start();
    const palette = this.palette();
    return waitingRows(wall, depth).map((row) =>
      row.map((brick) =>
        brick === null ? null : cssHex(brickColor(brick, palette)),
      ),
    );
  });

  /** How many rows wait over the ceiling, in a sentence. */
  protected readonly waiting = computed(() => {
    const waiting = this.rows().length;
    return waiting === 0
      ? "No rows wait over the ceiling."
      : `${count(waiting, "row waits", "rows wait")} over the ceiling.`;
  });

  /** What the level's jumps earn, in a sentence. */
  protected readonly jump = computed(() => describeBoon(this.boon()));
}
