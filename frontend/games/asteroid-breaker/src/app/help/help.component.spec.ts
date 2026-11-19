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
  burr: pictureOf("burr"),
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
      within(screen.getByRole("table", { name: "Controls" }))
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Turn",
      "Thrust",
      "Fire",
      "Dash",
      "Pause",
      "Resume",
      "Next wave",
      "New game, after a game ends",
    ]);
  });

  it("says the goal, that the crew are your lives and how the game ends, with the written waves' count", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Fly your ship/)).toHaveTextContent(
      "Fly your ship and shoot the rocks. Each one breaks into smaller pieces until it's gone. Clear every rock to finish the wave. If your ship or a rock goes off one edge of the screen, it comes back on the other side. The fuzzballs following your ship are your crew, and each one is a life. If a rock or a comet hits you, one of them is knocked loose. If you're hit with no one following, the game is over. After wave 30, Endless keeps the waves coming until you're out of crew.",
    );
  });

  it("says how the crew start, how long one knocked loose waits to be caught, and that a clearing brings them back, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Your crew\./).parentElement).toHaveTextContent(
      "Your crew. You start with 2 following you, and each stray you catch joins them. If one is knocked loose, fly into it within 6 seconds to get it back, or it floats home. When you clear the wave, any that are still loose come back.",
    );
  });

  it("lists what each thing scores, from the catalog and the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(screen.getByRole("table", { name: "Scoring" }))
        .getAllByRole("row")
        .map((row) => [
          within(row).getByRole("rowheader").textContent,
          within(row).getByRole("cell").textContent,
        ]),
    ).toEqual([
      ["Breaking a rock", "10 to 90, more for smaller rocks"],
      ["Breaking a boulder", "200"],
      ["Collecting a spark", "5"],
      ["Shooting a burr", "10"],
      ["Catching a stray", "500, or 1,000 if your crew is full"],
      ["Clearing a wave", "500"],
      ["Clearing it without a hit", "500 more"],
    ]);
  });

  it("says what static multiplies, what raises it and how it falls, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Static\./).parentElement).toHaveTextContent(
      "Static. Broken rocks give off sparks. Each one you collect adds 1 static, and each near miss adds 2. Static drains after 2 seconds without either, and a hit drops it a step. It multiplies your score: ×2 from 10 static, ×3 from 20 static, ×4 from 30 static.",
    );
  });

  it("says a stray caught joins the crew, or goes straight home with it full, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Stray fuzzball.").closest("li")).toHaveTextContent(
      "Joins your crew when you fly into it. If you already have 5, it goes straight home instead.",
    );
  });

  it.each([
    ["Rocks", ROCK_KIND_IDS.length],
    ["Pickups", PICKUP_IDS.length],
    ["Strays, comets and burrs", 3],
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
        /^A broken rock sometimes drops a pickup/,
      ),
    ).toBeVisible();
  });

  it("says how long a dash takes to charge again, and how it zaps at full static, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/^Dashing\./).parentElement).toHaveTextContent(
      "Dashing. A dash throws your ship forward, and nothing can hit it while it dashes. It takes 2.5 seconds to charge again. When your static is full, at 40, your next dash also zaps up to 6 rocks near its path. A zap uses 20 static.",
    );
  });

  it("says when strays come, from the tuning", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(
        screen.getByRole("region", { name: "Strays, comets and burrs" }),
      ).getByText(/Strays come from wave 3/),
    ).toBeVisible();
  });

  it("says a pilot with no crew following or loose is sent a stray", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      within(
        screen.getByRole("region", { name: "Strays, comets and burrs" }),
      ).getByText(
        /But if you have no crew following you or left to catch, a stray comes right away, once a wave/,
      ),
    ).toBeVisible();
  });

  it("says what a burr does", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Burr.").parentElement).toHaveTextContent(
      "Burr. Homes in on your ship and sticks to it, slowing you down. Shoot it first, or dash to shake it off.",
    );
  });

  it("says what an iron rock does", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Iron.").parentElement).toHaveTextContent(
      "Iron. Takes 3 hits when large and 2 when medium.",
    );
  });

  it("says a comet hits the ship like a rock", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText("Comet.").parentElement).toHaveTextContent(
      "Crosses the screen fast and hits your ship like a rock.",
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
    ["a burr", "Burr", PICTURES.burr],
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
