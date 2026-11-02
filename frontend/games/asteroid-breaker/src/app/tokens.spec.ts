import { TestBed } from "@angular/core/testing";
import { DEBUG_MENU, DEV_BUILD } from "./tokens";

/** Puts the page at an address with a query, as the site serves the game. */
function visit(search: string): void {
  window.history.replaceState(null, "", `/play/asteroid-breaker/${search}`);
}

/** Makes the game a production build, as the site serves it. */
function inProduction(): void {
  TestBed.configureTestingModule({
    providers: [{ provide: DEV_BUILD, useValue: false }],
  });
}

describe("DEBUG_MENU", () => {
  afterEach(() => {
    visit("");
  });

  it("offers the debug menu in a development build", () => {
    visit("");

    expect(TestBed.inject(DEBUG_MENU)).toBe(true);
  });

  it.each(["?debug", "?seed=4&debug", "?debug=1"])(
    "offers it in a production build whose address asks for it, as %s does",
    (search) => {
      inProduction();
      visit(search);

      expect(TestBed.inject(DEBUG_MENU)).toBe(true);
    },
  );

  it.each(["", "?debugging", "#debug"])(
    "offers none in a production build whose address doesn't ask, as %j doesn't",
    (search) => {
      inProduction();
      visit(search);

      expect(TestBed.inject(DEBUG_MENU)).toBe(false);
    },
  );
});
