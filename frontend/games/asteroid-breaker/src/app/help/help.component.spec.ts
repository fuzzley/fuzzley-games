import { recordOf } from "@fz/core/records";
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
 * Pictures as the scene hands them over: the frames' names, or each rock's
 * kind, but a picture of its own for each the specs look for, so one shown
 * is the one handed over.
 */
const PICTURES: Pictures = {
  ...PICTURE_FRAMES,
  rocks: { ...recordOf(ROCK_KIND_IDS, String), iron: pictureOf("iron") },
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

  it("says the crew in tow are the ship's lives, how a hit knocks one loose and how long it waits to be caught, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^The crew\./).parentElement).toHaveTextContent(
      "The pilot flies the ship with 2 of the crew in tow, who are its lives, and a stray caught joins them, up to 5. A rock or a comet that touches the ship, unless it is dashing or shielded, knocks the last in tow loose, and nothing can touch it again for 1.5 seconds; fly into one knocked loose within 6 seconds to catch it again, or it floats home, and clearing the wave catches every one still loose. A hit with no one in tow sends the pilot home, and the run ends.",
    );
  });

  it("says how sparks, static, a stray and a clearing add up, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Scoring\./).parentElement).toHaveTextContent(
      "Each rock a shot or a blast breaks sheds sparks, which the ship draws in from 5 units, 8 at Relaxed, and the ship and those in tow gather: each scores 5 and adds 1 static, up to 40. Static multiplies what is scored: ×2 from 10 static, ×3 from 20 static, ×4 from 30 static. It drains after 2 seconds with no spark, and a hit knocks it down a step. A stray caught scores 500, or 1,000 as it goes straight home, times static's multiplier. A wave cleared adds 500 points, and 500 more when no hit was taken on it.",
    );
  });

  it("says a stray caught joins the line in tow, up to the most, or goes straight home, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Stray fuzzball.").closest("li")).toHaveTextContent(
      "Fly into it to catch it: it joins the line in tow, up to 5, or, with the line full, goes straight home.",
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
      "A dash throws the ship ahead, and no rock or comet can hit it while it lasts; it takes 2.5 seconds to charge again.",
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

  it("says a comet hits the ship as a rock does", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Comet.").parentElement).toHaveTextContent(
      "hits the ship as a rock does unless the ship is dashing or shielded.",
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
