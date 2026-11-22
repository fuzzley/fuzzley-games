import { TestBed } from "@angular/core/testing";
import { FRAME_MS } from "@fz/core/testing";
import { packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  SPEC_WAVE,
  knockOneLoose,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { TUNED, tuningLines } from "../../view/debug_tuning";
import {
  AsteroidBreakerBugReports,
  provideAsteroidBreakerBugReports,
} from "../bug_report/asteroid_breaker_bug_reports";
import { REPORT_TAG } from "../bug_report/reported_game";
import { GameService } from "../play/game.service";
import { TUNING } from "../tokens";
import { SettingsComponent } from "./settings.component";
import { SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly store: SettingsService;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the settings, open, over the specs' waves, with the debug menu or without it. */
async function renderSettings({
  debugMenu = false,
} = {}): Promise<RenderedSettings> {
  const closed = vi.fn();
  await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: [
      ...provideSpecWaves(),
      { provide: DEBUG_MENU, useValue: debugMenu },
    ],
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    store: TestBed.inject(SettingsService),
    closed,
  };
}

/** Each checkbox of the sound's switches, by its name, and the switch it turns. */
const SOUND_BOXES = [
  ["Play sounds", "sound"],
  ["Play sound effects", "effects"],
  ["Play fuzzball voices", "voice"],
  ["Play music", "bed"],
  ["One speaker", "mono"],
] as const;

/** The boxes of the parts of the sound, each on until turned off. */
const PARTS = SOUND_BOXES.filter(
  ([, part]) => part === "effects" || part === "voice" || part === "bed",
);

describe("SettingsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(SettingsComponent, {
      inputs: { open: false },
      providers: provideSpecWaves(),
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  describe("the speed", () => {
    it("shows the speed in use as chosen", async () => {
      await renderSettings();

      expect(screen.getByRole("radio", { name: /^Normal/ })).toBeChecked();
    });

    it("starts a run at the speed chosen", async () => {
      const { user, game } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Fast/ }));

      expect(game.speed()).toBe("fast");
      expect(screen.getByRole("radio", { name: /^Fast/ })).toBeChecked();
    });

    it("asks before a new speed throws away the run under way", async () => {
      const { user, game } = await renderSettings();
      game.tick(FRAME_MS, shoot(game));

      await user.click(screen.getByRole("radio", { name: /^Relaxed/ }));

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Relaxed game?",
      );
    });

    it("starts no run at the speed in use", async () => {
      const { user, game } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Normal/ }));

      expect(game.runs()).toBe(0);
    });
  });

  describe("the deck", () => {
    it("shows on a touch screen until another time is chosen", async () => {
      await renderSettings();

      expect(
        screen.getByRole("radio", { name: /^On a touch screen/ }),
      ).toBeChecked();
    });

    it("shows as chosen", async () => {
      const { user, store } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Always/ }));

      expect(store.settings().deck).toBe("always");
      expect(screen.getByRole("radio", { name: /^Always/ })).toBeChecked();
    });
  });

  it("puts the stick on the right at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(
      screen.getByRole("checkbox", { name: "Stick on the right" }),
    );

    expect(store.settings().stickOnRight).toBe(true);
  });

  it("has the ship fire by itself at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Auto-fire" }));

    expect(store.settings().fireByItself).toBe(true);
  });

  it("buzzes the phone until told otherwise", async () => {
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Buzz the phone" }),
    ).toBeChecked();
  });

  it("turns the haptics off at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Buzz the phone" }));

    expect(store.settings().haptics).toBe(false);
  });

  it("plays sounds until told otherwise", async () => {
    await renderSettings();

    expect(screen.getByRole("checkbox", { name: "Play sounds" })).toBeChecked();
  });

  it("turns the sound off at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Play sounds" }));

    expect(store.settings().sound).toBe(false);
  });

  describe("the sound's parts", () => {
    it("hold every switch of the sound in one group, Sound", async () => {
      await renderSettings();

      const group = screen.getByRole("group", { name: "Sound" });

      expect(
        SOUND_BOXES.map(([name]) =>
          within(group).queryByRole("checkbox", { name }),
        ),
      ).not.toContain(null);
    });

    it.each(PARTS)("check %s until told otherwise", async (name) => {
      await renderSettings();

      expect(screen.getByRole("checkbox", { name })).toBeChecked();
    });

    it.each(PARTS)("turn %s off at its checkbox", async (name, part) => {
      const { user, store } = await renderSettings();

      await user.click(screen.getByRole("checkbox", { name }));

      expect(store.settings()[part]).toBe(false);
    });

    it("play in two ears until told otherwise", async () => {
      await renderSettings();

      expect(
        screen.getByRole("checkbox", { name: "One speaker" }),
      ).not.toBeChecked();
    });

    it("play in one ear at its checkbox", async () => {
      const { user, store } = await renderSettings();

      await user.click(screen.getByRole("checkbox", { name: "One speaker" }));

      expect(store.settings().mono).toBe(true);
    });

    it.each(SOUND_BOXES)(
      "show %s as its own switch says, the others as theirs",
      async (_, part) => {
        const { store } = await renderSettings();

        store.update({ [part]: !store.settings()[part] });
        TestBed.tick();

        expect(
          SOUND_BOXES.map(
            ([name]) =>
              screen.getByRole<HTMLInputElement>("checkbox", { name }).checked,
          ),
        ).toEqual(SOUND_BOXES.map(([, each]) => store.settings()[each]));
      },
    );
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Midnight blue/ })).toBeVisible();
  });

  it("offers the debug menu in the drawer where DEBUG_MENU says so", async () => {
    await renderSettings({ debugMenu: true });

    expect(
      within(screen.getByRole("dialog")).getByRole("region", { name: "Debug" }),
    ).toBeVisible();
  });

  it("offers no debug menu in a build for players", async () => {
    await renderSettings();

    expect(
      screen.queryByRole("region", { name: "Debug" }),
    ).not.toBeInTheDocument();
  });

  // user-event's setup() puts a clipboard of its own on the page.
  describe("the debug menu", () => {
    /** Moves a slider to a value, as a finger or the arrow keys would. */
    function slide(name: string, value: number): void {
      fireEvent.input(screen.getByRole("slider", { name }), {
        target: { value: String(value) },
      });
    }

    it("starts each slider at tuning.ts's number, saying it in its unit", async () => {
      await renderSettings({ debugMenu: true });

      const thrust = screen.getByRole("slider", { name: "Thrust" });
      expect(thrust).toHaveValue(String(TUNED.thrust));
      expect(thrust).toHaveAttribute("aria-valuetext", "24 u/s²");
    });

    it("tunes the numbers as a slider moves", async () => {
      await renderSettings({ debugMenu: true });

      slide("Rocks' speed", 1.5);

      expect(TestBed.inject(TUNING).tuning().rockSpeed).toBe(1.5);
      expect(
        screen.getByRole("slider", { name: "Rocks' speed" }),
      ).toHaveAttribute("aria-valuetext", "×1.50");
    });

    it("lets shots leave without the ship's speed at its checkbox", async () => {
      const { user } = await renderSettings({ debugMenu: true });

      await user.click(
        screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
      );

      expect(TestBed.inject(TUNING).tuning().carryShip).toBe(false);
    });

    it("ticks the shots' box again at Reset the numbers", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      const carry = screen.getByRole("checkbox", {
        name: "Shots carry the ship's speed",
      });
      await user.click(carry);

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(carry).toBeChecked();
    });

    it("puts every number back to tuning.ts's at Reset the numbers", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      slide("Thrust", 40);
      await user.click(
        screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
      );

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(TestBed.inject(TUNING).tuning()).toEqual(TUNED);
    });

    it("copies the numbers as the lines of tuning.ts they would replace", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      slide("Top speed", 18);

      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      expect(await navigator.clipboard.readText()).toBe(
        tuningLines({ ...TUNED, topSpeed: 18 }),
      );
    });
  });

  describe("a bug report", () => {
    installCompressionStreams();

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideAsteroidBreakerBugReports()],
      });
    });

    it("is offered as the game takes reports", async () => {
      await renderSettings();

      expect(
        screen.getByRole("button", { name: "Report a bug" }),
      ).toBeInTheDocument();
    });

    it("asks for a reported state to load in the debug menu, where the game offers it", async () => {
      await renderSettings({ debugMenu: true });

      const debug = screen.getByRole("region", { name: "Debug" });

      expect(
        within(debug).getByRole("textbox", { name: "Load game state" }),
      ).toBeInTheDocument();
      expect(
        within(debug).getByText(
          /^The numbers above change to the ones in the report\./,
        ),
      ).toBeInTheDocument();
    });

    it("asks for none where the game doesn't offer its debug menu", async () => {
      await renderSettings();

      expect(
        screen.queryByRole("textbox", { name: "Load game state" }),
      ).not.toBeInTheDocument();
    });

    it("asks to close once a reported state is loaded", async () => {
      const { user, game, closed } = await renderSettings({ debugMenu: true });
      await game.startAt(SPEC_WAVE.gift);
      knockOneLoose(game);
      game.pause();
      const state = TestBed.inject(AsteroidBreakerBugReports).capture().value;
      const starting = game.newGame();
      TestBed.inject(ConfirmService).accept();
      await starting;

      await user.click(
        screen.getByRole("textbox", { name: "Load game state" }),
      );
      await user.paste(await packState(REPORT_TAG, state));
      await user.click(screen.getByRole("button", { name: "Load" }));

      await vi.waitFor(() => {
        expect(closed).toHaveBeenCalledOnce();
      });
    });
  });
});
