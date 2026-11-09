import { Component, computed, input, output } from "@angular/core";
import { RadioGroupDirective } from "./radio_group.directive";

/** Describes one choice a list of choices offers. */
export interface ChoiceOption<Id extends string = string> {
  /** What choosing it emits. */
  readonly id: Id;
  readonly name: string;
  /** A few words after the name, such as what a level asks of the player. */
  readonly detail?: string;
}

/**
 * Offers a setting's choices as tiles, one under another, each its name over
 * its detail, with the one in use checked, such as a game's speed in its
 * settings drawer.
 *
 * The tiles are `role="radio"` buttons in a `[fzRadioGroup]`, so the arrow
 * keys move between them without choosing, and each is named by all its
 * text, as a voice command reads it.
 *
 * Every press emits, the checked choice's too, so the app decides what
 * pressing it again does: nothing for a speed already in use, but it may
 * open again what the choice opens.
 */
@Component({
  selector: "fz-choice-list",
  imports: [RadioGroupDirective],
  templateUrl: "./choice_list.component.html",
  styleUrl: "./choice_list.component.scss",
})
export class ChoiceListComponent<Id extends string = string> {
  /** What the list offers, in order. */
  readonly options = input.required<readonly ChoiceOption<Id>[]>();

  /** The choice checked. */
  readonly value = input.required<Id>();

  /** The id of the element that names the list. */
  readonly labelledBy = input.required<string>();

  /** The id of the element that describes the list, if one does. */
  readonly describedBy = input<string>();

  /** Emits the id of the choice pressed, whether or not it is checked. */
  readonly choose = output<Id>();

  /** The choices, each saying whether it is the one checked. */
  protected readonly choices = computed(() =>
    this.options().map((option) => ({
      ...option,
      checked: option.id === this.value(),
    })),
  );
}
