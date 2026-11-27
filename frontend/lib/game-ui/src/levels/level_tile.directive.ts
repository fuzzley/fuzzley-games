import { Directive, TemplateRef, inject } from "@angular/core";
import type { OfferedLevel } from "./levels.component";

/** What a tile's template is handed: the level, as `let-level` names it. */
interface LevelTileContext {
  readonly $implicit: OfferedLevel;
}

/**
 * Marks the template a game draws each level's tile with, in place of the
 * Levels dialog's own: `<ng-template fzLevelTile let-level>` inside
 * `<fz-levels>`, handed each level as the dialog offers it.
 *
 * The dialog draws it inside the level's button, which stays the dialog's,
 * with what it says through `aria-current` and `aria-disabled` and hands on
 * through `chosen`, so the template draws only what the tile shows. What it
 * draws names the button, so it starts with the level's number and name,
 * "1 Gravel", as a voice command reads it, and says its stars in words,
 * `&ngsp;` keeping the spaces between its parts. Its styles are the game's:
 * of the dialog's, only the tile's box reaches it.
 */
@Directive({ selector: "ng-template[fzLevelTile]" })
export class LevelTileDirective {
  /** The template each tile is drawn with. */
  readonly template = inject<TemplateRef<LevelTileContext>>(TemplateRef);

  /**
   * Tells the compiler what the template is handed, so it checks what the
   * template reads of the level.
   */
  static ngTemplateContextGuard(
    _directive: LevelTileDirective,
    _context: unknown,
  ): _context is LevelTileContext {
    return true;
  }
}
