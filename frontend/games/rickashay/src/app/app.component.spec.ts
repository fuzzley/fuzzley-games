import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { collectErrors, provideFakePhaserCanvas } from "@fz/phaser/testing";
import { paintRoles } from "@fz/style/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import type { Pictures } from "../scene/pictures";
import { type HeldLoad, OFFLINE, heldLoad } from "../testing/loads";
import { PALETTES } from "../testing/roles";
import {
  type SpecRound,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../testing/spec_play";
import { FIELD_ROLES } from "../view/colors/palette";
import { AppComponent, HELP_FAILED_WORDS } from "./app.component";
import {
  REPORT_TAG,
  RickashayReports,
  provideBugReports,
} from "./bug_report/bug_report_source";
import { HelpComponent } from "./help/help.component";
import { HELP_KIND_IDS } from "./help/kinds";
import { GameService } from "./play/game.service";
import { SettingsService } from "./settings/settings.service";
import { LOAD_HELP } from "./tokens";

/** The app rendered, and its game. */
interface RenderedApp {
  readonly game: GameService;
  /** Shows what the page holds now, without waiting for a load, as `settle()` does. */
  readonly detectChanges: () => void;
  /** Waits for the page to be stable, a chunk loaded meanwhile shown. */
  readonly settle: () => Promise<void>;
}

/** The app rendered with How to play's chunk held, as a slow connection holds it. */
interface HeldHelpApp extends RenderedApp {
  /** How to play's load, which waits until the spec lets it arrive or fail. */
  readonly help: HeldLoad;
}

/**
 * Renders the app on a fake canvas, its rounds played as a script says,
 * over the specs' levels, taking bug reports as `main.ts` has it, with no
 * debug menu offered.
 */
async function renderApp(
  ...script: readonly SpecRound[]
): Promise<RenderedApp> {
  return renderAppWith([], script);
}

/** Renders the app as `renderApp()` does, with providers of the spec's own. */
async function renderAppWith(
  providers: readonly Provider[],
  script: readonly SpecRound[] = [],
): Promise<RenderedApp> {
  const { fixture } = await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      ...provideSpecPlay(scriptedRounds(...script)),
      ...provideBugReports(),
      { provide: DEBUG_MENU, useValue: false },
      ...providers,
    ],
  });
  await fixture.whenStable();
  return {
    game: TestBed.inject(GameService),
    detectChanges: () => {
      fixture.detectChanges();
    },
    settle: () => fixture.whenStable(),
  };
}

/** Renders the app as `renderApp()` does, How to play's chunk held until the spec lets it arrive or fail. */
async function renderHeldHelp(): Promise<HeldHelpApp> {
  const help = heldLoad(HelpComponent);
  const app = await renderAppWith([
    { provide: LOAD_HELP, useValue: help.load },
  ]);
  return { ...app, help };
}

/** Renders the app as `renderApp()` does, with the debug menu offered, as at `?debug`. */
async function renderDebugApp(): Promise<RenderedApp> {
  return renderAppWith([{ provide: DEBUG_MENU, useValue: true }]);
}

/** Returns a picture as the scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/** Returns the bar's button a name names. */
function barButton(name: string): HTMLElement {
  return within(screen.getByRole("banner")).getByRole("button", { name });
}

/**
 * Returns every How to play dialog in the page, shut or open. A shut one is
 * hidden, and Testing Library gives a hidden element no name, so the label
 * is read off each dialog.
 */
function helpDialogs(): HTMLElement[] {
  return screen
    .queryAllByRole("dialog", { hidden: true })
    .filter((dialog) => dialog.getAttribute("aria-label") === "How to play");
}

/** Plays rounds until the level's end, and renders the result or the card. */
function playToEnd({ game, detectChanges }: RenderedApp): void {
  playUntilCard(game);
  detectChanges();
}

