import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { kindOf } from "../../rules/catalog/kinds";
import { type HelpPictures, HelpComponent } from "./help.component";
import { HELP_KIND_IDS, HELP_KINDS } from "./kinds";

/** Returns a picture as the scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/** Pictures as the scene hands them over, each kind's its own. */
const PICTURES: HelpPictures = {
  bricks: {
    brick: pictureOf("brick"),
    tough: pictureOf("tough"),
    steel: pictureOf("steel"),
    ramp: pictureOf("ramp"),
    hatch: pictureOf("hatch"),
    spring: pictureOf("spring"),
    gem: pictureOf("gem"),
    portal: pictureOf("portal"),
    plated: pictureOf("plated"),
    moss: pictureOf("moss"),
    lock: pictureOf("lock"),
  },
};

/** Renders How to play, open, with the pictures given or none. */
async function renderHelp(pictures: HelpPictures | null = null): Promise<void> {
  await render(HelpComponent, { inputs: { open: true, pictures } });
}

/** Returns the text of each row's cell in a column of the controls' table, 0 for the mouse's. */
function column(index: number): readonly string[] {
  const table = screen.getByRole("table", { name: "Controls" });
  const [, ...rows] = within(table).getAllByRole("row");
  return rows.map((row) =>
    (within(row).getAllByRole("cell")[index]?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Returns the paragraph a bold lead such as "Scoring." opens. */
function paragraph(lead: string): HTMLElement | null {
  return screen.getByText(lead).parentElement;
}

describe("HelpComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(HelpComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says the goal, what the wall does and how the game ends, before the controls", async () => {
    await renderHelp();

    const [top] = screen.getByRole("dialog").querySelectorAll("p");

    expect(top?.nextElementSibling).toBe(
      screen.getByRole("table", { name: "Controls" }),
    );
    expect(top).toHaveTextContent(
      "Aim the fuzzball and let it go. It bounces off the walls and the bricks until it lands on the floor, and each brick it hits takes a hit. After each shot, the wall moves down 1 row. Break every brick that can be broken to clear the level. If one of them reaches the floor, you lose the level. The game ends when you lose a level or clear them all.",
    );
  });

  it("says how to play, and the controls", async () => {
    await renderHelp();

    expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    expect(
      within(screen.getByRole("table", { name: "Controls" }))
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Aim",
      "Aim in small steps",
      "Shoot",
      "Cancel",
      "Fast-forward",
      "Skip",
      "Pause",
      "Resume",
      "Next level",
      "Try again",
    ]);
  });

  it("gives the controls by mouse, touch and keyboard", async () => {
    await renderHelp();

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Mouse", "Touch", "Keyboard"]);
  });

  it("names each key by its QWERTY letter, or by what it prints", async () => {
    await renderHelp();

    expect(column(2)).toEqual([
      "← → or A D",
      "Shift with the aim keys",
      "Space",
      "",
      "F",
      "X",
      "P or Esc",
      "P or Enter",
      "Enter",
      "Enter",
    ]);
  });

  // The game reads the keys by event.code, their place on the keyboard,
  // which these are the QWERTY letters of.
  it("caps each key the game reads, letters by their QWERTY names", async () => {
    await renderHelp();

    // A key cap is no role of its own, so the dialog's are found by their tag.
    const caps = screen.getByRole("dialog").querySelectorAll("kbd");

    expect(new Set([...caps].map((cap) => cap.textContent))).toEqual(
      new Set([
        "←",
        "→",
        "A",
        "D",
        "Shift",
        "Space",
        "F",
        "X",
        "P",
        "Esc",
        "Enter",
        "G",
        "R",
      ]),
    );
  });

  it("aims a mouse and a finger by pointing, and finely by the wheel and Nudge", async () => {
    await renderHelp();

    expect([column(0)[0], column(1)[0], column(0)[1], column(1)[1]]).toEqual([
      "Point",
      "Touch and drag",
      "Turn the wheel",
      "Nudge",
    ]);
  });

  it("shoots at a click or a finger let go, and cancels at a right-click or a second finger", async () => {
    await renderHelp();

    expect([column(0)[2], column(1)[2], column(0)[3], column(1)[3]]).toEqual([
      "Click",
      "Let go",
      "Right-click",
      "Tap with a second finger",
    ]);
  });

  it("skips by the bar's Skip, by mouse and by touch", async () => {
    await renderHelp();

    expect([column(0)[5], column(1)[5]]).toEqual(["Skip", "Skip"]);
  });

  it("starts again by the result card's Try again, or New game after a win", async () => {
    await renderHelp();

    expect([column(0).at(-1), column(1).at(-1)]).toEqual([
      "Try again or New game",
      "Try again or New game",
    ]);
  });

  it("says every hit bounces the fuzzball, and what a turn is", async () => {
    await renderHelp();

    expect(paragraph("Every hit bounces.")).toHaveTextContent(
      "The fuzzball never breaks through. It bounces off every brick it hits, even one that breaks. Each time it changes direction counts as a turn.",
    );
  });

  it("says a cut corner swaps a steep shot for a shallow one, so a shot flies in 8 directions", async () => {
    await renderHelp();

    expect(paragraph("Cut corners.")).toHaveTextContent(
      "Off a corner, a steep shot leaves shallow, and a shallow one leaves steep. So a shot only ever flies in 8 directions, all from your aim.",
    );
  });

  it("draws a cut corner, the 8 directions and the bank, each named for what it shows", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("dialog"))
        .getAllByRole("img")
        .map((drawing) => drawing.getAttribute("aria-label")),
    ).toEqual([
      "A brick with cut corners, one shot bouncing off its side and one off a corner.",
      "The 8 directions a shot aimed at 62 degrees can fly in.",
      "A shot aimed at a gap's mirror image beyond the wall bounces into the gap.",
    ]);
  });

  it("says to bank a shot by aiming at the gap's mirror image, as pool players do", async () => {
    await renderHelp();

    expect(paragraph("Banking.")).toHaveTextContent(
      "Picture the gap mirrored on the far side of the wall, and aim at that, the way pool players do.",
    );
  });

  it("says what the rally earns, the floor bounces' rallies and their most, from the tuning", async () => {
    await renderHelp();

    expect(paragraph("The rally.")).toHaveTextContent(
      "Each time your shot strikes a brick that can be broken, the rally goes up by 1. At a rally of 10, 25, 45, 70 and so on, your shot earns a floor bounce. Each floor bounce lets the fuzzball bounce off the floor once instead of landing. Your shot can hold 3 at once.",
    );
  });

  it("says the wall jumps once nothing is left to break below the line, making a hot shot", async () => {
    await renderHelp();

    expect(paragraph("The jump.")).toHaveTextContent(
      "When there's nothing left to break below the dashed line, the wall jumps. It moves down a third of the screen instead of 1 row. A jump never loses a level, and it makes your next shot a hot shot.",
    );
  });

  it("says what a hot shot does, from the tuning", async () => {
    await renderHelp();

    expect(paragraph("The hot shot.")).toHaveTextContent(
      "A hot shot takes 2 hits off each brick it strikes. It starts with 1 floor bounce.",
    );
  });

  it("sets each strike's worth by the rally, a floor bounce, a jump and a star out in a table, from the tuning", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("table", { name: "Scoring" }))
        .getAllByRole("row")
        .map((row) =>
          [
            within(row).getByRole("rowheader").textContent.trim(),
            within(row).getByRole("cell").textContent.trim(),
          ].join(" "),
        ),
    ).toEqual([
      "1st to 4th strike 10",
      "5th to 9th strike 20",
      "10th to 24th strike 30",
      "25th to 44th strike 40",
      "45th strike on 50",
      "A floor bounce +100",
      "A jump +100",
      "A star +200",
    ]);
  });

  it("says how each of the 3 stars is earned", async () => {
    await renderHelp();

    expect(paragraph("Stars.")).toHaveTextContent(
      "You get a star for clearing a level, one for clearing it in par or fewer shots, and one for a shot whose rally reaches the level's rally mark.",
    );
  });

  it("says fast-forward stays on until it is turned off, what Skip keeps, and that a fuzzball gets bored", async () => {
    await renderHelp();

    expect(paragraph("No hurry.")).toHaveTextContent(
      "Nothing moves until you shoot. Fast-forward speeds up shots and stays on until you turn it off. Skip ends a shot at once, with everything it would have done. A fuzzball that goes too long without hitting a brick gets bored and drops.",
    );
  });

  it("says Settings can have the mouse and fingers pull back, or a button let a shot fly", async () => {
    await renderHelp();

    expect(paragraph("Other ways to aim.")).toHaveTextContent(
      "If you'd rather aim like a slingshot, choose Pull back under Aiming in Settings. To shoot with the Release button instead of letting go, turn on Release with a button.",
    );
  });

  it("says G reads the guide and R the lowest rows with bricks, as many as it reads", async () => {
    await renderHelp();

    expect(paragraph("Playing by ear.")).toHaveTextContent(
      "Press G to hear where the guide goes, and R to hear the 3 lowest rows that have bricks in them.",
    );
  });

  it("names and says what each brick does, in the catalog's order", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("region", { name: "Bricks" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent.replace(/\s+/g, " ").trim()),
    ).toEqual(
      HELP_KIND_IDS.map((id) => `${kindOf(id).name}. ${HELP_KINDS[id].about}`),
    );
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await renderHelp();

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it("shows no pictures while a kind it lists has none", async () => {
    await renderHelp({ bricks: { brick: pictureOf("brick") } });

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it("shows each brick's picture beside its name", async () => {
    await renderHelp(PICTURES);

    expect(
      HELP_KIND_IDS.map((id) => {
        const entry = screen.getByText(`${kindOf(id).name}.`).closest("li");
        return (
          entry && within(entry).getByRole("presentation").getAttribute("src")
        );
      }),
    ).toEqual(HELP_KIND_IDS.map((id) => PICTURES.bricks[id]));
  });

  it("asks to close at its close button", async () => {
    const closed = vi.fn();
    await render(HelpComponent, { inputs: { open: true }, on: { closed } });

    await userEvent.click(
      screen.getByRole("button", { name: "Close How to play" }),
    );

    expect(closed).toHaveBeenCalledOnce();
  });
});
