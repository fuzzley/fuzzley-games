import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { PICKUP_IDS, pickup } from "../../rules/catalog/pickups";
import { ROCK_KIND_IDS, rockKind } from "../../rules/catalog/rocks";
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
  rocks: { ...PICTURE_FRAMES.rocks, iron: pictureOf("iron") },
  pickups: { ...PICTURE_FRAMES.pickups, shield: pictureOf("shield") },
  stray: pictureOf("stray"),
  comet: pictureOf("comet"),
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
      "Turn",
      "Thrust",
      "Fire",
      "Dash",
      "Pause, or go on",
      "Next wave",
      "Start again, once a run has ended",
    ]);
  });

  it("says how a chain, a stray, a clearing and the ships add up, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Scoring\./).parentElement).toHaveTextContent(
      "Breaks each within 1.5 seconds of the last make a chain, which multiplies each break's points: ×2 from 5 breaks, ×3 from 10 breaks, ×4 from 20 breaks. A stray brought home scores 500, times the chain. A wave cleared adds 500 points, and 500 more when no ship was lost on it. A ship more comes at 10,000 points and every 20,000 after, up to 6 ships.",
    );
  });

  it.each([
    ["Rocks", ROCK_KIND_IDS.length],
    ["Pickups", PICKUP_IDS.length],
    ["Strays and comets", 2],
  ])("names and says what each of the %s does", async (heading, count) => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(screen.getByRole("region", { name: heading })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(count);
  });

  it("says how pickups come before listing them", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(screen.getByRole("region", { name: "Pickups" })).getByText(
        /^A broken rock may let a pickup go/,
      ),
    ).toBeVisible();
  });

  it("says how long a dash takes to charge again, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Dashing\./).parentElement).toHaveTextContent(
      "A dash throws the ship ahead, and no rock or comet can take it while it lasts; it takes 2.5 seconds to charge again.",
    );
  });

  it("says when strays come, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(
        screen.getByRole("region", { name: "Strays and comets" }),
      ).getByText(/Strays drift in from wave 3/),
    ).toBeVisible();
  });

  it("says what an iron rock does", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Iron.").parentElement).toHaveTextContent(
      "Iron. Takes several hits",
    );
  });

  it("shows no pictures before the scene has drawn them", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it.each([
    ["a rock", rockKind("iron").name, PICTURES.rocks.iron],
    ["a pickup", pickup("shield").name, PICTURES.pickups.shield],
    ["a stray", "Stray fuzzball", PICTURES.stray],
    ["the comet", "Comet", PICTURES.comet],
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
