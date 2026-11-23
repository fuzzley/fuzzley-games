import { inkAt } from "@fz/brick-wall/view/inks";
import { cssHex } from "@fz/phaser/color";
import { render, screen } from "@testing-library/angular";
import type { Crew } from "../../rules/round/round";
import type { Boon } from "../../rules/shot";
import { ART_PALETTE } from "../../testing/art_frames";
import { CrewAndBoonComponent } from "./crew_and_boon.component";

/** Returns a color as an element's style gives it back once set to it. */
function asStyled(color: string): string {
  const probe = document.createElement("i");
  probe.style.color = color;
  return probe.style.color;
}

/**
 * Says what differs in the lines from those of a level whose jumps earn
 * the hot shot, with no friends and the badge unlit.
 */
interface LinesOptions {
  readonly boon?: Boon;
  readonly crew?: Crew;
  readonly lit?: boolean;
}

/** Renders the lines, returning the element they are in. */
async function renderLines({
  boon = "hot",
  crew = { friends: [] },
  lit = false,
}: LinesOptions = {}): Promise<HTMLElement> {
  const { container } = await render(CrewAndBoonComponent, {
    inputs: { boon, crew, lit, palette: ART_PALETTE },
  });
  return container;
}

describe("CrewAndBoonComponent", () => {
  it("says nothing of a crew before a friend is freed", async () => {
    await renderLines();

    expect(screen.queryByText(/with you\.$/)).not.toBeInTheDocument();
  });

  it.each([
    [[3], "1 friend flies with you."],
    [[3, 0], "2 friends fly with you."],
  ])(
    "says how many friends fly with the player's fuzzball: %j",
    async (friends, words) => {
      await renderLines({ crew: { friends } });

      expect(screen.getByText(words)).toBeInTheDocument();
    },
  );

  it("draws each friend as a fuzzball in its ink, in the order freed", async () => {
    const lines = await renderLines({ crew: { friends: [3, 0] } });

    expect(
      Array.from(lines.querySelectorAll<HTMLElement>("fz-fuzzball")).map(
        (fuzzball) => fuzzball.style.color,
      ),
    ).toEqual(
      [3, 0].map((ink) => asStyled(cssHex(inkAt(ART_PALETTE.friends, ink)))),
    );
  });

  it.each([
    ["hot", "A jump earns a hot shot"],
    ["triple", "A jump earns a triple shot"],
  ] as const)(
    "names the boon a jump earns, unlit, until a shot is aimed carrying it: %s",
    async (boon, words) => {
      await renderLines({ boon });

      expect(screen.getByText(words)).not.toHaveClass("fz-badge-accent");
    },
  );

  it.each([
    ["hot", "Next shot: hot shot"],
    ["triple", "Next shot: triple shot"],
  ] as const)(
    "lights the badge while a shot is aimed carrying the boon: %s",
    async (boon, words) => {
      await renderLines({ boon, lit: true });

      expect(screen.getByText(words)).toHaveClass(
        "fz-badge",
        "fz-badge-accent",
      );
    },
  );
});
