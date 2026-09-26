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

/** Renders one rule of the running game as a segmented control of radios. */
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

  /** The chosen value, falling back to the rule's default. */
  protected readonly selectedValue = computed(
    () => this.value() ?? this.option().defaultValue,
  );
}
