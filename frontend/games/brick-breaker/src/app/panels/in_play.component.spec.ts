import { render, screen, within } from "@testing-library/angular";
import { brickKind } from "../../rules/catalog/bricks";
import type { CapsuleId } from "../../rules/catalog/capsules";
import { partHeaded } from "../../testing/heard";
import { PICTURE_FRAMES, type Pictures } from "../../view/art/art";
import { InPlayComponent } from "./in_play.component";
import type { EffectInPlay, KindHere } from "./panels";

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
};

/** Says what differs in the panel from one at no streak, with nothing in effect, nothing to show and no pictures yet. */
interface InPlayOptions {
  readonly streak?: number;
  readonly effects?: readonly EffectInPlay[];
  readonly kinds?: readonly KindHere[];
  readonly capsules?: readonly CapsuleId[];
  readonly pictures?: Pictures | null;
}

/** Renders the panel and returns its region. */
async function renderInPlay({
  streak = 0,
  effects = [],
  kinds = [],
  capsules = [],
  pictures = null,
}: InPlayOptions = {}): Promise<HTMLElement> {
  await render(InPlayComponent, {
    inputs: { streak, effects, kinds, capsules, pictures },
  });
  return screen.getByRole("region", { name: "In play" });
}

/** The elements a query passes over to find only what assistive technology hears: those hidden from it, and scripts and styles. */
const SHOWN_ONLY =
  "script, style, [aria-hidden='true'], [aria-hidden='true'] *";

/** A wide paddle half through its time, and a catch that waits to be used. */
const EFFECTS: readonly EffectInPlay[] = [
  { capsule: "wide", share: 0.5, seconds: 10 },
  { capsule: "catch", share: 1, seconds: null },
];

