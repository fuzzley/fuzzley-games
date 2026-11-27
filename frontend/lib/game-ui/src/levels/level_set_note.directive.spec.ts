import { Component, viewChild } from "@angular/core";
import { render } from "@testing-library/angular";
import { LevelSetNoteDirective } from "./level_set_note.directive";
import type { OfferedSet } from "./levels.component";

/** Holds a set's note's template as a game does inside `<fz-levels>`, so a spec can take the directive on it. */
@Component({
  imports: [LevelSetNoteDirective],
  template: `<ng-template fzLevelSetNote let-set>{{ set.name }}</ng-template>`,
})
class SetNoteTemplateHostComponent {
  readonly note = viewChild.required(LevelSetNoteDirective);
}

describe("LevelSetNoteDirective", () => {
  it("types a set's note's template's context as the set the dialog hands it", async () => {
    const { fixture } = await render(SetNoteTemplateHostComponent);
    const note = fixture.componentInstance.note();

    const guard = (context: unknown) =>
      LevelSetNoteDirective.ngTemplateContextGuard(note, context);

    expectTypeOf(guard).guards.toEqualTypeOf<{
      readonly $implicit: OfferedSet;
    }>();
    expect(guard(undefined)).toBe(true);
  });
});
