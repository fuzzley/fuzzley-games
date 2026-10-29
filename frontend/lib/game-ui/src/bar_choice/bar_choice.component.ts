import { Component, computed, inject, input, output } from "@angular/core";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@angular/aria/menu";
import { IconComponent } from "@fz/ui/icon";
import { GameBarComponent } from "../game_bar";
import { type MenuSide, menuSide, opensFromRail } from "../game_bar/menu_side";

/** Describes one choice a bar's choice menu offers. */
export interface BarChoiceOption<Id extends string = string> {
  /** What `choose` emits when the choice is made. */
  readonly id: Id;
  readonly name: string;
  /** A few words after the name, such as what a level asks of the player. */
  readonly detail?: string;
}

/**
 * Shows a badge in a game bar's title that opens a menu of choices, one of
 * them checked, such as a game's level.
 *
 * Angular Aria's menu supplies the keyboard, the roles, and focus going back
 * to the badge. The choices come as data, since Angular Aria finds a menu's
 * items in the template that declares the menu. Inside a `fz-game-bar` the
 * menu opens away from the edge the bar stands against, and on a rail the
 * badge is set smaller.
 */
@Component({
  selector: "fz-bar-choice",
  imports: [IconComponent, Menu, MenuContent, MenuItem, MenuTrigger],
  host: { "[class.rail]": "onRail()" },
  templateUrl: "./bar_choice.component.html",
  styleUrl: "./bar_choice.component.scss",
})
export class BarChoiceComponent<Id extends string = string> {
  private readonly bar = inject(GameBarComponent, { optional: true });

  /**
   * What is chosen, such as "Level": the menu's name, and with the choice
   * checked, the badge's.
   */
  readonly label = input.required<string>();

  /** What the menu offers, in order. */
  readonly options = input.required<readonly BarChoiceOption<Id>[]>();

  /** The choice checked, which the badge shows. */
  readonly value = input.required<Id>();

  /** Emits the id of a choice other than the one checked. */
  readonly choose = output<Id>();

  protected readonly items = computed(() =>
    this.options().map((option) => ({
      ...option,
      checked: option.id === this.value(),
    })),
  );

  protected readonly name = computed(
    () => this.items().find((item) => item.checked)?.name ?? "",
  );

  /** The badge's name: what it chooses, and the choice checked. */
  protected readonly badgeLabel = computed(
    () => `${this.label()}: ${this.name()}`,
  );

  protected readonly side = computed<MenuSide>(() =>
    menuSide(this.bar?.placement() ?? "top"),
  );

  protected readonly onRail = computed(() => opensFromRail(this.side()));

  /** Whether the menu lines up with its badge's end, in a reversed bar. */
  protected readonly alignsEnd = computed(
    () => (this.bar?.reversed() ?? false) && !this.onRail(),
  );

  protected select(id: string | undefined): void {
    const option = this.options().find((each) => each.id === id);
    if (option && option.id !== this.value()) this.choose.emit(option.id);
  }

  protected dismiss(trigger: MenuTrigger<string>): void {
    trigger.close();
    trigger.element.focus();
  }
}
