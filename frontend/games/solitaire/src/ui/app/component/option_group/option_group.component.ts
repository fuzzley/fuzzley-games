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

/** Describes one choice as the template draws it. */
interface ChoiceView {
  readonly value: number;
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  /** The id of the element holding the choice's name. */
  readonly nameId: string;
  /** The id of the element holding its description, when it has one. */
  readonly descriptionId: string | null;
}

/**
 * Renders one rule of the running game as a group of radios: a segmented
 * control, or a list with a line about each choice.
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

  /** The id of the heading that names this radio group. */
  protected readonly labelId = `option-group-label-${nextGroupId++}`;

  /** Whether the choices are offered one to a row. */
  protected readonly listed = computed(() => this.option().control === "list");

  /** The choices on offer, with which one is checked. */
  protected readonly choices = computed<readonly ChoiceView[]>(() => {
    const option = this.option();
    const selected = this.value() ?? option.defaultValue;
    return option.choices.map((choice, index) => ({
      value: choice.value,
      label: choice.label,
      description: choice.description,
      checked: choice.value === selected,
      nameId: `${this.labelId}-choice-${index}`,
      descriptionId: choice.description
        ? `${this.labelId}-choice-${index}-desc`
        : null,
    }));
  });
}
