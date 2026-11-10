import { Component, computed, input } from "@angular/core";

/** The icons the library draws, by name. */
export const ICON_NAMES = [
  "apple",
  "asteroid",
  "back",
  "bricks",
  "bug",
  "bulb",
  "chevron",
  "close",
  "eraser",
  "external",
  "fast-forward",
  "flag",
  "grid",
  "heart",
  "help",
  "home",
  "link",
  "mine",
  "more",
  "pause",
  "pencil",
  "play",
  "players",
  "plus",
  "restart",
  "search",
  "settings",
  "skip",
  "sound",
  "sound-off",
  "star",
  "tick",
  "time",
  "trophy",
  "undo",
  "warning",
] as const;

/** Names an icon the library draws. */
export type IconName = (typeof ICON_NAMES)[number];

/**
 * The icons drawn filled; the rest are outlines. Minesweeper's flag, mine and
 * heart are among them, since they sit small on a square, where an outline
 * thins away; so is the star, small in a row as the hearts are; and so are
 * pause, fast-forward and skip, beside play.
 */
const FILLED: ReadonlySet<IconName> = new Set([
  "fast-forward",
  "flag",
  "heart",
  "mine",
  "more",
  "pause",
  "play",
  "skip",
  "star",
]);

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
