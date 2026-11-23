import { render, screen } from "@testing-library/angular";
import { type Legend, wallFrom } from "../../rules/level_picture";
import type { Brick } from "../../rules/wall";
import { ComingNextComponent } from "./coming_next.component";

/** Kinds of brick made up for the spec. */
type Kind = "pebble" | "slate";

/** The legend the spec draws its wall in: `p` a pebble, `#` slate. */
const LEGEND: Legend<Kind> = {
  none: ".",
  bricks: {
    p: { kind: "pebble", hits: 1, plates: 0 },
    "#": { kind: "slate", hits: 0, plates: 0 },
  },
  twinMarks: [],
  tintOf: () => 0,
};

/** Each kind's ink, as CSS. */
const INKS: Readonly<Record<Kind, string>> = {
  pebble: "rgb(10, 20, 30)",
  slate: "rgb(40, 50, 60)",
};

/** Returns a brick's ink, as the spec's game draws it. */
function inkOf(brick: Brick<Kind>): string {
  return INKS[brick.kind];
}

/**
 * A wall of four rows, its lowest in field row 9, so over a field 11 deep
 * its top two wait: slate, and under it the next to come in, pebbles with
 * gaps between them.
 */
const WALL = wallFrom(
  ["#########", "p.p.p.p.p", "ppppppppp", "ppppppppp"],
  LEGEND,
  {
    lowestRow: 9,
  },
);

/** Renders Coming next for the wall on a field a depth deep, 11 unless given, the count and the jump in words of the spec's own. */
async function renderPanel(depth = 11): Promise<HTMLElement> {
  await render(ComingNextComponent<Kind>, {
    inputs: {
      level: { number: 3, data: { name: "Gravel" } },
      wall: WALL,
      depth,
      inkOf,
      waiting: "Rows waiting, as the lintel says",
      jump: "What a jump does, in a sentence.",
    },
  });
  return screen.getByRole("region", { name: "Coming next" });
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

    expect(screen.getByText("Level 3: Gravel")).toBeInTheDocument();
  });

  it("says how many rows wait, and what the jump does, in the game's words", async () => {
    const panel = await renderPanel();

    expect(panel).toHaveTextContent(
      /Rows waiting, as the lintel says\s*What a jump does, in a sentence\.$/,
    );
  });

  it("draws the rows waiting as squares hidden from assistive technology, nine a row", async () => {
    const panel = await renderPanel();

    expect(squaresIn(panel)).toHaveLength(18);
  });

  it("draws no squares where no row waits", async () => {
    const panel = await renderPanel(13);

    expect(squaresIn(panel)).toHaveLength(0);
  });

  it("draws each square in its brick's ink, the next row to come in lowest, and none where there is no brick", async () => {
    const panel = await renderPanel();

    expect(
      squaresIn(panel).map((square) => square.style.getPropertyValue("--ink")),
    ).toEqual([
      ...Array.from({ length: 9 }, () => INKS.slate),
      ...Array.from({ length: 9 }, (_, column) =>
        column % 2 === 0 ? INKS.pebble : "",
      ),
    ]);
  });
});
