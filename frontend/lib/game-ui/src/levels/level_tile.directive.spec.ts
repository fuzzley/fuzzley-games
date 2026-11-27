import { Component, viewChild } from "@angular/core";
import { render } from "@testing-library/angular";
import { LevelTileDirective } from "./level_tile.directive";
import type { OfferedLevel } from "./levels.component";

/** Holds a tile's template as a game does inside `<fz-levels>`, so a spec can take the directive on it. */
@Component({
  imports: [LevelTileDirective],
  template: `<ng-template fzLevelTile let-level>{{ level.name }}</ng-template>`,
})
class TileTemplateHostComponent {
  readonly tile = viewChild.required(LevelTileDirective);
}

describe("LevelTileDirective", () => {
  it("types a tile's template's context as the level the dialog hands it", async () => {
    const { fixture } = await render(TileTemplateHostComponent);
    const tile = fixture.componentInstance.tile();

    const guard = (context: unknown) =>
      LevelTileDirective.ngTemplateContextGuard(tile, context);

    expectTypeOf(guard).guards.toEqualTypeOf<{
      readonly $implicit: OfferedLevel;
    }>();
    expect(guard(undefined)).toBe(true);
  });
});