describe("AppComponent", () => {
  beforeEach(() => {
    // The board draws its field in the palette's inks, which jsdom has no
    // stylesheet to give it.
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("classic", FIELD_ROLES));
  });

  it("names the game in the page's one heading, in the bar", async () => {
    await renderApp();

    expect(
      within(screen.getByRole("banner")).getByRole("heading", {
        level: 1,
        name: "Rickashay",
      }),
    ).toBeInTheDocument();
  });

  it("shows the shots against par in the bar", async () => {
    await renderApp();

    expect(
      within(screen.getByRole("banner")).getByText("0 shots, par 8"),
    ).toBeInTheDocument();
  });

  it("goes on with the paused level as the bar's Resume asks, and hands the board back the focus", async () => {
    const app = await renderApp();
    release(app.game);
    app.game.pause();
    app.detectChanges();

    await userEvent.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Resume",
      }),
    );

    expect([app.game.outcome(), screen.getByRole("application")]).toEqual([
      "playing",
      expect.toHaveFocus() as unknown,
    ]);
  });

  it("skips the flight in the air as the bar's Skip asks", async () => {
    const app = await renderApp("rally");
    release(app.game);
    app.detectChanges();

    await userEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(app.game.flying()).toBe(false);
  });

  it.each([
    [
      "switches fast-forward on",
      "Fast-forward",
      (game: GameService) => game.fast(),
      true,
    ],
    [
      "turns the sound off",
      "Sound",
      (game: GameService) => game.soundOn(),
      false,
    ],
  ] as const)("%s as the bar asks", async (_, name, read, after) => {
    const { game } = await renderApp();

    await userEvent.click(screen.getByRole("button", { name }));

    expect(read(game)).toBe(after);
  });

  it.each([
    ["Levels", "Levels"],
    ["Settings", "Settings"],
  ])("opens %s as the bar asks", async (button, dialog) => {
    await renderApp();

    await userEvent.click(screen.getByRole("button", { name: button }));

    expect(screen.getByRole("dialog", { name: dialog })).toBeVisible();
  });

  it("offers the bar's Release where the settings ask for it", async () => {
    const app = await renderApp();

    TestBed.inject(SettingsService).update({ releaseByButton: true });
    app.detectChanges();

    expect(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Release",
      }),
    ).toBeInTheDocument();
  });

  it("asks before the bar's New game throws away a level under way", async () => {
    const app = await renderApp();
    release(app.game);
    app.detectChanges();

    await userEvent.click(screen.getByRole("button", { name: "New game" }));

    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("shows the result over a level lost", async () => {
    const app = await renderApp("lost");

    playToEnd(app);

    expect(
      screen.getByRole("alertdialog", { name: "Game over" }),
    ).toBeVisible();
  });

  it("puts the result away and opens Levels as the result's Choose a level asks", async () => {
    const app = await renderApp("lost");
    playToEnd(app);

    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    expect([
      screen.queryByRole("alertdialog"),
      screen.getByRole("dialog", { name: "Levels" }),
    ]).toEqual([null, expect.anything()]);
  });

  it("lists a level cleared with its stars in Levels", async () => {
    const app = await renderApp("cleared", "lost");
    playToEnd(app);
    app.game.nextLevel();
    playToEnd(app);

    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    expect(
      within(screen.getByRole("dialog", { name: "Levels" })).getByRole(
        "button",
        { name: /^1 First bounce/ },
      ),
    ).toHaveTextContent("2 of 3 stars");
  });

  it("starts a run at the level chosen in Levels, and closes it", async () => {
    const app = await renderApp("lost");
    playToEnd(app);
    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /^1 First bounce/ }),
    );

    expect([
      screen.queryByRole("dialog", { name: "Levels" }),
      app.game.outcome(),
    ]).toEqual([null, "ready"]);
  });

  it("keeps Levels open, and the level under way, where the player cancels the level chosen", async () => {
    const app = await renderApp();
    release(app.game);
    app.detectChanges();
    const run = app.game.run().id;
    await userEvent.click(barButton("Levels"));
    await userEvent.click(
      screen.getByRole("button", { name: /^1 First bounce/ }),
    );

    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      }),
    );

    expect([
      screen.getByRole("dialog", { name: "Levels" }),
      app.game.run().id,
    ]).toEqual([expect.anything(), run]);
  });

  it("starts a new game from the result once every level is cleared", async () => {
    const app = await renderApp("cleared");
    await app.game.startAt(3);
    playToEnd(app);

    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "New game",
      }),
    );

    expect([screen.queryByRole("alertdialog"), app.game.run().level]).toEqual([
      null,
      3,
    ]);
  });
  describe("a bug report", () => {
    installCompressionStreams();

    it("opens from the settings, filed as Rickashay's", async () => {
      await renderApp();
      await userEvent.click(barButton("Settings"));

      await userEvent.click(
        screen.getByRole("button", { name: "Report a bug" }),
      );
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      const link = within(report).getByRole("link", { name: /^Open GitHub/ });
      expect(
        new URL(link.getAttribute("href") ?? "").searchParams.get("title"),
      ).toBe("[Rickashay] ");
    });

    it("offers no reported state to load where the debug menu isn't offered", async () => {
      await renderApp();

      await userEvent.click(barButton("Settings"));

      expect(
        screen.queryByRole("textbox", { name: "Load game state" }),
      ).not.toBeInTheDocument();
    });

    it("offers a reported state to load in the settings at ?debug", async () => {
      await renderDebugApp();

      await userEvent.click(barButton("Settings"));

      expect(
        screen.getByRole("textbox", { name: "Load game state" }),
      ).toBeVisible();
    });

    it("puts the settings away once the reported state loaded is in play", async () => {
      const { game } = await renderDebugApp();
      const state = await packState(
        REPORT_TAG,
        TestBed.inject(RickashayReports).capture().value,
      );
      await userEvent.click(barButton("Settings"));

      await userEvent.click(
        screen.getByRole("textbox", { name: "Load game state" }),
      );
      await userEvent.paste(state);
      await userEvent.click(screen.getByRole("button", { name: "Load" }));

      await vi.waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Settings" }),
        ).not.toBeInTheDocument();
      });
      expect(game.outcome()).toBe("paused");
    });
  });

  describe("How to play", () => {
    it("is nowhere in the page until it first opens, as it loads only then", async () => {
      await renderApp();

      expect(helpDialogs()).toEqual([]);
    });

    it("opens as the bar's How to play asks", async () => {
      const { settle } = await renderApp();

      await userEvent.click(barButton("How to play"));
      await settle();

      expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    });

    it("closes at Escape", async () => {
      const { settle } = await renderApp();
      await userEvent.click(barButton("How to play"));
      await settle();

      await userEvent.keyboard("{Escape}");
      await settle();

      expect(
        screen.queryByRole("dialog", { name: "How to play" }),
      ).not.toBeInTheDocument();
    });

    it("opens the one it loaded again", async () => {
      const { settle } = await renderApp();
      await userEvent.click(barButton("How to play"));
      await settle();
      await userEvent.keyboard("{Escape}");
      await settle();

      await userEvent.click(barButton("How to play"));
      await settle();

      expect(helpDialogs()).toEqual([
        screen.getByRole("dialog", { name: "How to play" }),
      ]);
    });

    it("leaves the scene's pictures unasked before it first opens, the Ready card gone", async () => {
      // A shot let fly, as the board's Ready card asks for the kind of
      // brick a level brings in.
      const { game, settle } = await renderApp("step");
      release(game);
      const pictures = vi.fn<() => Pictures>();
      game.onPictures(pictures);

      await settle();

      expect(pictures).not.toHaveBeenCalled();
    });

    it("asks the scene for no picture once it is put away", async () => {
      const { game, settle } = await renderApp("step");
      release(game);
      await userEvent.click(barButton("How to play"));
      await settle();
      await userEvent.keyboard("{Escape}");
      await settle();
      const pictures = vi.fn<() => Pictures>();
      game.onPictures(pictures);

      await settle();

      expect(pictures).not.toHaveBeenCalled();
    });

    it("shows the pictures the scene drew as it opens", async () => {
      const { game, settle } = await renderApp();
      const bricks = {
        brick: pictureOf("brick"),
        tough: pictureOf("tough"),
        steel: pictureOf("steel"),
        ramp: pictureOf("ramp"),
        hatch: pictureOf("hatch"),
        spring: pictureOf("spring"),
        gem: pictureOf("gem"),
        portal: pictureOf("portal"),
      };
      game.onPictures(() => ({
        bricks,
        springs: { off: pictureOf("off"), on: pictureOf("on") },
      }));

      await userEvent.click(barButton("How to play"));
      await settle();

      expect(
        within(screen.getByRole("dialog", { name: "How to play" }))
          .getAllByRole("presentation")
          .map((img) => img.getAttribute("src")),
      ).toEqual(HELP_KIND_IDS.map((kind) => bricks[kind]));
    });

    describe("on a slow connection", () => {
      it("shows its button busy while it loads", async () => {
        const { detectChanges } = await renderHeldHelp();

        await userEvent.click(barButton("How to play"));
        detectChanges();

        expect(barButton("How to play")).toHaveAttribute("aria-busy", "true");
      });

      it("opens once it has loaded, its button no longer busy", async () => {
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        help.arrive();
        await settle();

        expect({
          dialog: screen.getByRole("dialog", { name: "How to play" }),
          busy: barButton("How to play").getAttribute("aria-busy"),
        }).toEqual({ dialog: expect.toBeVisible() as unknown, busy: null });
      });

      it("drops the opening at Escape, so it doesn't open over the board later", async () => {
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        await userEvent.keyboard("{Escape}");
        help.arrive();
        await settle();

        expect({
          dialog: screen.queryByRole("dialog", { name: "How to play" }),
          busy: barButton("How to play").getAttribute("aria-busy"),
        }).toEqual({ dialog: null, busy: null });
      });

      it("drops the opening as the focus leaves the bar", async () => {
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        screen.getByRole("application").focus();
        help.arrive();
        await settle();

        expect(
          screen.queryByRole("dialog", { name: "How to play" }),
        ).not.toBeInTheDocument();
      });

      it("drops the opening at a press outside the bar, where the press moved no focus", async () => {
        const { help, settle } = await renderHeldHelp();
        const board = screen.getByRole("application");
        board.focus();
        // A click that focuses no button, as Safari's.
        fireEvent.click(barButton("How to play"));

        fireEvent.pointerDown(board);
        help.arrive();
        await settle();

        expect(
          screen.queryByRole("dialog", { name: "How to play" }),
        ).not.toBeInTheDocument();
      });

      it("drops the opening at a key pressed outside the bar, where the press moved no focus", async () => {
        const { help, settle } = await renderHeldHelp();
        const board = screen.getByRole("application");
        board.focus();
        fireEvent.click(barButton("How to play"));

        fireEvent.keyDown(board, { key: " ", code: "Space" });
        help.arrive();
        await settle();

        expect(
          screen.queryByRole("dialog", { name: "How to play" }),
        ).not.toBeInTheDocument();
      });

      it("drops the opening at Escape on a card's button, which keeps its keys from the page", async () => {
        const { game, help, settle } = await renderHeldHelp();
        release(game);
        game.pause();
        await settle();
        const resume = within(screen.getByRole("main")).getByRole("button", {
          name: "Resume",
        });
        resume.focus();
        fireEvent.click(barButton("How to play"));

        fireEvent.keyDown(resume, { key: "Escape", code: "Escape" });
        help.arrive();
        await settle();

        expect(
          screen.queryByRole("dialog", { name: "How to play" }),
        ).not.toBeInTheDocument();
      });

      it.each(["Tab", "Shift"])(
        "keeps the opening at %s outside the bar, which moves along the page or modifies a key",
        async (key) => {
          const { help, settle } = await renderHeldHelp();
          fireEvent.click(barButton("How to play"));

          fireEvent.keyDown(screen.getByRole("application"), { key });
          help.arrive();
          await settle();

          expect(
            screen.getByRole("dialog", { name: "How to play" }),
          ).toBeVisible();
        },
      );

      it("keeps the opening at a press in the bar", async () => {
        const { help, settle } = await renderHeldHelp();
        fireEvent.click(barButton("How to play"));

        fireEvent.pointerDown(barButton("Levels"));
        help.arrive();
        await settle();

        expect(
          screen.getByRole("dialog", { name: "How to play" }),
        ).toBeVisible();
      });

      it("keeps the opening as the focus moves along the bar", async () => {
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        barButton("Levels").focus();
        help.arrive();
        await settle();

        expect(
          screen.getByRole("dialog", { name: "How to play" }),
        ).toBeVisible();
      });

      it("says in the page's live region that it couldn't be loaded, as the app's error handler is told why", async () => {
        const errors = collectErrors();
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        help.fail();
        await settle();

        expect({
          said: TestBed.inject(AnnouncerService).message(),
          busy: barButton("How to play").getAttribute("aria-busy"),
          dialogs: helpDialogs(),
          errors,
        }).toEqual({
          said: HELP_FAILED_WORDS,
          busy: null,
          dialogs: [],
          errors: [OFFLINE],
        });
      });

      it("says nothing of a load that failed once the opening was dropped", async () => {
        collectErrors();
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        await userEvent.keyboard("{Escape}");
        help.fail();
        await settle();

        expect(TestBed.inject(AnnouncerService).message()).toBe("");
      });

      it("loads it again at the next press after a load failed", async () => {
        collectErrors();
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));
        help.fail();
        await settle();

        await userEvent.click(barButton("How to play"));
        help.arrive();
        await settle();

        expect(
          screen.getByRole("dialog", { name: "How to play" }),
        ).toBeVisible();
      });
    });
  });
});
