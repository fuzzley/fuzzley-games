import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { BugReportService } from "@fz/game-ui/bug_report";
import { PhaserCanvasComponent } from "@fz/phaser/canvas";
import {
  installCompressionStreams,
  installFakeViewport,
  provideReportPicture,
} from "@fz/game-ui/testing";
import {
  collectErrors,
  provideFakePhaserCanvas,
  resize,
  watchResizes,
} from "@fz/phaser/testing";
import {
  type CssRect,
  PANEL_GAP_CSS_PX,
  cssRectStyle,
} from "@fz/phaser/layout";
import { viewport } from "@fz/phaser/testing/pure";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import {
  type HeldLoad,
  OFFLINE,
  heldLoad,
  setPageVisibility,
} from "@fz/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { squareOf } from "../rules/board/cells";
import { BoardFrames } from "../testing/board_frames";
import { BLUE_LINE, SMALL_LEVELS } from "../testing/small_levels";
import { boardMetrics } from "../view/board/metrics";
import { AppComponent, HELP_FAILED_WORDS } from "./app.component";
import { BoardComponent } from "./board/board.component";
import { provideFuzzFluxBugReports } from "./bug_report/fuzz_flux_bug_reports";
import { HelpComponent } from "./help/help.component";
import { LOAD_HELP } from "./help/load_help";
import { GameService } from "./play/game.service";
import { VIEW_KIT } from "./play/view_kit";
import { SettingsService } from "./settings/settings.service";
import { GAME_LEVELS } from "./tokens";

/** Describes the game rendered, and what a spec reads of it. */
interface RenderedApp {
  /** Lets the page settle. */
  readonly settle: () => Promise<void>;
  readonly board: BoardComponent;
  /** The board's canvas, which a press on the board lands on. */
  readonly canvas: HTMLElement;
}

/**
 * Renders the game on a fake canvas, the game on the small levels, with
 * the bug reports main.ts provides and any providers given.
 */
async function renderApp(...providers: Provider[]): Promise<RenderedApp> {
  const { fixture } = await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
      provideFuzzFluxBugReports(),
      ...providers,
    ],
  });
  await fixture.whenStable();
  return {
    settle: () => fixture.whenStable(),
    board: fixture.debugElement.query(By.directive(BoardComponent))
      .componentInstance as BoardComponent,
    canvas: fixture.debugElement.query(By.directive(PhaserCanvasComponent))
      .nativeElement as HTMLElement,
  };
}

