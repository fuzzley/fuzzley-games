import { TestBed } from "@angular/core/testing";
import { DEBUG_MENU, DEV_BUILD } from "./tokens";

/** Puts the page at an address with a query, as the site serves a game. */
function visit(search: string): void {
  window.history.replaceState(null, "", `/play/a-game/${search}`);
}

/** Makes the game a development build, as its own dev server runs it, or a production one. */
function built(dev: boolean): void {
  TestBed.configureTestingModule({
    providers: [{ provide: DEV_BUILD, useValue: dev }],
  });
}

describe("DEV_BUILD", () => {
  it("says what the build's environment says", () => {
    expect(TestBed.inject(DEV_BUILD)).toBe(import.meta.env.DEV);
  });
});

describe("DEBUG_MENU", () => {
  afterEach(() => {
    visit("");
  });

  it("offers the debug menu in a development build", () => {
    built(true);
    visit("");

    expect(TestBed.inject(DEBUG_MENU)).toBe(true);
  });

  it.each(["?debug", "?seed=4&debug", "?debug=1"])(
    "offers it in a production build whose address asks for it, as %s does",
    (search) => {
      built(false);
      visit(search);

      expect(TestBed.inject(DEBUG_MENU)).toBe(true);
    },
  );

  it.each(["", "?debugging", "#debug"])(
    "offers none in a production build whose address doesn't ask, as %j doesn't",
    (search) => {
      built(false);
      visit(search);

      expect(TestBed.inject(DEBUG_MENU)).toBe(false);
    },
  );
});
