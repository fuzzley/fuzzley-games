import { cssHex } from "@fz/phaser/color";
import { render, screen } from "@testing-library/angular";
import { cellOf } from "../../rules/grid";
import { LEVELS, levelEntryOf } from "../../rules/levels/levels";
import type { RoundStart } from "../../rules/round/round";
import type { Boon } from "../../rules/shot";
import { describeBoon } from "../../rules/run/describe";
import { FIRST_X } from "../../rules/tuning";
import { ART_PALETTE } from "../../testing/art_frames";
import { wallFrom } from "../../testing/wall_picture";
import { brickColor } from "../../view/art/art";
import { ComingNextComponent } from "./coming_next.component";

/** The third level, "Pips". */
const LEVEL = levelEntryOf(LEVELS, 3);

/**
 * A wall of four rows, its lowest in field row 9, so over a field 11 deep
 * its top two wait: steel, and under it the next to come in, plain bricks
 * with gaps between them.
 */
const WALL = wallFrom(["#########", "o.o.o.o.o", "---------", "222222222"], {
  lowestRow: 9,
});

/** Returns where a round starts over {@link WALL} on a field a depth deep. */
function startOn(depth: number): RoundStart {
  return {
    wall: WALL,
    depth,
    x: FIRST_X,
    crew: { friends: [] },
    boon: null,
  };
}

/**
 * Renders Coming next for the wall on a field a depth deep, 11 unless
 * given, in a level whose jumps earn a boon, the hot shot unless given.
 */
async function renderPanel(
  depth = 11,
  boon: Boon = "hot",
): Promise<HTMLElement> {
  await render(ComingNextComponent, {
    inputs: {
      level: LEVEL,
      boon,
      start: startOn(depth),
      palette: ART_PALETTE,
    },
  });
  return screen.getByRole("region", { name: "Coming next" });
}

/** Returns the ink of the brick at the left of a wall row of {@link WALL}, as CSS. */
function leftInkOf(wallRow: number): string {
  const brick = WALL.bricks[cellOf(0, wallRow)];
  if (brick === undefined || brick === null) {
    throw new Error(`Wall row ${String(wallRow)} starts with no brick`);
  }
  return cssHex(brickColor(brick, ART_PALETTE));
}

/** Returns the squares of the rows waiting, as the panel draws them. */
function squaresIn(panel: HTMLElement): readonly HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>("[aria-hidden='true'] > *"),
  );
}

describe("ComingNextComponent", () => {
  it("is a region named by its heading", async () => {
    const panel = await renderPanel();

    expect(panel).toContainElement(
      screen.getByRole("heading", { level: 2, name: "Coming next" }),
    );
  });

  it("names the level in play by its number and name", async () => {
    await renderPanel();

    expect(screen.getByText("Level 3: Pips")).toBeInTheDocument();
  });

  it.each([
    [11, "2 rows wait over the ceiling."],
    [12, "1 row waits over the ceiling."],
    [13, "No rows wait over the ceiling."],
  ])("says how many rows wait over a field %i deep", async (depth, words) => {
    await renderPanel(depth);

    expect(screen.getByText(words)).toBeInTheDocument();
  });

  it.each(["hot", "triple"] as const)(
    "says what the level's jumps earn: the %s shot",
    async (boon) => {
      await renderPanel(11, boon);

      expect(screen.getByText(describeBoon(boon))).toBeInTheDocument();
    },
  );

  it("draws the rows waiting as squares hidden from assistive technology, nine a row", async () => {
    const panel = await renderPanel();

    expect(squaresIn(panel)).toHaveLength(18);
  });

  it("draws each square in its brick's ink, the next row to come in lowest, and none where there is no brick", async () => {
    const [steel, brick] = [leftInkOf(3), leftInkOf(2)];
    const panel = await renderPanel();

    expect(
      squaresIn(panel).map((square) => square.style.getPropertyValue("--ink")),
    ).toEqual([
      ...Array.from({ length: 9 }, () => steel),
      ...Array.from({ length: 9 }, (_, column) =>
        column % 2 === 0 ? brick : "",
      ),
    ]);
  });
});
