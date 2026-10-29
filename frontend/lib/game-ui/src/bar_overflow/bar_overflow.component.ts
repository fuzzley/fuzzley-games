import { Component, computed, inject, input, output } from "@angular/core";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@angular/aria/menu";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { GameBarComponent } from "../game_bar";
import { type MenuSide, menuSide } from "../game_bar/menu_side";

/** Describes what every entry in a bar's overflow menu shows. */
interface BarOverflowEntry {
  readonly label: string;
  readonly icon: IconName;
  /** Whether a rule sets the item apart from the ones before it. */
  readonly startsGroup?: boolean;
}

/** Describes an entry that does something in the app when it is chosen. */
export interface BarOverflowAction<
  Id extends string = string,
> extends BarOverflowEntry {
  /** What `choose` emits when the item is chosen. */
  readonly id: Id;
  readonly href?: undefined;
}

/** Describes an entry that leads elsewhere, which the browser follows. */
export interface BarOverflowLink extends BarOverflowEntry {
  readonly id: string;
  readonly href: string;
}

/**
 * Describes one entry in a bar's overflow menu: an action, whose id is one
 * of `Id`, or a link.
 */
export type BarOverflowItem<Id extends string = string> =
  BarOverflowAction<Id> | BarOverflowLink;

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
export class BarOverflowComponent<Id extends string = string> {
  private readonly bar = inject(GameBarComponent, { optional: true });

  /** What the menu offers, in order. */
  readonly items = input.required<readonly BarOverflowItem<Id>[]>();

  /** The button's name, and the menu's. */
  readonly label = input("More actions");

  /** Emits the id of the action chosen. */
  readonly choose = output<Id>();

  protected readonly side = computed<MenuSide>(() =>
    menuSide(this.bar?.placement() ?? "top"),
  );

  /** Whether the menu lines up with its button's start, in a reversed bar. */
  protected readonly alignsStart = computed(
    () =>
      (this.bar?.reversed() ?? false) &&
      (this.side() === "below" || this.side() === "above"),
  );

  protected select(id: string | undefined): void {
    const item = this.items().find((each) => each.id === id);
    if (item && item.href === undefined) this.choose.emit(item.id);
  }

  protected dismiss(trigger: MenuTrigger<string>): void {
    trigger.close();
    trigger.element.focus();
  }
}
