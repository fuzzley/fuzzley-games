import type { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { GameBarComponent } from "../game_bar";
import { BarPauseComponent } from "./bar_pause.component";

describe("BarPauseComponent", () => {
  interface Rendered {
    readonly user: UserEvent;
    readonly pauseRun: ReturnType<typeof vi.fn>;
    readonly resumeRun: ReturnType<typeof vi.fn>;
    /** Returns the name of the icon the button shows. */
    readonly icon: () => IconName;
  }

  /**
   * Renders the button as the run stands, beside a board that can take the
   * focus, and listens to what it emits.
   */
  async function renderPause(
    outcome: string,
    fitsLabel = true,
  ): Promise<Rendered> {
    const pauseRun = vi.fn();
    const resumeRun = vi.fn();
    const { debugElement } = await render(
      `<button type="button">Board</button>
      <button
        fzBarPause
        type="button"
        [outcome]="outcome"
        [fitsLabel]="fitsLabel"
        (pauseRun)="pauseRun()"
        (resumeRun)="resumeRun()"
      ></button>`,
      {
        imports: [BarPauseComponent],
        componentProperties: { outcome, fitsLabel, pauseRun, resumeRun },
      },
    );
    return {
      user: userEvent.setup(),
      pauseRun,
      resumeRun,
      icon: () => iconIn(debugElement),
    };
  }

  /** Returns the name of the one icon drawn in a rendered template. */
  function iconIn(debugElement: DebugElement): IconName {
    return debugElement
      .query(By.directive(IconComponent))
      .injector.get(IconComponent)
      .name();
  }

  /** Renders the button with a run in play, among the actions of a bar. */
  async function renderInBar(compact: boolean): Promise<void> {
    await render(
      `<fz-game-bar [compact]="compact">
        <button
          fzBarActions
          fzBarPause
          type="button"
          outcome="playing"
          [fitsLabel]="true"
        ></button>
      </fz-game-bar>`,
      {
        imports: [BarPauseComponent, GameBarComponent],
        componentProperties: { compact },
      },
    );
  }

  it("reads Pause while the run is in play", async () => {
    await renderPause("playing");

    expect(screen.getByRole("button", { name: "Pause" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("reads Resume while the run is paused", async () => {
    await renderPause("paused");

    expect(screen.getByRole("button", { name: "Resume" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("shows the pause icon while the run is in play", async () => {
    const { icon } = await renderPause("playing");

    expect(icon()).toBe("pause");
  });

  it("shows the play icon while the run is paused", async () => {
    const { icon } = await renderPause("paused");

    expect(icon()).toBe("play");
  });

  it("dims Pause while there is no run to pause", async () => {
    await renderPause("ready");

    expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("pauses the run in play", async () => {
    const { user, pauseRun, resumeRun } = await renderPause("playing");

    await user.click(screen.getByRole("button", { name: "Pause" }));

    expect({
      paused: pauseRun.mock.calls.length,
      resumed: resumeRun.mock.calls.length,
    }).toEqual({ paused: 1, resumed: 0 });
  });

  it("goes on with the paused run", async () => {
    const { user, pauseRun, resumeRun } = await renderPause("paused");

    await user.click(screen.getByRole("button", { name: "Resume" }));

    expect({
      paused: pauseRun.mock.calls.length,
      resumed: resumeRun.mock.calls.length,
    }).toEqual({ paused: 0, resumed: 1 });
  });

  it("goes on from the keyboard", async () => {
    const { user, resumeRun } = await renderPause("paused");
    screen.getByRole("button", { name: "Resume" }).focus();

    await user.keyboard("{Enter}");

    expect(resumeRun).toHaveBeenCalledOnce();
  });

  it("does nothing while dimmed", async () => {
    const { user, pauseRun, resumeRun } = await renderPause("over");

    await user.click(screen.getByRole("button", { name: "Pause" }));

    expect({
      paused: pauseRun.mock.calls.length,
      resumed: resumeRun.mock.calls.length,
    }).toEqual({ paused: 0, resumed: 0 });
  });

  it("keeps the focus where it was through a press with a pointer", async () => {
    const { user } = await renderPause("playing");
    const board = screen.getByRole("button", { name: "Board" });
    board.focus();

    await user.click(screen.getByRole("button", { name: "Pause" }));

    expect(board).toHaveFocus();
  });

  it("shows its label where the bar has room for it", async () => {
    await renderPause("playing");

    expect(screen.getByText("Pause")).not.toHaveClass("fz-visually-hidden");
  });

  it("keeps its label for a screen reader alone where the bar has no room for it", async () => {
    await renderPause("playing", false);

    expect(
      within(screen.getByRole("button", { name: "Pause" })).getByText("Pause"),
    ).toHaveClass("fz-visually-hidden");
  });

  it("is round in a compact bar", async () => {
    await renderInBar(true);

    expect(screen.getByRole("button", { name: "Pause" })).toHaveClass(
      "fz-button-circle",
    );
  });

  it("isn't round in a bar that isn't compact", async () => {
    await renderInBar(false);

    expect(screen.getByRole("button", { name: "Pause" })).not.toHaveClass(
      "fz-button-circle",
    );
  });
});
