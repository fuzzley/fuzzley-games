import {
  ApplicationRef,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { DialogComponent } from "@fz/ui/dialog";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { refocusWhenUncovered } from "./refocus_when_uncovered";

/** Stands in for a game's board, which takes the focus after the next render. */
@Component({
  selector: "fz-test-board",
  template: "",
  host: { role: "application", "aria-label": "Board", tabindex: "0" },
})
class TestBoardComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** What the board was last asked to take the focus with. */
  asked: FocusOptions | undefined;

  /** Puts the focus on the board after Angular's next render. */
  focus(options?: FocusOptions): void {
    this.asked = options;
    afterNextRender(
      () => {
        this.host.nativeElement.focus(options);
      },
      { injector: this.injector },
    );
  }
}

/**
 * Shows a game's board under its settings, which open How to play over them,
 * and a dialog it puts in the page and takes out.
 */
@Component({
  imports: [DialogComponent, TestBoardComponent],
  template: `
    <fz-test-board />
    <button type="button" (click)="settingsOpen.set(true)">Settings</button>
    <fz-dialog
      label="Settings"
      [open]="settingsOpen()"
      (closed)="settingsOpen.set(false)"
    >
      <button type="button" (click)="helpOpen.set(true)">How to play</button>
      <button type="button" (click)="settingsOpen.set(false)">
        Close settings
      </button>
    </fz-dialog>
    <fz-dialog
      label="How to play"
      [open]="helpOpen()"
      (closed)="helpOpen.set(false)"
    >
      <button type="button" (click)="helpOpen.set(false)">
        Close How to play
      </button>
    </fz-dialog>
    @if (extraShown()) {
      <fz-dialog label="Extra" [open]="extraOpen()">
        <button type="button">In Extra</button>
      </fz-dialog>
    }
  `,
})
class TestGameComponent {
  /** Whether How to play is open as the page loads, as on a first visit. */
  readonly helpAtLoad = input(false);

  readonly runs = signal(0);
  readonly settingsOpen = signal(false);
  readonly helpOpen = linkedSignal(() => this.helpAtLoad());
  /** Whether Extra, a dialog the game puts in the page and takes out, is in it. */
  readonly extraShown = signal(false);
  readonly extraOpen = signal(false);
  readonly board = viewChild.required(TestBoardComponent);

  constructor() {
    refocusWhenUncovered(this.board, this.runs);
  }
}

describe("refocusWhenUncovered", () => {
  let game: TestGameComponent;
  let user: UserEvent;

  /** Renders the game, and lets its board take the focus it is handed. */
  async function renderGame(helpAtLoad = false): Promise<void> {
    const { fixture } = await render(TestGameComponent, {
      inputs: { helpAtLoad },
    });
    game = fixture.componentInstance;
    user = userEvent.setup();
    await settle();
  }

  /** Lets the board take the focus it was handed after the next render. */
  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  /** Clicks a button by its name, and lets the focus settle. */
  async function press(name: string): Promise<void> {
    await user.click(screen.getByRole("button", { name }));
    await settle();
  }

  /** Returns the board as a player's screen reader finds it. */
  function board(): HTMLElement {
    return screen.getByRole("application", { name: "Board" });
  }

  describe("as the page loads", () => {
    it("hands the board the focus, so the keys steer at once", async () => {
      await renderGame();

      expect(board()).toHaveFocus();
    });

    it("draws no focus ring, as nothing was pressed to put it there", async () => {
      await renderGame();

      expect(game.board().asked).toEqual({ focusVisible: false });
    });

    it("leaves the focus in a dialog open as the page loads", async () => {
      await renderGame(true);

      expect(
        screen.getByRole("button", { name: "Close How to play" }),
      ).toHaveFocus();
    });

    it("leaves the focus ring to the browser once that dialog closes", async () => {
      await renderGame(true);

      await press("Close How to play");

      expect(game.board().asked).toEqual({});
    });
  });

  describe("as a run begins", () => {
    it("hands the board the focus, wherever it was before", async () => {
      await renderGame();
      board().blur();

      game.runs.update((runs) => runs + 1);
      await settle();

      expect(board()).toHaveFocus();
    });

    it("leaves the focus in a dialog over the board", async () => {
      await renderGame();
      await press("Settings");

      game.runs.update((runs) => runs + 1);
      await settle();

      expect(screen.getByRole("button", { name: "How to play" })).toHaveFocus();
    });

    it("leaves the focus in a dialog that opens with it", async () => {
      await renderGame();

      game.runs.update((runs) => runs + 1);
      game.settingsOpen.set(true);
      await settle();

      expect(screen.getByRole("button", { name: "How to play" })).toHaveFocus();
    });

    it("hands the board the focus as the last dialog closes with it", async () => {
      await renderGame();
      await press("Settings");

      game.runs.update((runs) => runs + 1);
      game.settingsOpen.set(false);
      await settle();

      expect(board()).toHaveFocus();
    });
  });

  describe("as a dialog closes", () => {
    it("hands the board the focus back once it was the last", async () => {
      await renderGame();
      await press("Settings");

      await press("Close settings");

      expect(board()).toHaveFocus();
    });

    it("leaves the focus ring to the browser as it hands it back", async () => {
      await renderGame();
      await press("Settings");

      await press("Close settings");

      expect(game.board().asked).toEqual({});
    });

    it("leaves the focus in a dialog still open under it", async () => {
      await renderGame();
      await press("Settings");
      await press("How to play");

      await press("Close How to play");

      expect(screen.getByRole("button", { name: "How to play" })).toHaveFocus();
    });

    it("hands the board the focus back as the last of several closes", async () => {
      await renderGame();
      await press("Settings");
      await press("How to play");
      await press("Close How to play");

      await press("Close settings");

      expect(board()).toHaveFocus();
    });
  });

  describe("as a dialog comes into the page or leaves it", () => {
    it("leaves the focus where the player put it as a shut one comes", async () => {
      await renderGame();
      screen.getByRole("button", { name: "Settings" }).focus();

      game.extraShown.set(true);
      await settle();

      expect(screen.getByRole("button", { name: "Settings" })).toHaveFocus();
    });

    it("hands the board the focus back as an open one leaves", async () => {
      await renderGame();
      game.extraShown.set(true);
      game.extraOpen.set(true);
      await settle();

      game.extraShown.set(false);
      await settle();

      expect(board()).toHaveFocus();
    });
  });

  it("asks for an injection context, where its effect can live", () => {
    expect(() => {
      refocusWhenUncovered(signal(document.body), signal(0));
    }).toThrow(/refocusWhenUncovered/);
  });
});
