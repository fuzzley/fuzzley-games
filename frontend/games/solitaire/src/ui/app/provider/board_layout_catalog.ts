import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import { FREECELL_LAYOUT } from "@/games/freecell/freecell_layout";
import { SPIDER_LAYOUT } from "@/games/spider/spider_layout";
import { YUKON_LAYOUT } from "@/games/yukon/yukon_layout";
import { EIGHT_OFF_LAYOUT } from "@/games/eight_off/eight_off_layout";
import { SCORPION_LAYOUT } from "@/games/scorpion/scorpion_layout";

/**
 * Registry mapping each game id to its Phaser-free TableLayoutSpec.
 */
const LAYOUT_CATALOG: Readonly<Record<string, TableLayoutSpec>> = {
  klondike: KLONDIKE_LAYOUT,
  freecell: FREECELL_LAYOUT,
  spider: SPIDER_LAYOUT,
  yukon: YUKON_LAYOUT,
  bakers: FREECELL_LAYOUT,
  eightoff: EIGHT_OFF_LAYOUT,
  scorpion: SCORPION_LAYOUT,
};

/**
 * Returns the TableLayoutSpec for the given game id, falling back to Klondike.
 * @param gameId Stable game identifier.
 */
export function boardLayoutSpec(
  gameId: string | null | undefined,
): TableLayoutSpec {
  return LAYOUT_CATALOG[gameId ?? ""] ?? KLONDIKE_LAYOUT;
}
