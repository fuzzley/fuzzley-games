import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { BALL_KIND_IDS, ballKind } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS, brickKind } from "../../rules/catalog/bricks";
import { CAPSULE_IDS, capsule } from "../../rules/catalog/capsules";
import { TWO_SETS, provideSpecLevels } from "../../testing/play";
import { PICTURE_FRAMES, type Pictures } from "../../view/art/art";
import { HelpComponent } from "./help.component";

/** Returns a picture as the scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/**
 * Pictures as the scene hands them over: the frames' names, but a picture of
 * its own for each the specs look for, so one shown is the one handed over.
 */
const PICTURES: Pictures = {
  ...PICTURE_FRAMES,
  bricks: { ...PICTURE_FRAMES.bricks, steel: pictureOf("steel") },
  capsules: { ...PICTURE_FRAMES.capsules, wide: pictureOf("wide") },
  balls: { ...PICTURE_FRAMES.balls, normal: pictureOf("normal") },
};

describe("HelpComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(HelpComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says how to play, and how a game ends after every level it has", async () => {
    await render(HelpComponent, {
      inputs: { open: true },
      providers: provideSpecLevels(TWO_SETS),
    });

    expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    expect(screen.getByText(/^Bounce the ball/)).toHaveTextContent(
      "Bounce the ball off your paddle to break the bricks. Break every brick that can be broken to clear the level. If the ball gets past your paddle, you lose a life. The game ends when you run out of lives or clear all 3 levels.",
    );
  });

  it("lists the controls", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(screen.getByRole("table", { name: "Controls" }))
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Move",
      "Launch or fire",
      "Pause",
      "Resume",
      "Next level",
      "New game, once the game is over",
    ]);
  });

  it("sets out how a streak, a clearing and the lives add up, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    const scoring = screen.getByRole("table", { name: "Scoring" });

    const textOf = (cell: HTMLElement): string | null => cell.textContent;

    expect({
      what: within(scoring).getAllByRole("rowheader").map(textOf),
      points: within(scoring).getAllByRole("cell").map(textOf),
    }).toEqual({
      what: [
        "Streak of 5 bricks",
        "Streak of 10 bricks",
        "Streak of 20 bricks",
        "Level cleared",
        "Level cleared without losing a life",
        "Extra life, up to 6",
      ],
      points: [
        "×2",
        "×3",
        "×4",
        "1,000",
        "500 more",
        "At 20,000 points, then every 40,000",
      ],
    });
  });

  it("says what a level's stars are won for, and that they unlock nothing", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Stars\./).parentElement).toHaveTextContent(
      "Stars. Each level has 3 stars: 1 for clearing it, 1 for not losing a life, and 1 for reaching the streak shown before the level starts. Stars don't unlock anything. You can win them at any speed.",
    );
  });

  it.each([
    ["Bricks", BRICK_KIND_IDS.length],
    ["Capsules", CAPSULE_IDS.length],
    ["Balls", BALL_KIND_IDS.length],
  ])("names and says what each of the %s does", async (heading, count) => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(screen.getByRole("region", { name: heading })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(count);
  });

  it("says how capsules come before listing them", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(screen.getByRole("region", { name: "Capsules" })).getByText(
        /^Capsules sometimes fall from broken bricks/,
      ),
    ).toBeVisible();
  });

  it("says what a steel brick does", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Steel brick.").parentElement).toHaveTextContent(
      "Steel brick. Can't be broken",
    );
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it.each([
    ["a brick", brickKind("steel").name, PICTURES.bricks.steel],
    ["a capsule", capsule("wide").name, PICTURES.capsules.wide],
    ["a ball", ballKind("normal").name, PICTURES.balls.normal],
  ])("shows %s's picture beside its name", async (_, name, picture) => {
    await render(HelpComponent, {
      inputs: { open: true, pictures: PICTURES },
    });

    const entry = screen.getByText(`${name}.`).closest("li");

    expect(entry && within(entry).getByRole("presentation")).toHaveAttribute(
      "src",
      picture,
    );
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
