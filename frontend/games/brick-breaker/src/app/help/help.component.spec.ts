import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { BALL_KIND_IDS, ballKind } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS, brickKind } from "../../rules/catalog/bricks";
import { CAPSULE_IDS, capsule } from "../../rules/catalog/capsules";
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

  it("says how to play, and the controls", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    expect(
      screen.getAllByRole("rowheader").map((header) => header.textContent),
    ).toEqual([
      "Steer",
      "Launch, or fire",
      "Pause, or go on",
      "Next level",
      "Start again, once a run has ended",
    ]);
  });

  it("says how a streak, a clearing and the lives add up, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Scoring\./).parentElement).toHaveTextContent(
      "×2 from 5 bricks, ×3 from 10 bricks, ×4 from 20 bricks. A level cleared adds 1,000 points, and 500 more when no ball was lost on it. A life comes at 20,000 points and every 40,000 after, up to 6 lives.",
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
        /^A broken brick may let a capsule fall/,
      ),
    ).toBeVisible();
  });

  it("says what a steel brick does", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Steel brick.").parentElement).toHaveTextContent(
      "Steel brick. Never breaks",
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
