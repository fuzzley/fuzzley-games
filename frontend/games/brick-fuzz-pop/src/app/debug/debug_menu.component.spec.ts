import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { TUNED_NUMBERS, tuningLines } from "../../view/debug/debug_tuning";
import { DebugService } from "./debug.service";
import {
  type CertificateOffer,
  DebugMenuComponent,
} from "./debug_menu.component";

/** What a spec gets back from rendering the menu. */
interface RenderedMenu {
  readonly user: UserEvent;
  readonly debug: DebugService;
  readonly playCertificate: ReturnType<typeof vi.fn>;
  readonly fixture: ComponentFixture<DebugMenuComponent>;
}

/** Renders the debug menu, offering a certificate or none. */
async function renderMenu(
  certificate: CertificateOffer | null = null,
): Promise<RenderedMenu> {
  const playCertificate = vi.fn();
  const { fixture } = await render(DebugMenuComponent, {
    inputs: { certificate },
    on: { playCertificate },
  });
  return {
    user: userEvent.setup(),
    debug: TestBed.inject(DebugService),
    playCertificate,
    fixture,
  };
}

/** Moves a slider to a value, as a finger or the arrow keys would. */
function slide(name: string, value: number): void {
  fireEvent.input(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });
}

/** Returns the line holding a status's words, as the menu shows them. */
function statusSaying(words: string): HTMLElement {
  return screen.getByText(words);
}

/** Returns the list of the field's depths. */
function depthList(): HTMLElement {
  return screen.getByRole("combobox", { name: "The field's depth" });
}

/** Returns the depth list's option a name names. */
function depthOption(name: string): HTMLElement {
  return screen.getByRole("option", { name });
}

describe("DebugMenuComponent", () => {
  it("is the region named Debug", async () => {
    await renderMenu();

    expect(screen.getByRole("region", { name: "Debug" })).toBeInTheDocument();
  });

  it("starts each slider at the game's own number, saying it in its unit", async () => {
    await renderMenu();

    const normal = screen.getByRole("slider", { name: "Normal speed" });
    expect(normal).toHaveValue(String(TUNED_NUMBERS.normalPace));
    expect(normal).toHaveAttribute("aria-valuetext", "14 u/s");
  });

  it("tunes a number as its slider moves", async () => {
    const { debug } = await renderMenu();

    slide("Bored after", 80);

    expect(debug.tuning.tuning().bored).toBe(80);
    expect(screen.getByRole("slider", { name: "Bored after" })).toHaveAttribute(
      "aria-valuetext",
      "80 units",
    );
  });

  it("says nothing of the certificates or the records while the game is the one that ships", async () => {
    await renderMenu();

    expect(
      screen.queryByText(/This run keeps|are stale/),
    ).not.toBeInTheDocument();
  });

  it("says the certificates are stale, and the records not kept, while the boredom is retuned", async () => {
    await renderMenu();

    slide("Bored after", 80);

    expect(
      statusSaying(
        "The certificates are stale while the rules are retuned. This run keeps no records.",
      ),
    ).toHaveRole("status");
  });

  it("says only that the run keeps no records once the flight's pace is retuned", async () => {
    await renderMenu();

    slide("Fast-forward", 6);

    expect(statusSaying("This run keeps no records.")).toHaveRole("status");
  });

  it("still says the run keeps no records once the numbers are put back", async () => {
    const { user } = await renderMenu();
    slide("Bored after", 80);

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(statusSaying("This run keeps no records.")).toHaveRole("status");
  });

  it("puts every number back to the game's own at Reset the numbers", async () => {
    const { user, debug } = await renderMenu();
    slide("Normal speed", 20);
    slide("Bored after", 80);

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(debug.tuning.tuning()).toEqual(TUNED_NUMBERS);
  });

  it("copies the numbers as the lines they would replace", async () => {
    const { user } = await renderMenu();
    slide("The guide past its first turn", 3);

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(await navigator.clipboard.readText()).toBe(
      tuningLines({ ...TUNED_NUMBERS, guidePastTurn: 3 }),
    );
  });

  it("offers the room's depth and every depth a field takes", async () => {
    await renderMenu();

    expect(
      screen.getAllByRole("option").map((option) => option.textContent.trim()),
    ).toEqual([
      "The room's",
      ...Array.from({ length: 12 }, (_, step) => `${String(11 + step)} rows`),
    ]);
  });

  it("sets the field's depth from its list", async () => {
    const { user, debug } = await renderMenu();

    await user.selectOptions(depthList(), depthOption("16 rows"));

    expect(debug.depth()).toBe(16);
  });

  it("gives the depth back to the room's from its list", async () => {
    const { user, debug } = await renderMenu();
    debug.setDepth(16);

    await user.selectOptions(depthList(), depthOption("The room's"));

    expect(debug.depth()).toBeNull();
  });

  it("shows the depth the menu has set", async () => {
    const { debug, fixture } = await renderMenu();

    debug.setDepth(19);
    await fixture.whenStable();

    expect(depthOption("19 rows")).toHaveProperty("selected", true);
  });

  it("says a run begun at a locked level keeps no records", async () => {
    await renderMenu();

    expect(
      screen.getByRole("checkbox", { name: "Open every level" }),
    ).toHaveAccessibleDescription(
      "The Levels dialog offers each level, locked or not, and a run begun at a locked one keeps no records. Reset the numbers leaves it.",
    );
  });

  it("opens every level at its checkbox", async () => {
    const { user, debug } = await renderMenu();

    await user.click(
      screen.getByRole("checkbox", { name: "Open every level" }),
    );

    expect(debug.everyLevelOpen()).toBe(true);
  });

  it("offers no certificate to play where none holds the level on the depth", async () => {
    await renderMenu();

    expect(
      screen.queryByRole("button", { name: "Play the certificate" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No certificate holds the level in play on the field's depth.",
      ),
    ).toBeInTheDocument();
  });

  it("says what Play the certificate plays", async () => {
    await renderMenu({ level: 3, depth: 14, rounds: 6 });

    expect(
      screen.getByRole("button", { name: "Play the certificate" }),
    ).toHaveAccessibleDescription(
      "Plays level 3 from its start on a field 14 deep, its certificate's 6 rounds one at a time.",
    );
  });

  it("hands Play the certificate on", async () => {
    const { user, playCertificate } = await renderMenu({
      level: 1,
      depth: 11,
      rounds: 1,
    });

    await user.click(
      screen.getByRole("button", { name: "Play the certificate" }),
    );

    expect(playCertificate).toHaveBeenCalledOnce();
  });
});
