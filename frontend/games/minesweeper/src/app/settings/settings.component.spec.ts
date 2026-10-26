import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../../testing/game";
import { GameService } from "../play/game.service";
import { SettingsComponent } from "./settings.component";
import { SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the settings, open. */
async function renderSettings(): Promise<RenderedSettings> {
  const closed = vi.fn();
  await render(SettingsComponent, { inputs: { open: true }, on: { closed } });
  return { user: userEvent.setup(), closed };
}

/** Returns the settings in use. */
function settings(): ReturnType<SettingsService["settings"]> {
  return TestBed.inject(SettingsService).settings();
}

/** Types over what one of Custom's inputs holds. */
async function fill(
  user: UserEvent,
  name: string,
  value: string,
): Promise<void> {
  const input = screen.getByRole("spinbutton", { name });
  await user.clear(input);
  await user.type(input, value);
}

describe("SettingsComponent", () => {
  it("shows the difficulty in use as chosen", async () => {
    await renderSettings();

    expect(screen.getByRole("radio", { name: /^Medium/ })).toBeChecked();
  });

  it("says what each difficulty deals", async () => {
    await renderSettings();

    expect(
      // A browser puts a space between the lines, which jsdom, without the
      // stylesheet, doesn't.
      screen.getByRole("radio", { name: /^Hard\s*16 × 30, 99 mines$/ }),
    ).toBeInTheDocument();
  });

  it("deals a game of the difficulty chosen", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Easy/ }));

    expect(settings().difficulty).toBe("easy");
    expect(TestBed.inject(GameService).field().size).toEqual({
      rows: 9,
      cols: 9,
      mines: 10,
    });
  });

  it("asks before a difficulty loses the game under way", async () => {
    const { user } = await renderSettings();
    playOn(["*..", "...", "..*"]);

    await user.click(screen.getByRole("radio", { name: /^Easy/ }));

    expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    expect(settings().difficulty).toBe("medium");
  });

  it("deals a game with the lives chosen", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: "5" }));

    expect(settings().lives).toBe(5);
    expect(TestBed.inject(GameService).field().lives).toBe(5);
  });

  it("opens Custom's field to fill in, without dealing it yet", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Custom/ }));

    expect(screen.getByRole("radio", { name: /^Custom/ })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Rows" })).toHaveValue(20);
    expect(settings().difficulty).toBe("medium");
  });

  it("deals the custom field typed", async () => {
    const { user } = await renderSettings();
    await user.click(screen.getByRole("radio", { name: /^Custom/ }));
    await fill(user, "Rows", "8");
    await fill(user, "Columns", "12");
    await fill(user, "Mines", "20");

    await user.click(
      screen.getByRole("button", { name: "Start a custom game" }),
    );

    expect(settings()).toMatchObject({
      difficulty: "custom",
      custom: { rows: 8, cols: 12, mines: 20 },
    });
  });

  it("says why a custom field can't be dealt", async () => {
    const { user } = await renderSettings();
    await user.click(screen.getByRole("radio", { name: /^Custom/ }));
    await fill(user, "Mines", "500");

    await user.click(
      screen.getByRole("button", { name: "Start a custom game" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mines must be a whole number from 1 to 391.",
    );
    expect(settings().difficulty).toBe("medium");
  });

  it("marks the input a custom field can't be dealt for", async () => {
    const { user } = await renderSettings();
    await user.click(screen.getByRole("radio", { name: /^Custom/ }));
    await fill(user, "Columns", "40");

    await user.click(
      screen.getByRole("button", { name: "Start a custom game" }),
    );

    expect(screen.getByRole("spinbutton", { name: "Columns" })).toBeInvalid();
    expect(screen.getByRole("spinbutton", { name: "Rows" })).toBeValid();
  });

  it("says how many mines the rows and columns typed can hold", async () => {
    const { user } = await renderSettings();
    await user.click(screen.getByRole("radio", { name: /^Custom/ }));

    await fill(user, "Rows", "10");

    expect(
      screen.getByRole("spinbutton", { name: "Mines" }),
    ).toHaveAccessibleDescription(/mines from 1 to 191\./);
  });

  it("asks to close from its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  it("puts away a Custom field left unfinished on closing", async () => {
    const { user } = await renderSettings();
    await user.click(screen.getByRole("radio", { name: /^Custom/ }));

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(screen.getByRole("radio", { name: /^Medium/ })).toBeChecked();
  });
});