describe("InPlayComponent", () => {
  it("is a region named by its heading", async () => {
    const panel = await renderInPlay();

    expect(panel).toContainElement(
      screen.getByRole("heading", { level: 2, name: "In play" }),
    );
  });

  it("keeps each part a single element under its heading, which a short panel drops past the second", async () => {
    const panel = await renderInPlay();

    expect(Array.from(panel.children, (child) => child.tagName)).toEqual([
      "H2",
      "SECTION",
      "SECTION",
      "SECTION",
      "SECTION",
    ]);
  });

  it("shows the streak's multiplier and the bricks broken since the paddle", async () => {
    await renderInPlay({ streak: 12 });

    const streak = within(partHeaded("Streak"));
    expect({
      times: streak.queryByText("×3", { ignore: SHOWN_ONLY }),
      bricks: streak.queryByText("12 bricks"),
    }).toEqual({
      times: expect.anything() as unknown,
      bricks: expect.anything() as unknown,
    });
  });

  it("shows a multiplier of one before the streak reaches the first", async () => {
    await renderInPlay({ streak: 4 });

    expect(
      within(partHeaded("Streak")).getByText("×1", { ignore: SHOWN_ONLY }),
    ).toBeInTheDocument();
  });

  it("ticks the meter, hidden from assistive technology, at each multiplier, those the streak has reached lit", async () => {
    await renderInPlay({ streak: 12 });

    const ticks = Array.from(
      partHeaded("Streak").querySelectorAll<HTMLElement>(
        "[aria-hidden='true'] > *",
      ),
      (tick) => [
        tick.textContent,
        tick.style.getPropertyValue("--at"),
        tick.getAttribute("data-reached"),
      ],
    );
    expect(ticks).toEqual([
      ["×2", "25%", "true"],
      ["×3", "50%", "true"],
      ["×4", "100%", "false"],
    ]);
  });

  it.each([
    { streak: 12, filled: "60%" },
    { streak: 25, filled: "100%" },
  ])(
    "fills the meter as far as the streak, up to the last multiplier's start: $streak",
    async ({ streak, filled }) => {
      await renderInPlay({ streak });

      const meter = partHeaded("Streak").querySelector<HTMLElement>(
        "[aria-hidden='true']",
      );
      expect(meter?.style.getPropertyValue("--filled")).toBe(filled);
    },
  );

  it("names each effect in play, with its time left in words", async () => {
    await renderInPlay({ effects: EFFECTS });

    const effects = within(partHeaded("In effect"));
    expect(
      effects.getAllByRole("listitem").map((item) => ({
        name: within(item).queryByText(/^(Wide paddle|Catch)$/)?.textContent,
        left: within(item).queryByText(/^(\d+ seconds? left|ready)$/, {
          ignore: SHOWN_ONLY,
        })?.textContent,
      })),
    ).toEqual([
      { name: "Wide paddle", left: "10 seconds left" },
      { name: "Catch", left: "ready" },
    ]);
  });

  it("shows each effect's whole seconds left short, hidden from assistive technology", async () => {
    await renderInPlay({ effects: EFFECTS });

    expect(within(partHeaded("In effect")).getByText("10 s")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("rings each effect, emptied by the share of its time left", async () => {
    await renderInPlay({ effects: EFFECTS });

    const dashes = Array.from(
      partHeaded("In effect").querySelectorAll(
        "[aria-hidden='true'] circle[stroke-dasharray]",
      ),
      (share) => share.getAttribute("stroke-dasharray"),
    );
    expect(dashes).toEqual(["50 100", "100 100"]);
  });

  it("shows each effect's capsule in its ring, once the scene has drawn it", async () => {
    await renderInPlay({ effects: EFFECTS, pictures: PICTURES });

    expect(
      Array.from(
        partHeaded("In effect").querySelectorAll("[aria-hidden='true'] img"),
        (img) => img.getAttribute("src"),
      ),
    ).toEqual([pictureOf("wide"), PICTURE_FRAMES.capsules.catch]);
  });

  it("says no capsule is in effect while none is", async () => {
    await renderInPlay();

    expect(
      within(partHeaded("In effect")).getByRole("listitem"),
    ).toHaveTextContent("No capsule in effect");
  });

  it("lists the level's kinds of brick, each with what it does, one new here marked", async () => {
    await renderInPlay({
      kinds: [
        { id: "plain", isNew: false },
        { id: "steel", isNew: true },
      ],
    });

    const kinds = within(partHeaded("In this level")).getAllByRole("listitem");
    expect(
      kinds.map((kind) =>
        Array.from(kind.children, (part) =>
          part.textContent.replace(/\s+/g, " ").trim(),
        ),
      ),
    ).toEqual([
      ["Brick", brickKind("plain").about],
      ["Steel brick New here", brickKind("steel").about],
    ]);
  });

  it("pictures each kind of brick as How to play does, once the scene has drawn them", async () => {
    await renderInPlay({
      kinds: [{ id: "steel", isNew: false }],
      pictures: PICTURES,
    });

    expect(
      within(partHeaded("In this level")).getByRole("presentation"),
    ).toHaveAttribute("src", pictureOf("steel"));
  });

  it("lists the capsules that can fall, each by name", async () => {
    await renderInPlay({ capsules: ["wide", "catch"] });

    expect(
      within(partHeaded("Capsules here"))
        .getAllByRole("listitem")
        .map((item) => item.textContent.trim()),
    ).toEqual(["Wide paddle", "Catch"]);
  });

  it("shows each capsule's picture, its name kept for assistive technology", async () => {
    await renderInPlay({ capsules: ["wide"], pictures: PICTURES });

    const capsules = within(partHeaded("Capsules here"));
    expect({
      picture: capsules.getByRole("presentation").getAttribute("src"),
      name: capsules.getByText("Wide paddle").className,
    }).toEqual({ picture: pictureOf("wide"), name: "fz-visually-hidden" });
  });

  it("says none fall where no capsule can", async () => {
    await renderInPlay();

    expect(
      within(partHeaded("Capsules here")).getByRole("listitem"),
    ).toHaveTextContent("None fall here");
  });
});
