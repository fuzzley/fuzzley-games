import type { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { DropComponent } from "./drop.component";

/** What a spec gets back from rendering the button. */
interface Rendered {
  readonly user: UserEvent;
  readonly dropFlight: ReturnType<typeof vi.fn>;
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
 * Renders the button, a drop doing something or not, beside a board that
 * can take the focus, and listens to what it asks for.
 */
async function renderDrop(droppable = true): Promise<Rendered> {
  const dropFlight = vi.fn();
  const { debugElement } = await render(
    `<button type="button">Board</button>
    <button
      appDrop
      type="button"
      [droppable]="droppable"
      (dropFlight)="dropFlight()"
    ></button>`,
    {
      imports: [DropComponent],
      componentProperties: { droppable, dropFlight },
    },
  );
  return {
    user: userEvent.setup(),
    dropFlight,
    icon: () => iconIn(debugElement),
  };
}

/** Returns the button. */
function drop(): HTMLElement {
  return screen.getByRole("button", { name: "Drop" });
}

describe("DropComponent", () => {
  it("shows the drop icon", async () => {
    const { icon } = await renderDrop();

    expect(icon()).toBe("drop");
  });

  it("can be pressed while a drop would bring the flight down", async () => {
    await renderDrop();

    expect(drop()).not.toHaveAttribute("aria-disabled");
  });

  it("is dimmed while a drop would do nothing", async () => {
    await renderDrop(false);

    expect(drop()).toHaveAttribute("aria-disabled", "true");
  });

  it("drops the flight", async () => {
    const { user, dropFlight } = await renderDrop();

    await user.click(drop());

    expect(dropFlight).toHaveBeenCalledOnce();
  });

  it("drops from the keyboard", async () => {
    const { user, dropFlight } = await renderDrop();
    drop().focus();

    await user.keyboard("{Enter}");

    expect(dropFlight).toHaveBeenCalledOnce();
  });

  it("does nothing while dimmed", async () => {
    const { user, dropFlight } = await renderDrop(false);

    await user.click(drop());

    expect(dropFlight).not.toHaveBeenCalled();
  });

  it("keeps the focus where it was through a press with a pointer", async () => {
    const { user } = await renderDrop();
    const board = screen.getByRole("button", { name: "Board" });
    board.focus();

    await user.click(drop());

    expect(board).toHaveFocus();
  });
});
