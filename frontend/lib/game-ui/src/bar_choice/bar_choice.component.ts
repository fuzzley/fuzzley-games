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
 * menu opens away from the edge the bar stands against, from the bar's
 * start where the bar is compact and across the window, and on a rail the
 * badge is set smaller.
 *
 * What the app projects as `fzBarChoiceExtra`, such as a slider for the
 * choice checked, shows beneath the choices. Tab reaches it from them, and
 * its keys are its own but Escape, which closes the menu. It stays inside
 * the menu, since the menu closes once the focus leaves it, but it is none
 * of the menu's items, which a screen reader counts and the arrow keys move
 * between: keep it to one simple control, and offer what it does elsewhere
 * too.
 */
@Component({
  selector: "fz-bar-choice",
  imports: [IconComponent, Menu, MenuContent, MenuItem, MenuTrigger],
  host: {
    "[class.rail]": "onRail()",
    "[class.from-bar]": "hangsFromBar()",
  },
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

  /**
   * Whether the menu hangs from the bar's start rather than the badge's, as
   * on a compact bar across the window, where the badge may sit too far
   * along for the menu to fit beside it.
   */
  protected readonly hangsFromBar = computed(
    () => (this.bar?.compact() ?? false) && !this.onRail(),
  );

  /** Whether the menu lines up with its badge's end, in a reversed bar. */
  protected readonly alignsEnd = computed(
    () => (this.bar?.reversed() ?? false) && !this.onRail(),
  );

  protected select(id: string | undefined): void {
    const option = this.options().find((each) => each.id === id);
    if (option && option.id !== this.value()) this.choose.emit(option.id);
  }

  /**
   * Keeps the keys pressed in what the app adds beneath the choices from the
   * menu, but Escape, which closes it, and Tab, which leaves it.
   */
  protected keepKeys(event: KeyboardEvent): void {
    if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
  }

  protected dismiss(trigger: MenuTrigger<string>): void {
    trigger.close();
    trigger.element.focus();
  }
}
