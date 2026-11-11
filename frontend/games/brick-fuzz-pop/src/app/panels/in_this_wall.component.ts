import { Component, computed, input } from "@angular/core";
import { count } from "@fz/core/format";
import { cssHex } from "@fz/phaser/color";
import { helpEntries } from "@fz/game-ui/help_catalog";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { brickKind } from "../../rules/catalog/bricks";
import type { RoundStart } from "../../rules/round/round";
import { boonName } from "../../rules/run/describe";
import type { Boon } from "../../rules/shot";
import type { WallPalette } from "../../view/colors/palette";
import { inkAt } from "../../view/colors/inks";
import type { HelpPictures } from "../help/help.component";
import { kindsIn } from "./panels";

/**
 * Shows In this wall, the panel right of a wide room's field: each kind of
 * brick the wall holds, its picture once the scene has drawn it, its name
 * and what it does, as How to play lists every kind; the friends freed,
 * each a fuzzball in its ink; and the boon, a badge that lights while the
 * shot being aimed carries it.
 *
 * It is a region named by its heading, and takes no pointer, so a pull
 * back can start over it. The board lays it over its room with
 * `cssRectStyle()`. The pictures and the fuzzballs are hidden from
 * assistive technology, as the words beside them say what they show.
 */
@Component({
  selector: "app-in-this-wall",
  imports: [FuzzballComponent],
  host: { role: "region", "aria-labelledby": "in-this-wall-title" },
  templateUrl: "./in_this_wall.component.html",
  styleUrl: "./in_this_wall.component.scss",
})
export class InThisWallComponent {
  /** The boon the level's jumps earn. */
  readonly boon = input.required<Boon>();

  /** Where the round in play started: its wall and its crew. */
  readonly start = input.required<RoundStart>();

  /**
   * Whether the shot being aimed carries the boon, which lights the badge:
   * the board sets it while the player aims a shot a jump earned it for,
   * and clears it as that shot flies.
   */
  readonly lit = input(false);

  /** The palette the field is drawn in, whose inks the friends take. */
  readonly palette = input.required<WallPalette>();

  /** The pictures of every kind of brick, the same How to play shows, or null before the scene has drawn. */
  readonly pictures = input<HelpPictures | null>(null);

  /** Each kind of brick the wall holds, with its name, its words and its picture, or null for none yet. */
  protected readonly kinds = computed(() =>
    helpEntries(kindsIn(this.start().wall), brickKind, this.pictures()?.bricks),
  );

  /** Each friend freed, in the order freed: its ink as CSS. */
  protected readonly crew = computed(() => {
    const { friends } = this.palette();
    return this.start().crew.friends.map((ink) => cssHex(inkAt(friends, ink)));
  });

  /** How many friends fly with the player's fuzzball, in a sentence, or null before one is freed. */
  protected readonly crewWords = computed(() => {
    const friends = this.crew().length;
    return friends === 0
      ? null
      : `${count(friends, "friend flies", "friends fly")} with you.`;
  });

  /** What the badge says: that the shot being aimed carries the level's boon, or that a jump earns it. */
  protected readonly badge = computed(() => {
    const boon = boonName(this.boon());
    return this.lit() ? `Next shot: ${boon}` : `A jump earns a ${boon}`;
  });
}
