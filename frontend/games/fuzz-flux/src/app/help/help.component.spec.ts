import { render, screen, within } from "@testing-library/angular";
import type { Pictures } from "../../scene/pictures";
import { PICTURES } from "../../testing/pictures";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { GAME_LEVELS } from "../tokens";
import { HelpComponent } from "./help.component";

/** Renders How to play, open, with the pictures given or none, over the game's own levels. */
async function renderHelp(pictures: Pictures | null = null): Promise<void> {
  await render(HelpComponent, { inputs: { open: true, pictures } });
}

/** Returns an element's text, its runs of white space each one space. */
function textOf(element: Element): string {
  return element.textContent.replace(/\s+/g, " ").trim();
}

/** Returns each row of a table its name names, as its cells' text joined by " | ". */
function rowsOf(name: string): readonly string[] {
  const table = screen.getByRole("table", { name });
  return within(table)
    .getAllByRole("row")
    .map((row) => [...row.querySelectorAll("th, td")].map(textOf).join(" | "));
}

/** Returns the paragraph a bold lead such as "Deals." opens. */
function paragraph(lead: string): HTMLElement | null {
  return screen.getByText(lead).parentElement;
}

/** Returns each entry a catalog its heading names lists, as its text, and its picture's link or null. */
function entriesOf(
  heading: string,
): readonly (readonly [string, string | null])[] {
  return within(screen.getByRole("region", { name: heading }))
    .getAllByRole("listitem")
    .map((item) => [
      textOf(item),
      item.querySelector("img")?.getAttribute("src") ?? null,
    ]);
}

