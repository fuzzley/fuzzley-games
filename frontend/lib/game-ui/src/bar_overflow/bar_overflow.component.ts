import { Component, computed, inject, input, output } from "@angular/core";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@angular/aria/menu";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { GameBarComponent } from "../game_bar";

/** Describes one entry in a bar's overflow menu. */
export interface BarOverflowItem {
  /** What `choose` emits when the item is chosen. */
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  /** Where the item leads, making it a link, which is followed, not emitted. */
  readonly href?: string;
  /** Whether a rule sets the item apart from the ones before it. */
  readonly startsGroup?: boolean;
}

/** Names the side of its button the menu opens on. */
type Side = "below" | "above" | "after" | "before";

/**
 * Shows a "More actions" button that opens a menu of what a game bar has no
 * room for.
 *
 * Angular Aria's menu supplies the keyboard, the roles, and focus going back
 * to the button. The items come as data, since Angular Aria finds a menu's
 * items in the template that declares the menu. Inside a `fz-game-bar` the
 * menu opens away from the edge the bar stands against.
 */
@Component({
  selector: "fz-bar-overflow",
  imports: [IconComponent, Menu, MenuContent, MenuItem, MenuTrigger],
  templateUrl: "./bar_overflow.component.html",
  styleUrl: "./bar_overflow.component.scss",
})
export class BarOverflowComponent {
  private readonly bar = inject(GameBarComponent, { optional: true });

  /** What the menu offers, in order. */
  readonly items = input.required<readonly BarOverflowItem[]>();

  /** The button's name, and the menu's. */
  readonly label = input("More actions");

  /** Emits the id of the action chosen. */
  readonly choose = output<string>();

  protected readonly side = computed<Side>(() => {
    switch (this.bar?.placement() ?? "top") {
      case "top":
        return "below";
      case "bottom":
        return "above";
      case "start":
        return "after";
      case "end":
        return "before";
    }
  });

  /** Whether the menu lines up with its button's start, in a reversed bar. */
  protected readonly alignsStart = computed(
    () =>
      (this.bar?.reversed() ?? false) &&
      (this.side() === "below" || this.side() === "above"),
  );

  protected select(id: string | undefined): void {
    const item = this.items().find((each) => each.id === id);
    if (item && !item.href) this.choose.emit(item.id);
  }

  protected dismiss(trigger: MenuTrigger<string>): void {
    trigger.close();
    trigger.element.focus();
  }
}
