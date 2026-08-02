import { TestBed } from "@angular/core/testing";
import { Type } from "@angular/core";
import { provideRouter } from "@angular/router";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { GAME_DOCUMENTATION } from "@/ui/app/provider/game_documentation_data";
import { TEST_DOCUMENTATION } from "./documentation_mock";
import {
  createMockGameModel,
  type MockGameModel,
  type MockGameModelOverrides,
} from "./game_mock";
import {
  asCatalog,
  createMockCatalog,
  type MockCatalogHarness,
} from "./catalog_mock";
import {
  asPresentation,
  createMockPresentation,
  type MockPresentation,
} from "./presentation_mock";

/** Everything a UI spec needs to drive the component it just built. */
export interface UiHarness {
  readonly model: MockGameModel;
  readonly catalog: MockCatalogHarness;
  readonly presentation: MockPresentation;
}

/**
 * Configures a TestBed with the mock catalog and presentation the UI layer
 * expects, and returns the handles for driving them.
 *
 * Six component specs previously repeated the same fifteen lines of provider
 * wiring, which meant a change to the mock's shape was a change to six files.
 *
 * @param component The component under test, added to `imports`.
 * @param options Starting readings for the dealt game.
 */
export async function configureUiTestBed(
  component: Type<unknown>,
  options: MockGameModelOverrides = {},
): Promise<UiHarness> {
  const model = createMockGameModel(options);
  const catalog = createMockCatalog(model);
  const presentation = createMockPresentation();

  await TestBed.configureTestingModule({
    imports: [component],
    providers: [
      // No routes: the catalog is mocked, so nothing under test navigates.
      // The router is here because the shell renders an outlet.
      provideRouter([]),
      { provide: GameCatalogService, useValue: asCatalog(catalog.catalog) },
      {
        provide: PresentationSettingsService,
        useValue: asPresentation(presentation),
      },
      // Test prose, so a spec never fails because a rules page was reworded.
      { provide: GAME_DOCUMENTATION, useValue: TEST_DOCUMENTATION },
    ],
  }).compileComponents();

  return { model, catalog, presentation };
}
