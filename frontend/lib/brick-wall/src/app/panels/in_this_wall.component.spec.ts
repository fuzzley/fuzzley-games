import { recordOf } from "@fz/core/records";
import { render, screen, within } from "@testing-library/angular";
import { type Legend, wallFrom } from "../../rules/level_picture";
import type { Wall } from "../../rules/wall";
import { InThisWallComponent, type KindWords } from "./in_this_wall.component";

/** Kinds of brick made up for the spec, in the order its How to play lists them. */
const KINDS = ["pebble", "flint", "slate", "moss"] as const;

/** Names a kind made up for the spec. */
type Kind = (typeof KINDS)[number];

/** Each kind's name and words, as the spec's game says them. */
const WORDS: Readonly<Record<Kind, KindWords>> = {
  pebble: { name: "Pebble", about: "Takes 1 hit." },
  flint: { name: "Flint", about: "Takes 3 hits." },
  slate: { name: "Slate", about: "Never breaks." },
  moss: { name: "Moss", about: "Grows back." },
};

/** Returns a kind's name and words. */
function kindOf(kind: Kind): KindWords {
  return WORDS[kind];
}

/** The legend the spec draws its wall in: each kind by its first letter. */
const LEGEND: Legend<Kind> = {
  none: ".",
  bricks: Object.fromEntries(
    KINDS.map((kind) => [kind.charAt(0), { kind, hits: 1, plates: 0 }]),
  ),
  twinMarks: [],
  tintOf: () => 0,
};

/** A wall of slate, flint and pebbles, the slate waiting over the ceiling. */
const WALL = wallFrom(["ssss.ssss", ".........", "pfpfpfpfp"], LEGEND, {
  lowestRow: 9,
});

/** Returns a picture as a scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/** Pictures as a scene hands them over, each kind's its own. */
const PICTURES = recordOf(KINDS, pictureOf);

/** Renders In this wall for a wall, with the pictures handed, or none. */
async function renderPanel(
  wall: Wall<Kind> = WALL,
  pictures: Readonly<Record<Kind, string>> | null = null,
): Promise<HTMLElement> {
  await render(InThisWallComponent<Kind>, {
    inputs: { wall, kinds: KINDS, kindOf, pictures },
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

    expect(
      within(within(panel).getByRole("list"))
        .getAllByRole("listitem")
        .map((item) => item.textContent.trim()),
    ).toEqual([
      expect.stringMatching(/^Pebble\s*Takes 1 hit\.$/),
      expect.stringMatching(/^Flint\s*Takes 3 hits\.$/),
      expect.stringMatching(/^Slate\s*Never breaks\.$/),
    ]);
  });

  it("shows each kind's picture once the scene has drawn it, hidden from assistive technology", async () => {
    await renderPanel(WALL, PICTURES);

    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => within(item).getByRole("presentation")),
    ).toEqual([
      expect.objectContaining({ src: pictureOf("pebble") }),
      expect.objectContaining({ src: pictureOf("flint") }),
      expect.objectContaining({ src: pictureOf("slate") }),
    ]);
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await renderPanel();

    expect(screen.queryAllByRole("presentation")).toEqual([]);
  });

  it("shows the game's own lines under the kinds, as the springs a fuzzball has in hand", async () => {
    await render(
      `<fz-in-this-wall [wall]="wall" [kinds]="kinds" [kindOf]="kindOf">
        <p>2 springs in hand</p>
      </fz-in-this-wall>`,
      {
        imports: [InThisWallComponent],
        componentProperties: { wall: WALL, kinds: KINDS, kindOf },
      },
    );
    const panel = screen.getByRole("region", { name: "In this wall" });

    expect(panel.lastElementChild).toHaveTextContent("2 springs in hand");
  });
});
