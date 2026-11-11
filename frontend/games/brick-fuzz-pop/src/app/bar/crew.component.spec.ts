import { TestBed } from "@angular/core/testing";
import { cssHex } from "@fz/phaser/color";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { render } from "@testing-library/angular";
import { friendInk } from "../../view/colors/inks";
import { CrewComponent } from "./crew.component";

/** Green, the fourth of the friends' inks, which differs between the modes. */
const GREEN = 3;

/** Blue, the sixth of the friends' inks. */
const BLUE = 5;

afterEach(() => {
  Reflect.deleteProperty(document.documentElement.dataset, "theme");
});

/** Renders a crew of friends in a palette, and returns its element. */
async function renderCrew(
  friends: readonly number[],
  theme: ThemeId = "classic",
): Promise<HTMLElement> {
  const { fixture } = await render(CrewComponent, { inputs: { friends } });
  TestBed.inject(ThemeService).select(theme);
  TestBed.tick();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

/** Returns the fuzzballs a crew draws, which no role finds, as they are pictures. */
function fuzzballsOf(crew: HTMLElement): HTMLElement[] {
  return Array.from(crew.querySelectorAll<HTMLElement>("fz-fuzzball"));
}

describe("CrewComponent", () => {
  it("draws the player's fuzzball, then a fuzzball for each friend", async () => {
    const crew = await renderCrew([GREEN, BLUE]);

    expect(fuzzballsOf(crew).map((ball) => ball.className)).toEqual([
      "own",
      "",
      "",
    ]);
  });

  it("draws the player's fuzzball alone with no friends", async () => {
    const crew = await renderCrew([]);

    expect(fuzzballsOf(crew)).toHaveLength(1);
  });

  it("draws each friend in its ink in a light palette", async () => {
    const crew = await renderCrew([GREEN, BLUE], "classic");

    expect(fuzzballsOf(crew).slice(1)).toEqual([
      expect.toHaveStyle({ color: cssHex(friendInk(GREEN, "light")) }),
      expect.toHaveStyle({ color: cssHex(friendInk(BLUE, "light")) }),
    ]);
  });

  it("draws each friend in its ink in a dark palette", async () => {
    const crew = await renderCrew([GREEN], "midnight");

    expect(fuzzballsOf(crew)[1]).toHaveStyle({
      color: cssHex(friendInk(GREEN, "dark")),
    });
  });

  it("is hidden from assistive technology", async () => {
    const crew = await renderCrew([GREEN]);

    expect(crew).toHaveAttribute("aria-hidden", "true");
  });
});
