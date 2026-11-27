import { Directive, TemplateRef, inject } from "@angular/core";
import type { OfferedSet } from "./levels.component";

/** What a set's note's template is handed: the set, as `let-set` names it. */
interface LevelSetNoteContext {
  readonly $implicit: OfferedSet;
}

/**
 * Marks the template a game draws a note with at the end of each set's
 * heading in the Levels dialog, such as the stars its levels hold:
 * `<ng-template fzLevelSetNote let-set>` inside `<fz-levels>`, handed each
 * set as the dialog lists it.
 *
 * It is drawn beside the set's name, not inside its heading, so it is no
 * part of the name the set's section is found by, and is read after it, so
 * it says in words what an icon of it shows. Its styles are the game's: of
 * the dialog's, only the heading's row reaches it, which sets it at the
 * line's end, centered on the set's name.
 */
@Directive({ selector: "ng-template[fzLevelSetNote]" })
export class LevelSetNoteDirective {
  /** The template each set's note is drawn with. */
  readonly template = inject<TemplateRef<LevelSetNoteContext>>(TemplateRef);

  /**
   * Tells the compiler what the template is handed, so it checks what the
   * template reads of the set.
   */
  static ngTemplateContextGuard(
    _directive: LevelSetNoteDirective,
    _context: unknown,
  ): _context is LevelSetNoteContext {
    return true;
  }
}
