import { Component, computed, input } from "@angular/core";
import { helpEntries } from "@fz/game-ui/help_catalog";
import type { Wall } from "../../rules/wall";
import { kindsIn } from "./waiting";

/** Describes a kind of brick in a few words: its name, and what it does. */
export interface KindWords {
  readonly name: string;
  readonly about: string;
}

/**
 * Shows In this wall, the panel right of a wide room's field: each kind of
 * brick the wall holds, its picture once the scene has drawn it, its name
 * and what it does, as How to play lists every kind; and under them
 * what the game projects into it, its own lines.
 *
 * It is a region named by its heading, and takes no pointer, so a press
 * can start over it. The board lays it over its room with
 * `cssRectStyle()`. The pictures are hidden from assistive technology, as
 * the words beside them say what they show.
 */
@Component({
  selector: "fz-in-this-wall",
  host: { role: "region", "aria-labelledby": "fz-in-this-wall-title" },
  templateUrl: "./in_this_wall.component.html",
  styleUrl: "./in_this_wall.component.scss",
})
export class InThisWallComponent<K extends string> {
  /** The level's wall, as the round in play started. */
  readonly wall = input.required<Wall<K>>();

  /** Every kind of brick the game has, in How to play's order. */
  readonly kinds = input.required<readonly K[]>();

  /** Returns a kind's name and what it does. */
  readonly kindOf = input.required<(kind: K) => KindWords>();

  /** The pictures of every kind of brick, the same How to play shows, or null before the scene has drawn. */
  readonly pictures = input<Readonly<Record<K, string>> | null>(null);

  /** Each kind of brick the wall holds, with its name, its words and its picture, or null for none yet. */
  protected readonly entries = computed(() =>
    helpEntries(
      kindsIn(this.wall(), this.kinds()),
      this.kindOf(),
      this.pictures() ?? undefined,
    ),
  );
}