describe("HelpComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(HelpComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says the goal, a swap and what it does, and how a level is lost, before the controls", async () => {
    await renderHelp();

    const [top] = screen
      .getByRole("dialog", { name: "How to play" })
      .querySelectorAll("p");

    expect(top?.nextElementSibling).toBe(
      screen.getByRole("table", { name: "Controls" }),
    );
    expect(top).toHaveTextContent(
      "Clear each level by meeting its goals before your moves run out. Swap 2 fuzzballs side by side or one above the other. When 3 or more of a kind line up, they make a bunch and hop off the board. The fuzzballs above fall into their place, and new ones come in at the top. A swap that makes no bunch goes back and costs no move. If your moves run out first, you lose the level.",
    );
  });

  it("gives the 3 ways to swap and every other control, by touch, mouse and keyboard", async () => {
    await renderHelp();

    expect(rowsOf("Controls")).toEqual([
      " | Touch | Mouse | Keyboard",
      "Swap | Swipe | Drag | ",
      "Pick up | Tap | Click | Space or Enter",
      "Then swap | Tap a neighbor | Click a neighbor | An arrow key",
      "Put down | Tap off the board | Click off the board | Esc",
      "Set off a special | Tap it twice | Click it twice | Space or Enter twice",
      "Move the ring |  |  | Arrow keys",
      "Hint | Hint | Hint | H",
    ]);
  });

  it("caps each key the board reads", async () => {
    await renderHelp();

    // A key cap is no role of its own, so the dialog's are found by their tag.
    const caps = screen.getByRole("dialog").querySelectorAll("kbd");

    expect(new Set([...caps].map(textOf))).toEqual(
      new Set(["Space", "Enter", "Esc", "H"]),
    );
  });

  it("says what a bunch is, and sets out what each leaves in a table", async () => {
    await renderHelp();

    expect(paragraph("Bunches.")).toHaveTextContent(
      "3 or more of a kind in a row or a column make a bunch, and so do 4 in a square. Bunches that touch count as one. A bigger bunch leaves a special fuzzball on the square you swapped into.",
    );
    expect(rowsOf("Bunches")).toEqual([
      "The bunch | What it leaves",
      "3 in a line | Nothing",
      "4 in a line | A dasher",
      "4 in a square | A wisp",
      "5 or more in an L or a T | A puffer",
      "5 or more in a line | A frizzball",
    ]);
  });

  it("says how a special is set off, then what each does, the puffer's reach from the rules", async () => {
    await renderHelp();

    const specials = screen.getByRole("region", { name: "Special fuzzballs" });

    expect(specials).toHaveTextContent(
      "Swap a special with any neighbor to set it off, even with no bunch. If a bunch takes it in or another special reaches it, it goes off too.",
    );
    expect(entriesOf("Special fuzzballs").map(([text]) => text)).toEqual([
      "Dasher. Clears its row or its column, the way its streaks point.",
      "Wisp. Floats to the square that most helps a goal, and clears it.",
      "Puffer. Clears every square within 2 steps.",
      "Frizzball. Swapped with a fuzzball, clears every fuzzball of that kind. Set off another way, it clears the commonest kind.",
    ]);
  });

  it("sets out what each pair of specials does in a table, its numbers from the rules", async () => {
    await renderHelp();

    expect(paragraph("Pairs.")).toHaveTextContent(
      "Swap 2 specials with each other, and they go off together as something bigger.",
    );
    expect(rowsOf("Pairs")).toEqual([
      "Swapped together | Does",
      "Dasher and dasher | Clears the row and the column",
      "Dasher and puffer | Clears 3 rows and 3 columns",
      "Puffer and puffer | Clears every square within 4 steps",
      "Wisp and wisp | Sends 3 wisps, each to a square of its own",
      "Wisp and dasher or puffer | Carries the other to the wisp's square, where it goes off",
      "Frizzball and a special | Turns every fuzzball of the special's kind into that special, and sets them all off",
      "Frizzball and frizzball | Clears the whole board",
    ]);
  });

  it("says what the goals count and when a level is cleared", async () => {
    await renderHelp();

    expect(paragraph("Goals.")).toHaveTextContent(
      "Each goal shows a picture and how many are left: fuzzballs of a kind to gather, or something on the board to clear. A goal met shows a check mark. You clear the level when a move ends with every goal met.",
    );
  });

  it("says what moves to spare earn, and the most the encore sets off, from the rules", async () => {
    await renderHelp();

    expect(paragraph("Moves to spare.")).toHaveTextContent(
      "When you clear a level, you earn 1 star, and up to 3 if you have enough moves to spare. Each move you have left then turns a fuzzball into a special and sets it off, up to 12. Tap, click or press a key to speed it up.",
    );
  });

  it("says how many deals a level has, and which deal each button plays", async () => {
    await renderHelp();

    expect(paragraph("Deals.")).toHaveTextContent(
      "Each level has 8 deals. A deal is the starting board and every fuzzball that comes in after it. You can clear every deal with the moves you have. Restart plays the same deal again. Try again, Play again and coming back to the level play the next deal.",
    );
  });

  it("counts the deals of the levels played", async () => {
    await render(HelpComponent, {
      inputs: { open: true },
      providers: [{ provide: GAME_LEVELS, useValue: SMALL_LEVELS }],
    });

    expect(paragraph("Deals.")).toHaveTextContent("Each level has 3 deals.");
  });

  it("lists each thing on a board in play, in the order the levels bring them in", async () => {
    await renderHelp();

    expect(entriesOf("On the board").map(([text]) => text)).toEqual([
      "Gap. Has no square. Fuzzballs fall past it.",
      "Dust. Covers a square up to 2 layers deep. A layer comes off when a bunch or a special clears the square.",
      "Brick. Has 1 to 4 layers. A bunch next to it or a special knocks a layer off.",
      "Sleepyhead. Can't be swapped. Falls when you clear what's under it, and goes to bed at the bottom.",
      "Burr. Keeps you from swapping a fuzzball. Line up 3 next to a burr to brush it off, or burrs spread.",
    ]);
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await renderHelp();

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it("shows each special's picture beside its name, a dasher in its fur across", async () => {
    await renderHelp(PICTURES);

    expect(
      entriesOf("Special fuzzballs").map(([, picture]) => picture),
    ).toEqual([
      PICTURES.specials["dasher-across"],
      PICTURES.specials.wisp,
      PICTURES.specials.puffer,
      PICTURES.frizzball,
    ]);
  });

  it("shows each thing's picture as the bar shows its goal's, and none for a gap", async () => {
    await renderHelp(PICTURES);

    expect(entriesOf("On the board").map(([, picture]) => picture)).toEqual([
      null,
      PICTURES.dust[0],
      PICTURES.brick,
      PICTURES.sleepyhead,
      PICTURES.burred,
    ]);
  });
});
