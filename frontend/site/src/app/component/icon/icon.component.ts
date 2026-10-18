import { Component, computed, input } from "@angular/core";

/** The icons the site draws. */
export type IconName = "play" | "players" | "time" | "search" | "tick";

/** The icons drawn filled; the rest are outlines. */
const FILLED: ReadonlySet<IconName> = new Set(["play"]);

/**
 * Draws a small decorative icon in the text's color.
 *
 * Its size comes from the element (`width` and `height` on `app-icon`), and an
 * outline's weight from `--icon-stroke`. It is hidden from assistive
 * technology: whatever it sits beside has to say what it means.
 */
@Component({
  selector: "app-icon",
  templateUrl: "./icon.component.html",
  styleUrl: "./icon.component.scss",
  host: { "aria-hidden": "true" },
})
export class IconComponent {
  /** The icon to draw. */
  readonly name = input.required<IconName>();

  protected readonly filled = computed(() => FILLED.has(this.name()));
}
