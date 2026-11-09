import type { ChoiceOption } from "@fz/ui/radio_group";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";

/**
 * The speeds, each with what it is like, as the bar's badge and the settings
 * both offer them.
 */
export const SPEED_CHOICES: readonly ChoiceOption<Speed>[] = SPEEDS.map(
  (id) => ({ id, name: SPEED_INFO[id].name, detail: SPEED_INFO[id].says }),
);
