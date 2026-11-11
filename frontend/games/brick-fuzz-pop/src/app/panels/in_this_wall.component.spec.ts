import { recordOf } from "@fz/core/records";
import { cssHex } from "@fz/phaser/color";
import { render, screen, within } from "@testing-library/angular";
import { BRICK_KIND_IDS } from "../../rules/catalog/bricks";
import type { Crew, RoundStart } from "../../rules/round/round";
import type { Boon } from "../../rules/shot";
import { FIRST_X } from "../../rules/tuning";
import { ART_PALETTE } from "../../testing/art_frames";
import { wallFrom } from "../../testing/wall_picture";
import { inkAt } from "../../view/colors/inks";
import type { HelpPictures } from "../help/help.component";
import { InThisWallComponent } from "./in_this_wall.component";

/** Returns a picture as the scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/** Pictures as the scene hands them over, each kind's its own. */
const PICTURES: HelpPictures = {
  bricks: recordOf(BRICK_KIND_IDS, pictureOf),
};

/** A wall of steel, tough and plain bricks, the steel waiting over the ceiling. */
const WALL = wallFrom(["####.####", ".........", "o2o2o2o2o"], {
  lowestRow: 9,
});

/** Returns a color as an element's style gives it back once set to it. */
function asStyled(color: string): string {
  const probe = document.createElement("i");
  probe.style.color = color;
  return probe.style.color;
}

/**
 * Says what differs in a panel from one in a level whose jumps earn the hot
 * shot, with no friends, its badge unlit and no pictures.
 */
interface PanelOptions {
  readonly boon?: Boon;
  readonly crew?: Crew;
  readonly lit?: boolean;
  readonly pictures?: HelpPictures | null;
}

/** Renders In this wall for the wall on a field 11 deep. */
async function renderPanel({
  boon = "hot",
  crew = { friends: [] },
  lit = false,
  pictures = null,
}: PanelOptions = {}): Promise<HTMLElement> {
  const start: RoundStart = {
    wall: WALL,
    depth: 11,
    x: FIRST_X,
    crew,
    boon: null,
  };
  await render(InThisWallComponent, {
    inputs: { boon, start, lit, palette: ART_PALETTE, pictures },
  });
  return screen.getByRole("region", { name: "In this wall" });
}

describe("InThisWallComponent", () => {
  it("is a region named by its heading", async () => {
    const panel = await renderPanel();

    expect(panel).toContainElement(
      screen.getByRole("heading", { level: 2, name: "In this wall" }),
    );
  });

  it("lists each kind the wall holds, in How to play's order, by its name and what it does", async () => {
    const panel = await renderPanel();
    const kinds = within(panel).getByRole("list");

    expect(
      within(kinds)
        .getAllByRole("listitem")
        .map((item) => item.textContent.trim()),
    ).toEqual([
      expect.stringMatching(/^Brick\s*Breaks at a hit\.$/),
      expect.stringMatching(
        /^Tough brick\s*Takes two to six hits, a pip for each one left\.$/,
      ),
      expect.stringMatching(/^Steel brick\s*\S/),
    ]);
  });

  it("shows each kind's picture once the scene has drawn it, hidden from assistive technology", async () => {
    await renderPanel({ pictures: PICTURES });

    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => within(item).getByRole("presentation")),
    ).toEqual([
      expect.objectContaining({ src: pictureOf("brick") }),
      expect.objectContaining({ src: pictureOf("tough") }),
      expect.objectContaining({ src: pictureOf("steel") }),
    ]);
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await renderPanel();

    expect(screen.queryAllByRole("presentation")).toEqual([]);
  });

  it("says nothing of a crew before a friend is freed", async () => {
    await renderPanel();

    expect(screen.queryByText(/with you\.$/)).not.toBeInTheDocument();
  });

  it.each([
    [[3], "1 friend flies with you."],
    [[3, 0], "2 friends fly with you."],
  ])(
    "says how many friends fly with the player's fuzzball: %j",
    async (friends, words) => {
      await renderPanel({ crew: { friends } });

      expect(screen.getByText(words)).toBeInTheDocument();
    },
  );

  it("draws each friend as a fuzzball in its ink, in the order freed", async () => {
    const panel = await renderPanel({ crew: { friends: [3, 0] } });

    expect(
      Array.from(panel.querySelectorAll<HTMLElement>("fz-fuzzball")).map(
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
      await renderPanel({ boon });

      expect(screen.getByText(words)).not.toHaveClass("fz-badge-accent");
    },
  );

  it.each([
    ["hot", "Next shot: hot shot"],
    ["triple", "Next shot: triple shot"],
  ] as const)(
    "lights the badge while a shot is aimed carrying the boon: %s",
    async (boon, words) => {
      await renderPanel({ boon, lit: true });

      expect(screen.getByText(words)).toHaveClass(
        "fz-badge",
        "fz-badge-accent",
      );
    },
  );
});
