import { type ComponentFixture, TestBed } from "@angular/core/testing";
import type { CertificateFiles } from "@fz/brick-wall/app/certificates";
import { loadsSettled } from "@fz/brick-wall/testing/settled";
import { FRAME_MS } from "@fz/core/testing";
import { packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { filesHolding } from "../../testing/lines";
import { STILL, provideSpecPlay } from "../../testing/spec_play";
import { TUNED_NUMBERS } from "../../view/debug/debug_tuning";
import { TUNING_SLIDERS, tuningLines } from "../../view/debug/tuning_menu";
import {
  REPORT_TAG,
  RickashayReports,
  provideBugReports,
} from "../bug_report/bug_report_source";
import { GameService } from "../play/game.service";
import { CERTIFICATE_FILES, RALLY_LINE_FILES } from "./certificates.service";
import { DebugService } from "./debug.service";
import { DebugMenuComponent } from "./debug_menu.component";

/** What a spec gets back from rendering the menu. */
interface RenderedMenu {
  readonly user: UserEvent;
  readonly debug: DebugService;
  readonly game: GameService;
  readonly playLine: ReturnType<typeof vi.fn>;
  readonly loaded: ReturnType<typeof vi.fn>;
  readonly fixture: ComponentFixture<DebugMenuComponent>;
}

/** The lines the menu reads: the certificates' and the rally lines' files, none by default. */
interface MenuFiles {
  readonly certificates?: CertificateFiles;
  readonly rallyLines?: CertificateFiles;
}

/**
 * Renders the debug menu over the specs' levels, its certificates and
 * rally lines read from the files handed it, none by default, once they
 * have loaded.
 */
async function renderMenu({
  certificates = {},
  rallyLines = {},
}: MenuFiles = {}): Promise<RenderedMenu> {
  const playLine = vi.fn();
  const loaded = vi.fn();
  const { fixture } = await render(DebugMenuComponent, {
    on: { playLine, loaded },
    providers: [
      ...provideSpecPlay(),
      ...provideBugReports(),
      { provide: DEBUG_MENU, useValue: true },
      { provide: CERTIFICATE_FILES, useValue: certificates },
      { provide: RALLY_LINE_FILES, useValue: rallyLines },
    ],
  });
  await loadsSettled(fixture);
  return {
    user: userEvent.setup(),
    debug: TestBed.inject(DebugService),
    game: TestBed.inject(GameService),
    playLine,
    loaded,
    fixture,
  };
}

/** Pastes a state into the loader and presses Load, as a developer does. */
async function loadState(user: UserEvent, state: string): Promise<void> {
  await user.click(screen.getByRole("textbox", { name: "Load game state" }));
  await user.paste(state);
  await user.click(screen.getByRole("button", { name: "Load" }));
}

/** Returns the field's depth, as the game lays it out. */
function fieldDepth(): number {
  return TestBed.inject(GameService).shape().depth;
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

  it("offers a slider for each number it tunes, in order", async () => {
    await renderMenu();

    expect(screen.getAllByRole("slider")).toEqual(
      TUNING_SLIDERS.map(({ name }) => screen.getByRole("slider", { name })),
    );
  });

  it("starts each slider at the game's own number, saying it in its unit", async () => {
    await renderMenu();

    const normal = screen.getByRole("slider", { name: "Normal speed" });
    expect(normal).toHaveValue(String(TUNED_NUMBERS.normal));
    expect(normal).toHaveAttribute("aria-valuetext", "14 u/s");
  });

  it("tunes a number as its slider moves", async () => {
    const { debug } = await renderMenu();

    slide("Bored after", 120);

    expect([
      debug.tuning.tuning().bored,
      screen
        .getByRole("slider", { name: "Bored after" })
        .getAttribute("aria-valuetext"),
    ]).toEqual([120, "120 units"]);
  });

  it("tunes the rules a round flies on, and the guide is cast on", async () => {
    const { debug, game } = await renderMenu();

    slide("First floor bounce", 12);
    slide("Guide past its last turn", 1);

    expect([debug.rules().firstBounce, game.fieldRules().guidePast]).toEqual([
      12, 1,
    ]);
  });

  it("says nothing of the certificates or the records while the game is the one that ships", async () => {
    await renderMenu();

    expect(
      screen.queryByText(/This run keeps|are stale/),
    ).not.toBeInTheDocument();
  });

  it("says the certificates are stale, and the records not kept, while a rule is retuned", async () => {
    await renderMenu();

    slide("Hatch holds", 4);

    expect(
      statusSaying(
        "The certificates and rally lines are stale while the rules are retuned. This run keeps no records.",
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
    slide("Bored after", 120);

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(statusSaying("This run keeps no records.")).toHaveRole("status");
  });

  it("puts every number back to the game's own at Reset the numbers", async () => {
    const { user, debug } = await renderMenu();
    slide("Normal speed", 20);
    slide("Floor bounce step", 7);

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(debug.tuning.tuning()).toEqual(TUNED_NUMBERS);
  });

  it("copies the numbers as the lines they would replace", async () => {
    const { user } = await renderMenu();
    slide("Fast from the 25th strike", 33);

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(await navigator.clipboard.readText()).toBe(
      tuningLines({ ...TUNED_NUMBERS, fast25: 33 }),
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

  it.each([
    ["certificate", "Play the certificate"],
    ["rally line", "Play the rally line"],
  ])(
    "offers no %s to play where none holds the level on the depth",
    async (line, name) => {
      await renderMenu();

      expect([
        screen.queryByRole("button", { name }),
        screen.queryByText(
          `No ${line} holds the level in play on the field's depth.`,
        ),
      ]).toEqual([null, expect.anything()]);
    },
  );

  it("says what Play the certificate plays", async () => {
    const { game } = await renderMenu({
      certificates: filesHolding(fieldDepth),
    });

    expect(
      screen.getByRole("button", { name: "Play the certificate" }),
    ).toHaveAccessibleDescription(
      `Plays 2 rounds from the start of level 1, ${String(game.shape().depth)} rows deep. The last one clears the level.`,
    );
  });

  it("says what Play the rally line plays", async () => {
    const { game } = await renderMenu({
      rallyLines: filesHolding(fieldDepth),
    });

    expect(
      screen.getByRole("button", { name: "Play the rally line" }),
    ).toHaveAccessibleDescription(
      `Plays 2 rounds from the start of level 1, ${String(game.shape().depth)} rows deep. The last one reaches the rally mark.`,
    );
  });

  it.each([
    ["the certificate", "certificates"],
    ["the rally line", "rallyLines"],
  ] as const)(
    "plays %s at its button, telling the drawer",
    async (line, files) => {
      const { user, game, playLine, fixture } = await renderMenu({
        [files]: filesHolding(fieldDepth),
      });

      await user.click(screen.getByRole("button", { name: `Play ${line}` }));
      await loadsSettled(fixture);
      game.tick(FRAME_MS, STILL);

      expect({
        told: playLine.mock.calls.length,
        rounds: game.run().rounds,
      }).toEqual({ told: 1, rounds: 1 });
    },
  );

  it("offers to load a reported state, saying it sets the field's depth", async () => {
    await renderMenu();

    expect([
      screen.getByRole("textbox", { name: "Load game state" }),
      screen.getByText(/^Loading a game state also sets the field's depth\./),
    ]).toEqual([expect.anything(), expect.anything()]);
  });

  describe("a reported state", () => {
    installCompressionStreams();

    it("tells the drawer once the state loaded is in play", async () => {
      const { user, game, loaded } = await renderMenu();
      const state = await packState(
        REPORT_TAG,
        TestBed.inject(RickashayReports).capture().value,
      );

      await loadState(user, state);

      await vi.waitFor(() => {
        expect(loaded).toHaveBeenCalledOnce();
      });
      expect(game.outcome()).toBe("paused");
    });

    it("tells the drawer nothing where a state can't be loaded, saying why itself", async () => {
      const { user, loaded } = await renderMenu();

      await loadState(user, "It froze on level 3.");

      await screen.findByText("There is no game state in that text.");
      expect(loaded).not.toHaveBeenCalled();
    });
  });
});
