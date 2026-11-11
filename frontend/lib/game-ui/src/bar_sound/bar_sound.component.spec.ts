import type { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { BarSoundComponent } from "./bar_sound.component";

interface Rendered {
  readonly user: UserEvent;
  /** Returns the name of the icon the button shows. */
  readonly icon: () => IconName;
}

/**
 * Renders the button with the sound on or off, beside a board that can take
 * the focus.
 */
async function renderSound(soundOn: boolean): Promise<Rendered> {
  const { debugElement } = await render(
    `<button type="button">Board</button>
    <button fzBarSound type="button" [soundOn]="soundOn"></button>`,
    { imports: [BarSoundComponent], componentProperties: { soundOn } },
  );
  return { user: userEvent.setup(), icon: () => iconIn(debugElement) };
}

/** Returns the name of the one icon drawn in a rendered template. */
function iconIn(debugElement: DebugElement): IconName {
  return debugElement
    .query(By.directive(IconComponent))
    .injector.get(IconComponent)
    .name();
}

describe("BarSoundComponent", () => {
  it("shows the sound on, pressed", async () => {
    await renderSound(true);

    expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the sound off, not pressed", async () => {
    await renderSound(false);

    expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows the speaker while the sound is on", async () => {
    const { icon } = await renderSound(true);

    expect(icon()).toBe("sound");
  });

  it("shows the speaker silenced while the sound is off", async () => {
    const { icon } = await renderSound(false);

    expect(icon()).toBe("sound-off");
  });

  it("says what it is when pointed at", async () => {
    await renderSound(true);

    expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
      "title",
      "Sound",
    );
  });

  // A browser reads a tooltip that says what a label says again, as the
  // description, which jsdom's descriptions can't show, so the button
  // carries no label but its tooltip.
  it("is named by its tooltip alone, so its name is read once", async () => {
    await renderSound(true);

    expect(screen.getByRole("button", { name: "Sound" })).not.toHaveAttribute(
      "aria-label",
    );
  });

  it("keeps the focus where it was through a press with a pointer", async () => {
    const { user } = await renderSound(true);
    const board = screen.getByRole("button", { name: "Board" });
    board.focus();

    await user.click(screen.getByRole("button", { name: "Sound" }));

    expect(board).toHaveFocus();
  });
});
