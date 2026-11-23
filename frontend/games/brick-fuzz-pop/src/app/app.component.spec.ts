import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { loadsSettled } from "@fz/brick-wall/testing/settled";
import { FIELD_ROLES } from "@fz/brick-wall/view/palette";
import { formatPoints } from "@fz/core/format";
import { FRAME_MS } from "@fz/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { REPORT_PICTURE, packState } from "@fz/game-ui/bug_report";
import {
  installCompressionStreams,
  installFakeViewport,
} from "@fz/game-ui/testing";
import { collectErrors, provideFakePhaserCanvas } from "@fz/phaser/testing";
import { paintRoles } from "@fz/style/testing";
import { recordOf } from "@fz/core/records";
import { AnnouncerService } from "@fz/ui/announcer";
import { figure, figureValue, setPageVisibility } from "@fz/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { BRICK_KIND_IDS } from "../rules/catalog/bricks";
import type { Pictures } from "../scene/pictures";
import {
  SPEC_POINTS,
  type SpecRound,
  STILL,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../testing/play";
import { filesCertifying } from "../testing/certificates";
import { type HeldLoad, OFFLINE, heldLoad } from "../testing/loads";
import { PALETTES } from "../testing/roles";
import { AppComponent, HELP_FAILED_WORDS } from "./app.component";
import {
  BrickFuzzPopReports,
  provideBugReports,
} from "./bug_report/bug_report_source";
import { REPORT_TAG } from "./bug_report/report_state";
import { CERTIFICATE_FILES } from "./debug/certificates.service";
import { DebugService } from "./debug/debug.service";
import { HelpComponent } from "./help/help.component";
import { GameService } from "./play/game.service";
import { ProgressService } from "./stats/progress.service";
import { StatsService } from "./stats/stats.service";
import { LOAD_HELP } from "./tokens";

/** What a spec gets back from rendering the app. */
interface RenderedApp {
  readonly game: GameService;
  readonly user: UserEvent;
  /** Waits for the page to show what the game now holds. */
  readonly settle: () => Promise<void>;
}

/**
 * Renders the app over the specs' levels, its rounds played as a script
 * says, on a fake canvas, taking bug reports as `main.ts` has it, and waits
 * for its scene to be drawn.
 */
async function renderApp(
  ...script: readonly SpecRound[]
): Promise<RenderedApp> {
  return renderAppWith([], script);
}

/** The app rendered with How to play's chunk held, as a slow connection holds it. */
interface HeldHelpApp extends RenderedApp {
  /** How to play's load, which waits until the spec lets it arrive or fail. */
  readonly help: HeldLoad;
  /** Shows what the page holds now, without waiting for the load, as `settle()` does. */
  readonly detectChanges: () => void;
}

/** Renders the app as `renderApp()` does, How to play's chunk held until the spec lets it arrive or fail. */
async function renderHeldHelp(): Promise<HeldHelpApp> {
  const help = heldLoad(HelpComponent);
  const app = await renderAppWith([
    { provide: LOAD_HELP, useValue: help.load },
  ]);
  return { ...app, help };
}

/** Renders the app as `renderApp()` does, with providers of the spec's own. */
async function renderAppWith(
  providers: readonly Provider[],
  script: readonly SpecRound[] = [],
): Promise<RenderedApp & { readonly detectChanges: () => void }> {
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
    user: userEvent.setup(),
    settle: () => fixture.whenStable(),
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/**
 * Renders the app with the debug menu offered and a certificate for the
 * first level on the depth of the field it lays out, once loaded, on a fake
 * canvas, drawn at once, as a certificate's shots wait for the board.
 */
async function renderCertifiedApp(): Promise<RenderedApp> {
  const { fixture } = await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      ...provideSpecPlay(),
      ...provideBugReports(),
      { provide: DEBUG_MENU, useValue: true },
      {
        provide: CERTIFICATE_FILES,
        useValue: filesCertifying(
          () => TestBed.inject(GameService).shape().depth,
        ),
      },
    ],
  });
  // The settings' menu, loaded where it is offered, then the certificates
  // it loads.
  await loadsSettled(fixture);
  return {
    game: TestBed.inject(GameService),
    user: userEvent.setup(),
    settle: () => fixture.whenStable(),
  };
}

