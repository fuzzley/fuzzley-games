import { Component, computed, input } from "@angular/core";

/** The icons the library draws, by name. */
export const ICON_NAMES = [
  "back",
  "bug",
  "chevron",
  "close",
  "external",
  "grid",
  "help",
  "home",
  "link",
  "more",
  "play",
  "players",
  "plus",
  "restart",
  "search",
  "settings",
  "tick",
  "time",
  "trophy",
  "undo",
  "warning",
] as const;

/** Names an icon the library draws. */
export type IconName = (typeof ICON_NAMES)[number];

/** The icons drawn filled; the rest are outlines. */
const FILLED: ReadonlySet<IconName> = new Set(["more", "play"]);

/**
 * Draws a small decorative icon in the text's color.
 *
 * Its size comes from `width` and `height` on `fz-icon`, or from
 * `--fz-icon-size`, which an icon inherits; an outline's weight comes from
 * `--fz-icon-stroke`. It is hidden from assistive
 * technology: whatever it sits beside has to say what it means.
 */
@Component({
  selector: "fz-icon",
  templateUrl: "./icon.component.html",
  styleUrl: "./icon.component.scss",
  host: { "aria-hidden": "true" },
})
export class IconComponent {
  /** The icon to draw. */
  readonly name = input.required<IconName>();

  protected readonly filled = computed(() => FILLED.has(this.name()));
}
