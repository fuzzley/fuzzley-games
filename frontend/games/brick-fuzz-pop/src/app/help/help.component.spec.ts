import { recordOf } from "@fz/core/records";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { BRICK_KIND_IDS, brickKind } from "../../rules/catalog/bricks";
import { type HelpPictures, HelpComponent } from "./help.component";

/** Returns a picture as the scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/** Pictures as the scene hands them over, each kind's its own. */
const PICTURES: HelpPictures = {
  bricks: recordOf(BRICK_KIND_IDS, pictureOf),
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
      "Aim the fuzzball and charge it up. Let go to shoot. It bounces around breaking bricks until it lands on the floor. After each shot, the wall moves down 1 row. Break every brick that can be broken to clear the level. If one of them reaches the floor, you lose the level. The game ends when you lose a level or clear them all.",
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
      "Charge",
      "Shoot",
      "Cancel",
      "Fast-forward",
      "Drop",
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
      "↑ ↓ or W S",
      "Space",
      "Esc",
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
        "↑",
        "↓",
        "A",
        "D",
        "W",
        "S",
        "Shift",
        "Space",
        "Esc",
        "F",
        "X",
        "P",
        "Enter",
        "R",
      ]),
    );
  });

  it("aims a mouse and a finger by pointing, and finely by the wheel", async () => {
    await renderHelp();

    expect([column(0)[0], column(1)[0], column(0)[1]]).toEqual([
      "Point",
      "Touch and drag",
      "Turn the wheel",
    ]);
  });

  it("charges a finger held down, and cancels at a second", async () => {
    await renderHelp();

    expect([column(1)[2], column(1)[3], column(1)[4]]).toEqual([
      "Keep your finger down",
      "Let go",
      "Tap with a second finger",
    ]);
  });

  it("charges a held button, and cancels at a right-click", async () => {
    await renderHelp();

    expect([column(0)[2], column(0)[4]]).toEqual([
      "Hold the button",
      "Right-click",
    ]);
  });

  it("drops by the bar's Drop, by mouse and by touch", async () => {
    await renderHelp();

    expect([column(0)[6], column(1)[6]]).toEqual(["Drop", "Drop"]);
  });

  it("starts again by the result card's Try again, or New game after a win", async () => {
    await renderHelp();

    expect([column(0).at(-1), column(1).at(-1)]).toEqual([
      "Try again or New game",
      "Try again or New game",
    ]);
  });

  it("says fast-forward stays on until it is turned off, and what Drop keeps", async () => {
    await renderHelp();

    expect(paragraph("No hurry.")).toHaveTextContent(
      "Fast-forward speeds up shots and stays on until you turn it off. Drop ends a shot early and keeps what it has broken.",
    );
  });

  it("says a fuzzball that hits no brick for long gets bored and drops", async () => {
    await renderHelp();

    expect(paragraph("No hurry.")).toHaveTextContent(
      "A fuzzball that goes too long without hitting a brick gets bored and drops.",
    );
  });

  it("names Skip nowhere, as the bar has none", async () => {
    await renderHelp();

    expect(screen.getByRole("dialog")).not.toHaveTextContent(/\bskip/i);
  });

  it("says R reads the lowest rows with bricks, as many as it reads", async () => {
    await renderHelp();

    expect(paragraph("Playing by ear.")).toHaveTextContent(
      "Press R to hear the 3 lowest rows that have bricks in them.",
    );
  });

  it("says Settings can have the mouse and fingers pull back instead", async () => {
    await renderHelp();

    expect(paragraph("Pull back.")).toHaveTextContent(
      "choose Pull back under Aiming in Settings",
    );
  });

  it("says what charge does, up to the most a fuzzball holds", async () => {
    await renderHelp();

    expect(paragraph("Charge.")).toHaveTextContent(
      "Each pip of charge takes 1 hit off a brick, and a fuzzball with no charge still takes 1. If the brick breaks, the fuzzball flies on with the charge it has left. If not, it bounces off with none. While you hold, the charge climbs to 5 and back down.",
    );
  });

  it("says the wall jumps once nothing is left to break below the line", async () => {
    await renderHelp();

    expect(paragraph("The jump.")).toHaveTextContent(
      "When there's nothing left to break below the dashed line, the wall jumps. It moves down a third of the screen instead of 1 row. A jump never loses a level, and it gives your next shot a boon.",
    );
  });

  it("says what the two boons do, from the tuning", async () => {
    await renderHelp();

    expect(paragraph("Boons.")).toHaveTextContent(
      "The hot shot flies at full charge, and nothing drains it. The triple shot sends 2 more fuzzballs out behind yours, with the same charge.",
    );
  });

  it("sets the streak, a jump and a star out in a table, from the tuning", async () => {
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
      "5th to 9th brick ×2",
      "10th to 19th brick ×3",
      "20th brick on ×4",
      "A jump +100",
      "A star +200",
    ]);
  });

  it("says how stars are earned against par, from the tuning", async () => {
    await renderHelp();

    expect(paragraph("Stars.")).toHaveTextContent(
      "If you clear a level in par or fewer shots, you get 3 stars. Up to 3 over par, you get 2. Any more, you get 1.",
    );
  });

  it("names and says what each brick does, in the catalog's order", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("region", { name: "Bricks" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent.replace(/\s+/g, " ").trim()),
    ).toEqual(
      BRICK_KIND_IDS.map(
        (id) => `${brickKind(id).name}. ${brickKind(id).about}`,
      ),
    );
  });

  it("says what a zap or a blast takes off a brick before listing the bricks", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("region", { name: "Bricks" })).getByText(
        "A zap or a blast takes 2 hits off each brick it reaches.",
      ),
    ).toBeVisible();
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await renderHelp();

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it("shows each brick's picture beside its name", async () => {
    await renderHelp(PICTURES);

    expect(
      BRICK_KIND_IDS.map((id) => {
        const entry = screen.getByText(`${brickKind(id).name}.`).closest("li");
        return (
          entry && within(entry).getByRole("presentation").getAttribute("src")
        );
      }),
    ).toEqual(BRICK_KIND_IDS.map((id) => PICTURES.bricks[id]));
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
