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
  const [, ...rows] = screen.getAllByRole("row");
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

  it("says how to play, and the controls", async () => {
    await renderHelp();

    expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    expect(
      screen.getAllByRole("rowheader").map((header) => header.textContent),
    ).toEqual([
      "Aim",
      "Charge",
      "Let it fly",
      "Call a charge off",
      "Fast-forward a flight",
      "Skip a flight",
      "Pause, or go on",
      "Next level",
      "Start again, once a run has ended",
    ]);
  });

  it("gives the controls by mouse, touch and keyboard", async () => {
    await renderHelp();

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Mouse", "Touch", "Keyboard"]);
  });

  // The keys are read by event.code, so a letter printed on one layout's
  // key would name another key on the next.
  it("names each key by what it prints on every layout, or by where it sits", async () => {
    await renderHelp();

    expect(column(2)).toEqual([
      "← or → turns it a degree, or a quarter of one with Shift held",
      "↑ or ↓, a notch at a time",
      "Space",
      "Esc",
      "Hold the left index finger's home key, the one with a bump",
      "The left ring finger's key on the bottom row",
      "The key above the right little finger's home key; Esc pauses while no charge builds, and Enter goes on",
      "Enter",
      "Enter, or the key above the right little finger's home key",
    ]);
  });

  it("caps no key but those that print the same on every layout", async () => {
    await renderHelp();

    // A key cap is no role of its own, so the dialog's are found by their tag.
    const caps = screen.getByRole("dialog").querySelectorAll("kbd");

    expect(new Set([...caps].map((cap) => cap.textContent))).toEqual(
      new Set(["←", "→", "↑", "↓", "Shift", "Space", "Esc", "Enter"]),
    );
  });

  it("says where the letter keys that steer sit", async () => {
    await renderHelp();

    expect(paragraph("Keys by place.")).toHaveTextContent(
      "The left hand's home keys under its little, ring and middle fingers do as ←, ↓ and → do, and the key above the ring finger's as ↑ does.",
    );
  });

  it("says where the key that reads the wall sits", async () => {
    await renderHelp();

    expect(paragraph("By ear.")).toHaveTextContent(
      "the key above the left index finger's home key reads the wall's three lowest rows",
    );
  });

  it("aims a mouse by pointing and a finger by pulling back", async () => {
    await renderHelp();

    expect([column(0)[0], column(1)[0]]).toEqual([
      expect.stringMatching(/^Point; the guide follows/),
      expect.stringMatching(/^Press anywhere on the field and drag away/),
    ]);
  });

  it("starts again by the result card's Try again or the bar's New game", async () => {
    await renderHelp();

    expect([column(0).at(-1), column(1).at(-1)]).toEqual([
      "Try again, or New game",
      "Try again, or New game",
    ]);
  });

  it("says the settings can swap the ways of aiming", async () => {
    await renderHelp();

    expect(paragraph("Ways of aiming.")).toHaveTextContent(
      "Aiming can have a mouse pull back, or a finger point and hold",
    );
  });

  it("says what charge does, up to the most a fuzzball holds", async () => {
    await renderHelp();

    expect(paragraph("Charge.")).toHaveTextContent(
      "A fuzzball's charge, 0 to 5, is how many hits it punches through. It spends as much as a brick has hits left, or all it has",
    );
  });

  it("charges a held button up to the most a fuzzball holds", async () => {
    await renderHelp();

    expect(column(0)[1]).toBe(
      "Hold the button: the charge climbs a notch at a time to 5, then back down and round again",
    );
  });

  it("says the wall jumps once nothing it needs is left below the line", async () => {
    await renderHelp();

    expect(paragraph("The jump.")).toHaveTextContent(
      "Once no brick the level needs is left below the dashed line, the wall jumps a third of the field at once rather than a row, and your next shot carries the level's boon.",
    );
  });

  it("says what the two boons do, from the tuning", async () => {
    await renderHelp();

    expect(paragraph("Boons.")).toHaveTextContent(
      "The hot shot flies at full charge whatever you charged, nothing takes its charge, and it bounces off the floor 1 time before it lands. The triple shot sends 2 more fuzzballs out behind yours, each with the charge you chose.",
    );
  });

  it("says how the streak, a jump and the stars add up, from the tuning", async () => {
    await renderHelp();

    expect(paragraph("Scoring.")).toHaveTextContent(
      "The bricks a round breaks make a streak, which multiplies each one's points: ×2 from 5 bricks, ×3 from 10 bricks, ×4 from 20 bricks. A jump adds 100 points, and each star 200. A level cleared within its par of rounds earns three stars, two within 3 more rounds, and one otherwise.",
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

  it("says how a kind and its hits are told before listing the bricks", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("region", { name: "Bricks" })).getByText(
        /^A kind is told by its shape and its mark/,
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
