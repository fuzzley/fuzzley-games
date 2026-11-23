import { Component, computed, input } from "@angular/core";
import { inkAt } from "@fz/brick-wall/view/inks";
import { count } from "@fz/core/format";
import { cssHex } from "@fz/phaser/color";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import type { Crew } from "../../rules/round/round";
import { boonName } from "../../rules/run/describe";
import type { Boon } from "../../rules/shot";
import type { WallPalette } from "../../view/colors/palette";

/**
 * Shows the game's own lines in In this wall, under the kinds of brick
 * (`@fz/brick-wall/app/panels`' `<fz-in-this-wall>`): the friends freed,
 * each a fuzzball in its ink, and the boon, a badge that lights while the
 * shot being aimed carries it.
 *
 * Its lines lie in the panel's own layout, as the panel's are. The
 * fuzzballs are hidden from assistive technology, as the words beside them
 * say what they show.
 */
@Component({
  selector: "app-crew-and-boon",
  imports: [FuzzballComponent],
  templateUrl: "./crew_and_boon.component.html",
  styleUrl: "./crew_and_boon.component.scss",
})
export class CrewAndBoonComponent {
  /** The boon the level's jumps earn. */
  readonly boon = input.required<Boon>();

  /** The friends freed, as the round in play started. */
  readonly crew = input.required<Crew>();

  /**
   * Whether the shot being aimed carries the boon, which lights the badge:
   * the board sets it while the player aims a shot a jump earned it for,
   * and clears it as that shot flies.
   */
  readonly lit = input(false);

  /** The palette the field is drawn in, whose inks the friends take. */
  readonly palette = input.required<WallPalette>();

  /** Each friend freed, in the order freed: its ink as CSS. */
  protected readonly friends = computed(() => {
    const { friends } = this.palette();
    return this.crew().friends.map((ink) => cssHex(inkAt(friends, ink)));
  });

  /** How many friends fly with the player's fuzzball, in a sentence, or null before one is freed. */
  protected readonly crewWords = computed(() => {
    const friends = this.friends().length;
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
