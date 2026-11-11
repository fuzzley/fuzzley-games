import type { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { SkipComponent } from "./skip.component";

/** What a spec gets back from rendering the button. */
interface Rendered {
  readonly user: UserEvent;
  readonly skipFlight: ReturnType<typeof vi.fn>;
  /** Returns the name of the icon the button shows. */
  readonly icon: () => IconName;
}

/** Returns the name of the one icon drawn in a rendered template. */
function iconIn(debugElement: DebugElement): IconName {
  return debugElement
    .query(By.directive(IconComponent))
    .injector.get(IconComponent)
    .name();
}

/**
 * Renders the button, a flight playing or not, beside a board that can take
 * the focus, and listens to what it asks for.
 */
async function renderSkip(flying = true): Promise<Rendered> {
  const skipFlight = vi.fn();
  const { debugElement } = await render(
    `<button type="button">Board</button>
    <button
      appSkip
      type="button"
      [flying]="flying"
      (skipFlight)="skipFlight()"
    ></button>`,
    {
      imports: [SkipComponent],
      componentProperties: { flying, skipFlight },
    },
  );
  return {
    user: userEvent.setup(),
    skipFlight,
    icon: () => iconIn(debugElement),
  };
}

/** Returns the button. */
function skip(): HTMLElement {
  return screen.getByRole("button", { name: "Skip" });
}

describe("SkipComponent", () => {
  it("shows the skip icon", async () => {
    const { icon } = await renderSkip();

    expect(icon()).toBe("skip");
  });

  it("can be pressed while a flight is under way", async () => {
    await renderSkip();

    expect(skip()).not.toHaveAttribute("aria-disabled");
  });

  it("is dimmed while there is no flight", async () => {
    await renderSkip(false);

    expect(skip()).toHaveAttribute("aria-disabled", "true");
  });

  it("skips the flight", async () => {
    const { user, skipFlight } = await renderSkip();

    await user.click(skip());

    expect(skipFlight).toHaveBeenCalledOnce();
  });

  it("skips from the keyboard", async () => {
    const { user, skipFlight } = await renderSkip();
    skip().focus();

    await user.keyboard("{Enter}");

    expect(skipFlight).toHaveBeenCalledOnce();
  });

  it("does nothing while dimmed", async () => {
    const { user, skipFlight } = await renderSkip(false);

    await user.click(skip());

    expect(skipFlight).not.toHaveBeenCalled();
  });

  it("keeps the focus where it was through a press with a pointer", async () => {
    const { user } = await renderSkip();
    const board = screen.getByRole("button", { name: "Board" });
    board.focus();

    await user.click(skip());

    expect(board).toHaveFocus();
  });
});