/** Renders the app with its first run ended, its result card open. */
async function endedApp(...script: readonly SpecRound[]): Promise<RenderedApp> {
  const app = await renderApp(...script);
  playUntilCard(app.game);
  await app.settle();
  return app;
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

/** Moves the focus out of the room from the board, as switching to another window does. */
function leaveRoom(): void {
  const board = screen.getByRole("application");
  board.focus();
  board.blur();
}

/**
 * Stands in for the links a page shows a picture from, which jsdom lacks,
 * until the test finishes.
 */
function standInPictureLinks(): void {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (): string => "blob:http://localhost/picture",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (): void => undefined,
  });
  onTestFinished(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });
}

/** Returns one of the bar's buttons by its name. */
function barButton(name: string): HTMLElement {
  return within(screen.getByRole("banner")).getByRole("button", { name });
}

describe("AppComponent", () => {
  beforeEach(() => {
    // The board draws its field in the palette's inks, which jsdom has no
    // stylesheet to give it.
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("classic", FIELD_ROLES));
  });

  it("names the game in the page's one heading", async () => {
    await renderApp();

    expect(
      screen.getByRole("heading", { level: 1, name: "Brick Fuzz Pop" }),
    ).toBeInTheDocument();
  });

  it("puts the board in the page's main landmark", async () => {
    await renderApp();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("application", { name: /^Brick Fuzz Pop, level 1: / }),
    );
  });

  describe("the board", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("takes the focus as the page loads, so the keys steer at once", async () => {
      const { settle } = await renderApp();

      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("draws no focus ring as the page loads, as nothing was pressed to put it there", async () => {
      // jsdom draws no ring, so what the board was asked for is all there is to see.
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      const { settle } = await renderApp();

      await settle();

      expect(focus).toHaveBeenCalledWith({ focusVisible: false });
    });

    it("takes the focus back as a dialog over it closes", async () => {
      const { user, settle } = await renderApp();
      await user.click(barButton("How to play"));
      await settle();

      await user.keyboard("{Escape}");
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("takes the focus back from the bar's Resume, pressed from the keys", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      game.pause();
      await settle();
      barButton("Resume").focus();

      await user.keyboard("{Enter}");
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("takes the focus as a run begins from the bar", async () => {
      const { game, user, settle } = await renderApp();
      const runs = game.runs();

      await user.click(barButton("New game"));
      await settle();

      expect({
        begun: game.runs() > runs,
        board: document.activeElement === screen.getByRole("application"),
      }).toEqual({ begun: true, board: true });
    });

    it("takes the focus as a run begins from a lost run's result", async () => {
      const { user, settle } = await endedApp("lost");

      await user.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });
  });

  describe("the bar", () => {
    it("shows the run's figures", async () => {
      const { game, settle } = await renderApp("freed");
      playRoundOut(game);

      await settle();

      expect({
        level: figure("Level"),
        rounds:
          within(figureValue("Shots")).queryByText(
            `1 shot, par ${String(game.par())}`,
          ) !== null,
        rowsLeft: figure("Rows left"),
        score: figure("Score"),
        crew: figure("Crew"),
      }).toEqual({
        level: "1",
        rounds: true,
        rowsLeft: String(game.rowsLeft()),
        score: String(SPEC_POINTS.freed),
        crew: "2 fuzzballs",
      });
    });

    it("pauses the level in play", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      await settle();

      await user.click(barButton("Pause"));

      expect(game.outcome()).toBe("paused");
    });

    it("goes on with a paused level", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      game.pause();
      await settle();

      await user.click(barButton("Resume"));

      expect(game.outcome()).toBe("playing");
    });

    it("switches fast-forward on while aiming", async () => {
      const { game, user } = await renderApp("step");

      await user.click(barButton("Fast-forward"));

      expect(game.fast()).toBe(true);
    });

    it("switches fast-forward off with a flight in the air", async () => {
      const { game, user, settle } = await renderApp("step");
      game.fastForward();
      release(game);
      await settle();

      await user.click(barButton("Fast-forward"));

      expect(game.fast()).toBe(false);
    });

    it("shows fast-forward on, pressed", async () => {
      const { game, settle } = await renderApp("step");

      game.fastForward();
      await settle();

      expect(barButton("Fast-forward")).toHaveAttribute("aria-pressed", "true");
    });

    it("offers Fast-forward and Drop while a flight is in the air", async () => {
      const { game, settle } = await renderApp("step");
      release(game);

      await settle();

      expect(
        [barButton("Fast-forward"), barButton("Drop")].map((button) =>
          button.getAttribute("aria-disabled"),
        ),
      ).toEqual([null, null]);
    });

    it("dims Drop while a round is aimed", async () => {
      await renderApp("step");

      expect(barButton("Drop")).toHaveAttribute("aria-disabled", "true");
    });

    it("drops the flight in the air", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      game.tick(FRAME_MS, STILL);
      await settle();

      await user.click(barButton("Drop"));

      expect(
        game.round()?.flight.events.some(({ kind }) => kind === "drop"),
      ).toBe(true);
    });

    it("dims Drop once the flight is dropped, though it still flies", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      game.tick(FRAME_MS, STILL);
      await settle();

      await user.click(barButton("Drop"));
      await settle();

      expect([
        barButton("Drop").getAttribute("aria-disabled"),
        game.flying(),
      ]).toEqual(["true", true]);
    });

    it("turns the sound off", async () => {
      const { game, user } = await renderApp();

      await user.click(barButton("Sound"));

      expect(game.soundOn()).toBe(false);
    });

    it("shows the sound off", async () => {
      const { game, settle } = await renderApp();
      game.toggleSound();

      await settle();

      expect(barButton("Sound")).toHaveAttribute("aria-pressed", "false");
    });

    it("starts a new game, asking first with a run in progress", async () => {
      const { game, user, settle } = await renderApp("step");
      playRoundOut(game);
      await settle();

      await user.click(barButton("New game"));

      expect(
        screen.getByRole("alertdialog", { name: "Start a new game?" }),
      ).toBeVisible();
    });

    it("opens How to play", async () => {
      const { user, settle } = await renderApp();

      await user.click(barButton("How to play"));
      await settle();

      expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    });

    it("closes How to play at Escape", async () => {
      const { user, settle } = await renderApp();
      await user.click(barButton("How to play"));
      await settle();

      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("dialog", { name: "How to play" }),
      ).not.toBeInTheDocument();
    });

    it("opens the settings", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Settings"));

      expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
    });

    it("closes the settings at Escape", async () => {
      const { user } = await renderApp();
      await user.click(barButton("Settings"));

      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("dialog", { name: "Settings" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("the debug menu's certificate", () => {
    it("is offered in the settings for the level in play", async () => {
      const { user } = await renderCertifiedApp();

      await user.click(barButton("Settings"));

      expect(
        screen.getByRole("button", { name: "Play the certificate" }),
      ).toBeVisible();
    });

    it("plays from the level's start, the settings put away", async () => {
      const { game, user, settle } = await renderCertifiedApp();
      await user.click(barButton("Settings"));

      await user.click(
        screen.getByRole("button", { name: "Play the certificate" }),
      );
      await settle();
      game.tick(FRAME_MS, STILL);

      expect({
        settings: screen.queryByRole("dialog", { name: "Settings" }),
        rounds: game.run().rounds,
      }).toEqual({ settings: null, rounds: 1 });
    });

    it("asks first with a run in progress, the settings put away before the question takes the focus", async () => {
      const { game, user, settle } = await renderCertifiedApp();
      playRoundOut(game);
      await settle();
      await user.click(barButton("Settings"));

      await user.click(
        screen.getByRole("button", { name: "Play the certificate" }),
      );
      await settle();

      const question = screen.getByRole("alertdialog");
      expect({
        settings: screen.queryByRole("dialog", { name: "Settings" }),
        focused: question.contains(document.activeElement),
      }).toEqual({ settings: null, focused: true });
    });
  });

  describe("a bug report", () => {
    installCompressionStreams();

    it("opens from the settings, filed as Brick Fuzz Pop's", async () => {
      const { user } = await renderApp();
      await user.click(barButton("Settings"));

      await user.click(screen.getByRole("button", { name: "Report a bug" }));
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      const link = within(report).getByRole("link", { name: /^Open GitHub/ });
      expect(
        new URL(link.getAttribute("href") ?? "").searchParams.get("title"),
      ).toBe("[Brick Fuzz Pop] ");
    });

    it("says to save the picture first on a touch screen", async () => {
      installFakeViewport(1280).setCoarsePointer(true);
      standInPictureLinks();
      const picture = new Blob(["png"], { type: "image/png" });
      const { user } = await renderAppWith([
        { provide: REPORT_PICTURE, useValue: () => Promise.resolve(picture) },
      ]);
      await user.click(barButton("Settings"));

      await user.click(screen.getByRole("button", { name: "Report a bug" }));
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      expect(report).toHaveAccessibleDescription(
        "Tap Save picture, then Open GitHub, and add the picture under Screenshot.",
      );
    });

    it("offers no reported state to load where the debug menu isn't offered", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Settings"));

      expect(
        screen.queryByRole("textbox", { name: "Load game state" }),
      ).not.toBeInTheDocument();
    });

    it("offers a reported state to load in the debug menu, where it is offered", async () => {
      const { user } = await renderCertifiedApp();

      await user.click(barButton("Settings"));

      expect(
        screen.getByRole("textbox", { name: "Load game state" }),
      ).toBeVisible();
    });

    it("puts the settings away once the reported state loaded is in play", async () => {
      const { game, user } = await renderCertifiedApp();
      const state = await packState(
        REPORT_TAG,
        TestBed.inject(BrickFuzzPopReports).capture().value,
      );
      await user.click(barButton("Settings"));

      await user.click(
        screen.getByRole("textbox", { name: "Load game state" }),
      );
      await user.paste(state);
      await user.click(screen.getByRole("button", { name: "Load" }));

      await vi.waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Settings" }),
        ).not.toBeInTheDocument();
      });
      expect(game.outcome()).toBe("paused");
    });
  });

  describe("the room", () => {
    it("pauses the level in play as the page goes out of sight", async () => {
      const { game } = await renderApp("step");
      release(game);

      setPageVisibility("hidden");

      expect(game.outcome()).toBe("paused");
    });

    it("lands a flight in the air as the page goes out of sight, keeping the level it clears", async () => {
      const { game } = await renderApp("cleared");
      release(game);

      setPageVisibility("hidden");

      expect({
        flying: game.flying(),
        cleared: TestBed.inject(ProgressService).cleared().size,
      }).toEqual({ flying: false, cleared: 1 });
    });

    it("lands a flight paused as the focus left the room once the page goes out of sight", async () => {
      const { game } = await renderApp("cleared");
      release(game);
      leaveRoom();

      setPageVisibility("hidden");

      expect({
        flying: game.flying(),
        cleared: TestBed.inject(ProgressService).cleared().size,
      }).toEqual({ flying: false, cleared: 1 });
    });

    it("pauses a flight in the air where it is as the focus leaves the room", async () => {
      const { game } = await renderApp("cleared");
      release(game);

      leaveRoom();

      expect([game.outcome(), game.flying()]).toEqual(["paused", true]);
    });

    it("says so in the page's live region, with the score of the round it landed", async () => {
      const { game } = await renderApp("step");
      playRoundOut(game);
      release(game);

      setPageVisibility("hidden");

      expect(
        await screen.findByText(
          `Paused. Score ${String(2 * SPEC_POINTS.step)}. Press Enter to resume.`,
          // The settings drawer's own region, for while it is open, says it too.
          { ignore: "dialog *" },
        ),
      ).toBeInTheDocument();
    });
  });

  describe("the Levels dialog", () => {
    it("opens from the bar", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Levels"));

      expect(screen.getByRole("dialog", { name: "Levels" })).toBeVisible();
    });

    it("closes at its Close", async () => {
      const { user } = await renderApp();
      await user.click(barButton("Levels"));

      await user.click(screen.getByRole("button", { name: "Close levels" }));

      expect(
        screen.queryByRole("dialog", { name: "Levels" }),
      ).not.toBeInTheDocument();
    });

    it("marks the level in play", async () => {
      const { game, user } = await renderApp();
      TestBed.inject(DebugService).openEveryLevel(true);
      await game.startAt(2);

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^2 Stripes/ }),
      ).toHaveAttribute("aria-current", "true");
    });

    it("starts a run at the level chosen and closes", async () => {
      const { game, user, settle } = await renderApp();
      TestBed.inject(DebugService).openEveryLevel(true);
      await user.click(barButton("Levels"));

      await user.click(screen.getByRole("button", { name: /^2 Stripes/ }));
      await settle();

      expect({
        level: game.run().level,
        open: screen.queryByRole("dialog", { name: "Levels" }),
      }).toEqual({ level: 2, open: null });
    });

    it("stays open as the player keeps the run in progress", async () => {
      const { game, user, settle } = await renderApp("step");
      playRoundOut(game);
      await settle();
      await user.click(barButton("Levels"));
      await user.click(screen.getByRole("button", { name: /^1 Hello, wall/ }));

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await settle();

      expect({
        rounds: game.rounds(),
        open: screen.queryByRole("dialog", { name: "Levels" }) !== null,
      }).toEqual({ rounds: 1, open: true });
    });

    it("offers every level while the debug menu opens them", async () => {
      const { user } = await renderApp();
      TestBed.inject(DebugService).openEveryLevel(true);

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^3 Pips/ }),
      ).not.toHaveAttribute("aria-disabled");
    });

    it("keeps each level's stars and best points while the debug menu opens every level", async () => {
      const { game, user, settle } = await renderApp("cleared");
      playUntilCard(game);
      TestBed.inject(DebugService).openEveryLevel(true);
      await settle();
      const best =
        TestBed.inject(StatsService).stats().levels["hello-wall"]?.points ?? 0;

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", {
          name: `1 Hello, wall 3 of 3 stars Best ${formatPoints(best)}`,
        }),
      ).toBeInTheDocument();
    });

    it("keeps a level locked until the one before it is cleared", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^2 Stripes/ }),
      ).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("How to play", () => {
    it("is nowhere in the page until it first opens, as it loads only then", async () => {
      await renderApp();

      expect(helpDialogs()).toEqual([]);
    });

    it("opens the one it loaded again", async () => {
      const { user, settle } = await renderApp();
      await user.click(barButton("How to play"));
      await settle();
      await user.keyboard("{Escape}");
      await settle();

      await user.click(barButton("How to play"));
      await settle();

      expect(helpDialogs()).toEqual([
        screen.getByRole("dialog", { name: "How to play" }),
      ]);
    });

    it("asks the scene for no picture while it is shut", async () => {
      // A level played, as the board's Ready card asks for the kind of
      // brick a level brings in.
      const { game, settle } = await renderApp("step");
      release(game);
      const pictures = vi.fn<() => Pictures>();
      game.onPictures(pictures);

      await settle();

      expect(pictures).not.toHaveBeenCalled();
    });

    it("asks the scene for no picture once it is put away", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      await user.click(barButton("How to play"));
      await settle();
      await user.keyboard("{Escape}");
      await settle();
      const pictures = vi.fn<() => Pictures>();
      game.onPictures(pictures);

      await settle();

      expect(pictures).not.toHaveBeenCalled();
    });

    describe("on a slow connection", () => {
      it("shows its button busy while it loads", async () => {
        const { user, detectChanges } = await renderHeldHelp();

        await user.click(barButton("How to play"));
        detectChanges();

        expect(barButton("How to play")).toHaveAttribute("aria-busy", "true");
      });

      it("opens once it has loaded, its button no longer busy", async () => {
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));

        help.arrive();
        await settle();

        expect({
          dialog: screen.getByRole("dialog", { name: "How to play" }),
          busy: barButton("How to play").getAttribute("aria-busy"),
        }).toEqual({ dialog: expect.toBeVisible() as unknown, busy: null });
      });

      it("drops the opening at Escape, so it doesn't open over the board later", async () => {
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));

        await user.keyboard("{Escape}");
        help.arrive();
        await settle();

        expect({
          dialog: screen.queryByRole("dialog", { name: "How to play" }),
          busy: barButton("How to play").getAttribute("aria-busy"),
        }).toEqual({ dialog: null, busy: null });
      });

      it("drops the opening as the focus leaves the bar", async () => {
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));

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
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));

        barButton("Levels").focus();
        help.arrive();
        await settle();

        expect(
          screen.getByRole("dialog", { name: "How to play" }),
        ).toBeVisible();
      });

      it("says in the page's live region that it couldn't be loaded, as the app's error handler is told why", async () => {
        const errors = collectErrors();
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));

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
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));

        await user.keyboard("{Escape}");
        help.fail();
        await settle();

        expect(TestBed.inject(AnnouncerService).message()).toBe("");
      });

      it("loads it again at the next press after a load failed", async () => {
        collectErrors();
        const { help, user, settle } = await renderHeldHelp();
        await user.click(barButton("How to play"));
        help.fail();
        await settle();

        await user.click(barButton("How to play"));
        help.arrive();
        await settle();

        expect(
          screen.getByRole("dialog", { name: "How to play" }),
        ).toBeVisible();
      });
    });

    it("shows the pictures the scene drew as it opens", async () => {
      const { game, user, settle } = await renderApp();
      game.onPictures(() => ({
        bricks: recordOf(BRICK_KIND_IDS, () => "data:image/png;base64,AAAA"),
      }));

      await user.click(barButton("How to play"));
      await settle();

      expect(
        within(screen.getByRole("dialog", { name: "How to play" }))
          .getAllByRole("presentation")
          .some(
            (img) => img.getAttribute("src") === "data:image/png;base64,AAAA",
          ),
      ).toBe(true);
    });
  });

  describe("an ended run", () => {
    it("shows its result over the board", async () => {
      await endedApp("lost");

      expect(
        screen.getByRole("alertdialog", { name: "Game over" }),
      ).toBeVisible();
    });

    it("shows the run's score against the best, saying it is a new one", async () => {
      await endedApp("jump", "lost");
      const result = screen.getByRole("alertdialog", { name: "Game over" });

      expect({
        best: figure("Best", result),
        newBest: within(result).queryByText("New best!") !== null,
      }).toEqual({ best: String(SPEC_POINTS.jump), newBest: true });
    });

    it("tries the lost level again from its result", async () => {
      const { game, user } = await endedApp("lost");

      await user.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );

      expect([game.outcome(), game.rounds()]).toEqual(["ready", 0]);
    });

    it("tries the lost level again at Enter, as its result opens, and hands the board the focus", async () => {
      const { game, user, settle } = await endedApp("lost");

      await user.keyboard("{Enter}");
      await settle();

      expect({
        outcome: game.outcome(),
        rounds: game.rounds(),
        board: document.activeElement === screen.getByRole("application"),
      }).toEqual({ outcome: "ready", rounds: 0, board: true });
    });

    it("closes its result, keeping it in the page, as the lost level is tried again", async () => {
      const { user } = await endedApp("lost");

      await user.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );

      // A closed dialog is hidden, which leaves it no accessible name.
      expect(
        screen
          .getAllByRole("alertdialog", { hidden: true })
          .map((dialog) => [
            dialog.getAttribute("aria-label"),
            dialog.hasAttribute("open"),
          ]),
      ).toContainEqual(["Game over", false]);
    });

    it("starts a new game from a won run's result", async () => {
      const { game, user, settle } = await renderApp("cleared");
      playUntilCard(game);
      game.nextLevel();
      playUntilCard(game);
      game.nextLevel();
      playUntilCard(game);
      await settle();

      await user.click(
        within(
          screen.getByRole("alertdialog", { name: "Every level cleared!" }),
        ).getByRole("button", { name: "New game" }),
      );

      expect([game.outcome(), game.run().level]).toEqual(["ready", 1]);
    });

    it("opens the Levels dialog from its result, which goes away", async () => {
      const { game, user } = await endedApp("lost");

      await user.click(screen.getByRole("button", { name: "Choose a level" }));

      expect({
        levels: screen.queryByRole("dialog", { name: "Levels" }) !== null,
        resultClosed: game.resultClosed(),
      }).toEqual({ levels: true, resultClosed: true });
    });

    it("puts its result away as it closes, leaving the board to look at", async () => {
      const { game, user } = await endedApp("lost");

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect({
        resultClosed: game.resultClosed(),
        shown: screen.queryByRole("alertdialog", { name: "Game over" }),
      }).toEqual({ resultClosed: true, shown: null });
    });
  });
});
