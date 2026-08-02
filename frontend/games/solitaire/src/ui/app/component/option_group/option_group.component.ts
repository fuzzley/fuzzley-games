import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";
import { GameOptionSpec } from "../../provider/game_catalog";
import { RadioGroupDirective } from "../../directive/radio_group.directive";

/** A running count, so every group's label has an id its control can name. */
let nextGroupId = 0;

/**
 * One rule of the running game, rendered as a segmented control.
 *
 * Shared by the settings drawer and the debug panel, which offer the same
 * thing — a labelled row of mutually exclusive choices — and previously said
 * so twice, in duplicated markup over duplicated CSS.
 *
 * The choices are a radio group rather than a row of buttons with an `active`
 * class: exactly one is chosen at a time, and `aria-checked` is what carries
 * that fact to anyone not looking at the highlight.
 */
@Component({
  selector: "app-option-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RadioGroupDirective],
  templateUrl: "./option_group.component.html",
  styleUrl: "./option_group.component.scss",
})
export class OptionGroupComponent {
  /** The rule being offered. */
  readonly option = input.required<GameOptionSpec>();

  /** The value currently chosen, if any. */
  readonly value = input<number | undefined>(undefined);

  /** Whether to render the label in the quieter sub-heading style. */
  readonly compactLabel = input(false);

  /** Emitted with the value the player picked. */
  readonly choose = output<number>();

  /**
   * The id of this group's label.
   *
   * A radiogroup needs a name, and the label is a heading rather than a
   * `<label>`: a `<label>` that wraps no control is invisible to assistive
   * technology, which is what the accessibility lint rule is objecting to.
   */
  protected readonly labelId = `option-group-label-${nextGroupId++}`;

  /** The chosen value, falling back to the rule's default. */
  protected readonly selectedValue = computed(
    () => this.value() ?? this.option().defaultValue,
  );
}