/** Renders the game as `renderApp()` does, How to play's chunk held until the spec lets it arrive or fail, and returns its load. */
async function renderHeldHelp(): Promise<RenderedApp & { help: HeldLoad }> {
  const help = heldLoad(HelpComponent);
  const app = await renderApp({ provide: LOAD_HELP, useValue: help.load });
  return { ...app, help };
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

/** Returns How to play's dialog where it is open, or null. */
function openHelp(): HTMLElement | null {
  return screen.queryByRole("dialog", { name: "How to play" });
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

/** Makes the line of blue's move on the board by two taps, as a player would. */
function playBlueLine(game: GameService): void {
  new BoardFrames(game).tap(
    squareOf(BLUE_LINE.from, 5),
    squareOf(BLUE_LINE.to, 5),
  );
}

/** Returns where the room left of a 5 by 5 board lies on a canvas of a CSS size, as the board lays it out with no panels beside it. */
function leftOfBoard(width: number, height: number): CssRect {
  const { css } = boardMetrics(viewport(width, height), 5, 5);
  const gap = PANEL_GAP_CSS_PX;
  return { x: gap, y: css.y, width: css.x - 2 * gap, height: css.height };
}

/** Lays the board out on a wide window's canvas, as the browser does, with room beside it for the panels, on the third of the small levels. */
function layOutWide(): void {
  void TestBed.inject(GameService).startLevel(3);
  resize(document.querySelector<HTMLElement>("app-board")!, 1280, 728);
}

describe("AppComponent", () => {
  it("names the game in the page's one heading, in the bar", async () => {
    await renderApp();

    expect(
      within(screen.getByRole("banner")).getByRole("heading", {
        level: 1,
        name: "Fuzz Flux",
      }),
    ).toBeInTheDocument();
  });

  it("asks before Restart once a move is made", async () => {
    const { settle } = await renderApp();
    const game = TestBed.inject(GameService);
    game.useView(VIEW_KIT);
    await game.startLevel(3);
    playBlueLine(game);

    await userEvent.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Restart",
      }),
    );
    await settle();

    expect(
      screen.getByRole("alertdialog", { name: "Restart this level?" }),
    ).toBeInTheDocument();
  });

  it("opens Choose a level from the bar", async () => {
    await renderApp();

    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    expect(screen.getByRole("dialog", { name: "Levels" })).toBeVisible();
  });

  it("closes Choose a level as it asks", async () => {
    await renderApp();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Close levels" }));

    expect(screen.queryByRole("dialog", { name: "Levels" })).toBeNull();
  });

  it("hands the board each goal's picture in the bar, for its copies to fly to", async () => {
    const { settle, board } = await renderApp();

    await TestBed.inject(GameService).startLevel(3);
    await settle();

    const bar = screen.getByRole("banner");
    expect(
      board.goalPictures().map((picture) => bar.contains(picture)),
    ).toEqual([true, true]);
  });

  describe("the line about what a level brings in new", () => {
    watchResizes();

    it("shows beside the bar on a level that brings something", async () => {
      const { settle } = await renderApp();

      await TestBed.inject(GameService).startLevel(3);
      await settle();

      const line = within(screen.getByRole("main")).getByText(
        "Swap 2 fuzzballs to line up 3 of a kind.",
      );
      expect(document.querySelector("app-board")).not.toContainElement(line);
    });

    it("shows nowhere on a level that brings nothing", async () => {
      await renderApp();

      expect(
        within(screen.getByRole("main")).queryByRole("paragraph"),
      ).toBeNull();
    });

    it("shows in the panel, alone, on a phone on its side", async () => {
      installFakeViewport(844, 390);
      const { settle } = await renderApp();

      void TestBed.inject(GameService).startLevel(3);
      resize(document.querySelector<HTMLElement>("app-board")!, 788, 390);
      await settle();

      const line = within(screen.getByRole("main")).getByText(
        "Swap 2 fuzzballs to line up 3 of a kind.",
      );
      expect(document.querySelector(".level-panel")).toContainElement(line);
    });

    it("shows left of the board on a phone on its side that spares no panel", async () => {
      installFakeViewport(667, 375);
      const { settle } = await renderApp();

      void TestBed.inject(GameService).startLevel(3);
      resize(document.querySelector<HTMLElement>("app-board")!, 603, 375);
      await settle();

      expect(
        within(screen.getByRole("main")).getByText(
          "Swap 2 fuzzballs to line up 3 of a kind.",
        ),
      ).toHaveStyle(cssRectStyle(leftOfBoard(603, 375)));
    });
  });

  describe("in a wide window", () => {
    watchResizes();

    it("hands the board each goal's picture in the panel, for its copies to fly to", async () => {
      const { settle, board } = await renderApp();

      layOutWide();
      await settle();

      const panel = document.querySelector(".level-panel")!;
      expect(
        board.goalPictures().map((picture) => panel.contains(picture)),
      ).toEqual([true, true]);
    });

    it("shows the level and Hint and Restart in panels beside the board, in the bar's place", async () => {
      const { settle } = await renderApp();

      layOutWide();
      await settle();

      const board = document.querySelector<HTMLElement>("app-board")!;
      expect({
        level: within(board).queryByText("Show me"),
        hint: within(board).queryByRole("button", { name: "Hint" }),
        inBar: within(screen.getByRole("banner")).queryByText("moves"),
      }).toEqual({
        level: expect.any(HTMLElement) as unknown,
        hint: expect.any(HTMLElement) as unknown,
        inBar: null,
      });
    });

    it("shows the hint at the panel's Hint", async () => {
      const { settle } = await renderApp();
      const game = TestBed.inject(GameService);
      game.useView(VIEW_KIT);
      layOutWide();
      await settle();
      const still = game.play();

      await userEvent.click(screen.getByRole("button", { name: "Hint" }));

      expect(game.play()).not.toBe(still);
    });
  });

  it("opens the settings from the bar", async () => {
    await renderApp();

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
  });

  it("turns the sound off at Sound, which the board then plays none of", async () => {
    const { board } = await renderApp();

    await userEvent.click(screen.getByRole("button", { name: "Sound" }));

    expect({
      kept: TestBed.inject(SettingsService).settings().sound,
      board: board.sound(),
    }).toEqual({ kept: false, board: false });
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

      expect(openHelp()).toBeVisible();
    });

    it("closes at Escape", async () => {
      const { settle } = await renderApp();
      await userEvent.click(barButton("How to play"));
      await settle();

      await userEvent.keyboard("{Escape}");
      await settle();

      expect(openHelp()).not.toBeInTheDocument();
    });

    it("opens the one it loaded again", async () => {
      const { settle } = await renderApp();
      await userEvent.click(barButton("How to play"));
      await settle();
      await userEvent.keyboard("{Escape}");
      await settle();

      await userEvent.click(barButton("How to play"));
      await settle();

      expect(helpDialogs()).toEqual([openHelp()]);
    });

    describe("on a slow connection", () => {
      it("shows its button busy while it loads", async () => {
        await renderHeldHelp();

        await userEvent.click(barButton("How to play"));
        // Not settled, as the page settles only once the load is in.
        TestBed.tick();

        expect(barButton("How to play")).toHaveAttribute("aria-busy", "true");
      });

      it("opens once it has loaded, its button no longer busy", async () => {
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        help.arrive();
        await settle();

        expect({
          dialog: openHelp(),
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
          dialog: openHelp(),
          busy: barButton("How to play").getAttribute("aria-busy"),
        }).toEqual({ dialog: null, busy: null });
      });

      it("drops the opening as the focus leaves the bar", async () => {
        const { help, settle } = await renderHeldHelp();
        await userEvent.click(barButton("How to play"));

        screen.getAllByRole("gridcell")[0]!.focus();
        help.arrive();
        await settle();

        expect(openHelp()).not.toBeInTheDocument();
      });

      it("drops the opening at a press outside the bar, where the press moved no focus", async () => {
        const { help, settle } = await renderHeldHelp();
        const board = screen.getAllByRole("gridcell")[0]!;
        board.focus();
        // A click that focuses no button, as Safari's.
        fireEvent.click(barButton("How to play"));

        fireEvent.pointerDown(board);
        help.arrive();
        await settle();

        expect(openHelp()).not.toBeInTheDocument();
      });

      it("drops the opening at a key pressed outside the bar, where the press moved no focus", async () => {
        const { help, settle } = await renderHeldHelp();
        const board = screen.getAllByRole("gridcell")[0]!;
        board.focus();
        fireEvent.click(barButton("How to play"));

        fireEvent.keyDown(board, { key: " ", code: "Space" });
        help.arrive();
        await settle();

        expect(openHelp()).not.toBeInTheDocument();
      });

      it.each(["Tab", "Shift"])(
        "keeps the opening at %s outside the bar, which moves along the page or modifies a key",
        async (key) => {
          const { help, settle } = await renderHeldHelp();
          fireEvent.click(barButton("How to play"));

          fireEvent.keyDown(screen.getAllByRole("gridcell")[0]!, { key });
          help.arrive();
          await settle();

          expect(openHelp()).toBeVisible();
        },
      );

      it("keeps the opening at a press in the bar", async () => {
        const { help, settle } = await renderHeldHelp();
        fireEvent.click(barButton("How to play"));

        fireEvent.pointerDown(barButton("Choose a level"));
        help.arrive();
        await settle();

        expect(openHelp()).toBeVisible();
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

        expect(openHelp()).toBeVisible();
      });
    });
  });

  describe("the card at a level's end", () => {
    /** Clears the first of the small levels, its card shown as the board plays the move out. */
    async function clearFirstLevel(): Promise<GameService> {
      const { settle } = await renderApp();
      const game = TestBed.inject(GameService);
      game.useView(VIEW_KIT);
      const frames = new BoardFrames(game);
      playBlueLine(game);
      frames.playOut();
      await settle();
      return game;
    }

    it("shows over the board at its beat", async () => {
      await clearFirstLevel();

      expect(
        within(document.querySelector("app-board")!).getByRole("group", {
          name: "Level 1 cleared!",
        }),
      ).toBeInTheDocument();
    });

    it("plays the next level at Next level, with the button's sound", async () => {
      const game = await clearFirstLevel();

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect({
        level: game.state().level.number,
        cues: game.cues().map(({ sound }) => sound),
      }).toEqual({ level: 2, cues: ["button"] });
    });

    it("plays the level again on its next deal at Play again", async () => {
      const game = await clearFirstLevel();

      await userEvent.click(screen.getByRole("button", { name: "Play again" }));

      expect(game.inPlay()).toMatchObject({ level: { number: 1 }, deal: 2 });
    });

    it("opens Choose a level from Out of moves", async () => {
      const { settle } = await renderApp();
      const game = TestBed.inject(GameService);
      game.useView(VIEW_KIT);
      await game.startLevel(2);
      playBlueLine(game);
      new BoardFrames(game).playOut();
      await settle();

      await userEvent.click(
        within(screen.getByRole("group", { name: "Out of moves" })).getByRole(
          "button",
          { name: "Choose a level" },
        ),
      );

      expect(screen.getByRole("dialog", { name: "Levels" })).toBeVisible();
    });
  });

  it("hands the board the focus as the page loads, on its first square", async () => {
    await renderApp();

    expect(screen.getAllByRole("gridcell")[0]).toHaveFocus();
  });

  it("cancels no press on the board, which Phaser's mouse then hears", async () => {
    const { canvas } = await renderApp();

    const heard = fireEvent.pointerDown(canvas);

    expect(heard).toBe(true);
  });

  it("lands the move in play as the player looks away", async () => {
    await renderApp();
    const game = TestBed.inject(GameService);
    game.useView(VIEW_KIT);
    playBlueLine(game);

    setPageVisibility("hidden");

    expect(game.play().landed).toBe(true);
  });

  it("says what the game announces in a live region", async () => {
    const { settle } = await renderApp();

    TestBed.inject(AnnouncerService).say("Out of moves.");
    await settle();

    // The page's, not the one the settings drawer speaks through while open.
    expect(
      screen.getByText("Out of moves.", { ignore: "app-settings *" }),
    ).toHaveAttribute("aria-live", "polite");
  });

  it("asks before something is lost, and hands the answer back", async () => {
    const { settle } = await renderApp();
    const asking = TestBed.inject(ConfirmService).ask({
      title: "Restart the level?",
      message: "You lose the moves you've made.",
      confirmLabel: "Restart",
    });
    await settle();

    await userEvent.click(
      within(
        screen.getByRole("alertdialog", { name: "Restart the level?" }),
      ).getByRole("button", { name: "Restart" }),
    );

    expect(await asking).toBe(true);
  });

  describe("a bug report", () => {
    installCompressionStreams();

    it("opens filed as Fuzz Flux's", async () => {
      await renderApp();

      await TestBed.inject(BugReportService).start();
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      const link = within(report).getByRole("link", { name: /^Open GitHub/ });
      expect(
        new URL(link.getAttribute("href") ?? "").searchParams.get("title"),
      ).toBe("[Fuzz Flux] ");
    });

    it("says to save the picture first on a touch screen", async () => {
      installFakeViewport(390, 844).setCoarsePointer(true);
      standInPictureLinks();
      const picture = new Blob(["png"], { type: "image/png" });
      await renderApp(provideReportPicture(picture));

      await TestBed.inject(BugReportService).start();
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      expect(report).toHaveAccessibleDescription(
        "Tap Save picture, then Open GitHub, and add the picture under Screenshot.",
      );
    });
  });
});
