import { cssHex } from "@fz/phaser/color";
import { render, screen, within } from "@testing-library/angular";
import { createBrick } from "../../rules/bricks/bricks";
import {
  type LevelEntry,
  levelsOf,
  parseLevel,
} from "../../rules/levels/levels";
import type { StarId } from "../../rules/run/stars";
import { MAX_LIVES } from "../../rules/tuning";
import { ART_PALETTE } from "../../testing/art_frames";
import { partHeaded, starsHeard } from "../../testing/heard";
import { SPEC_LEVEL, SPEC_LEVELS } from "../../testing/play";
import { brickColor } from "../../view/art/brick_art";
import { BenchComponent } from "./bench.component";

/**
 * Says what differs in a bench from one at the specs' steel level, holding
 * no star, its mark 5, two lives waiting and the first life to come.
 */
interface BenchOptions {
  readonly level?: number;
  readonly stars?: readonly StarId[];
  readonly mark?: number;
  readonly livesWaiting?: number;
  readonly nextLifeAt?: number | null;
  readonly levelAfter?: LevelEntry | null;
}

/** Returns the specs' level of a number. */
function specLevel(number: number): LevelEntry {
  const entry = SPEC_LEVELS[number - 1];
  if (!entry) throw new Error(`No level ${String(number)}.`);
  return entry;
}

/** Renders the bench and returns its region. */
async function renderBench({
  level = SPEC_LEVEL.steel,
  stars = [],
  mark = 5,
  livesWaiting = 2,
  nextLifeAt = 20_000,
  levelAfter = specLevel(level + 1),
}: BenchOptions = {}): Promise<HTMLElement> {
  await render(BenchComponent, {
    inputs: {
      level: specLevel(level),
      stars,
      mark,
      livesWaiting,
      nextLifeAt,
      levelAfter,
      palette: ART_PALETTE,
    },
  });
  return screen.getByRole("region", { name: "The bench" });
}

/**
 * Returns the bricks of the next level's picture, as the panel draws them:
 * none unless the picture is hidden from assistive technology.
 */
function bricksIn(panel: HTMLElement): readonly SVGRectElement[] {
  return Array.from(
    panel.querySelectorAll<SVGRectElement>("svg[aria-hidden='true'] > rect"),
  );
}

/**
 * A level that holds a plain brick in its first cell and a ghost, hidden as
 * it starts, in the third column of the second row.
 */
const HAUNTED = levelsOf([
  {
    id: "haunted",
    name: "Haunted",
    place: "playroom",
    drops: 0,
    levels: [
      {
        id: "haunted",
        name: "Haunted",
        mark: 5,
        capsules: [],
        bricks: ["o............", "..~.........."],
      },
    ],
  },
])[0]!;

describe("BenchComponent", () => {
  it("is a region named by its heading", async () => {
    const panel = await renderBench();

    expect(panel).toContainElement(
      screen.getByRole("heading", { level: 2, name: "The bench" }),
    );
  });

  it("keeps each part a single element under its heading, which a short panel drops past the second", async () => {
    const panel = await renderBench();

    expect(Array.from(panel.children, (child) => child.tagName)).toEqual([
      "H2",
      "SECTION",
      "SECTION",
      "SECTION",
    ]);
  });

  it("heads its first part with the level's number, its set and its name", async () => {
    await renderBench();

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /^Level 3 · Specs\s*Steel$/,
      }),
    ).toBeInTheDocument();
  });

  it("says how far through its set the level is, under a pip for each of its levels", async () => {
    const panel = await renderBench();

    const pips = within(panel).getByRole("img", { name: "3 of 9 in Specs" });
    expect(
      Array.from(pips.children, (pip) => pip.getAttribute("data-pip")),
    ).toEqual([
      "done",
      "done",
      "here",
      "to-come",
      "to-come",
      "to-come",
      "to-come",
      "to-come",
      "to-come",
    ]);
  });

  it("lists the level's three stars in its first part, each with what it asks and whether it is won", async () => {
    const panel = await renderBench({ stars: ["clear", "streak"], mark: 15 });

    expect(starsHeard(partHeaded(/^Level 3/, panel))).toEqual([
      "Clear the level, won",
      "Don't lose a life, not won yet",
      "Reach a streak of 15, won",
    ]);
  });

  it("sits a fuzzball on the plank for each life waiting, and says how many", async () => {
    const panel = await renderBench({ livesWaiting: 2 });

    expect({
      balls: panel.querySelectorAll("fz-fuzzball").length,
      words: within(panel).queryByText("2 spare"),
    }).toEqual({ balls: 2, words: expect.anything() as unknown });
  });

  it("says none wait once the last life is in play", async () => {
    const panel = await renderBench({ livesWaiting: 0 });

    expect(within(panel).getByText("None spare")).toBeInTheDocument();
  });

  it("says the score the next life comes at", async () => {
    const panel = await renderBench({ nextLifeAt: 60_000 });

    expect(within(panel).getByText("Next life at 60,000")).toBeInTheDocument();
  });

  it("says the run holds the most lives it may, where no score brings another", async () => {
    const panel = await renderBench({ nextLifeAt: null });

    expect(
      within(panel).getByText(`${String(MAX_LIVES)} lives at most`),
    ).toBeInTheDocument();
  });

  it("names the level after this one and its kinds of brick", async () => {
    const panel = await renderBench();

    const next = within(partHeaded("Next", panel));
    expect({
      title: next.queryByText("Level 4"),
      name: next.queryByText("Few"),
      kinds: next.getAllByRole("listitem").map((item) => item.textContent),
    }).toEqual({
      title: expect.anything() as unknown,
      name: expect.anything() as unknown,
      kinds: ["Brick", "Blast brick"],
    });
  });

  it("draws the level after this one, each brick in its color, hidden from assistive technology", async () => {
    const panel = await renderBench();

    const after = parseLevel(specLevel(SPEC_LEVEL.few));
    const colors = after.cells.flatMap((placed, cell) =>
      placed
        ? [cssHex(brickColor(createBrick(placed, cell), ART_PALETTE))]
        : [],
    );
    expect(bricksIn(panel).map((brick) => brick.getAttribute("fill"))).toEqual(
      colors,
    );
  });

  it("draws each brick in its cell, a brick hidden as the level starts faint", async () => {
    const panel = await renderBench({ levelAfter: HAUNTED });

    expect(
      bricksIn(panel).map((brick) => ({
        x: brick.getAttribute("x"),
        y: brick.getAttribute("y"),
        opacity: brick.getAttribute("opacity"),
      })),
    ).toEqual([
      { x: "0.08", y: "0.08", opacity: null },
      { x: "4.08", y: "1.08", opacity: "0.4" },
    ]);
  });

  it("says the level is the last where none comes after it", async () => {
    const panel = await renderBench({ levelAfter: null });

    expect(
      within(panel).getByText("This is the last level"),
    ).toBeInTheDocument();
  });
});
