import type { ChoiceOption } from "@fz/ui/radio_group";
import { LEVELS, LEVEL_INFO, type Level } from "../../rules/difficulty";

/**
 * The levels, each with what it asks of the player, as the bar's badge and
 * the settings both offer them.
 */
export const LEVEL_CHOICES: readonly ChoiceOption<Level>[] = LEVELS.map(
  (id) => ({ id, name: LEVEL_INFO[id].name, detail: LEVEL_INFO[id].asks }),
);
