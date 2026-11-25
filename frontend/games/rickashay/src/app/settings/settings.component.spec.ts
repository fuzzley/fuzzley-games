import { TestBed } from "@angular/core/testing";
import { packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { provideSpecPlay } from "../../testing/spec_play";
import {
  REPORT_TAG,
  RickashayReports,
  provideBugReports,
} from "../bug_report/bug_report_source";
import { SettingsComponent } from "./settings.component";
import { type Settings, SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly store: SettingsService;
  readonly storage: MemoryStorage;
  readonly closed: ReturnType<typeof vi.fn>;
}

/**
 * Renders the settings, open, over those kept from the last visit, the
 * defaults for any not given, offering the loader of a reported state only
 * where the debug menu is offered, as a build for players doesn't.
 *
 * The specs keep one setting off its default at a time, so a box bound to
 * another setting shows the other's.
 */
async function renderSettings(
  kept: Partial<Settings> = {},
  debugMenu = false,
): Promise<RenderedSettings> {
  const storage = new MemoryStorage();
  storage.setItem(
    "rickashay-settings",
    JSON.stringify({ version: 1, ...kept }),
  );
  const closed = vi.fn();
  await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: [
      provideMemoryStorage(storage),
      ...provideSpecPlay(),
      ...provideBugReports(),
      { provide: DEBUG_MENU, useValue: debugMenu },
    ],
  });
  return {
    user: userEvent.setup(),
    store: TestBed.inject(SettingsService),
    storage,
    closed,
  };
}

/** Returns the radio group a label names. */
function group(name: string): HTMLElement {
  return screen.getByRole("radiogroup", { name });
}

/** Returns the checkbox a label names. */
function checkbox(name: string): HTMLElement {
  return screen.getByRole("checkbox", { name });
}

/** Returns each choice a radio group offers, its name and its detail. */
function choices(name: string): readonly string[] {
  return within(group(name))
    .getAllByRole("radio")
    .map((radio) => radio.textContent.trim());
}

/** Returns the settings the player's browser holds, as the next visit reads them. */
function stored(storage: MemoryStorage): unknown {
  return JSON.parse(storage.getItem("rickashay-settings") ?? "null");
}

describe("SettingsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(SettingsComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  describe("aiming", () => {
    it("offers point and hold, and pull back, in that order", async () => {
      await renderSettings();

      expect(choices("Aiming")).toEqual([
        expect.stringMatching(
          /^Point and hold\s*Point where to aim\. Let go to shoot\.$/,
        ),
        expect.stringMatching(
          /^Pull back\s*Drag from anywhere, away from where you want to shoot\. Let go to shoot\.$/,
        ),
      ]);
    });

    it("points and holds until another way is chosen", async () => {
      await renderSettings();

      expect(
        within(group("Aiming")).getByRole("radio", { name: /^Point and hold/ }),
      ).toBeChecked();
    });

    it("checks the way kept from the last visit", async () => {
      await renderSettings({ aiming: "pullBack" });

      expect(screen.getByRole("radio", { name: /^Pull back/ })).toBeChecked();
    });

    it("says the keys work the same either way", async () => {
      await renderSettings();

      expect(group("Aiming")).toHaveAccessibleDescription(
        "Changes how you aim with a mouse or a finger. The keys work the same either way.",
      );
    });

    it("aims as chosen, and keeps it for the next visit", async () => {
      const { user, store, storage } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Pull back/ }));

      expect([store.settings().aiming, stored(storage)]).toEqual([
        "pullBack",
        expect.objectContaining({ version: 1, aiming: "pullBack" }),
      ]);
    });
  });

  describe("releasing with a button", () => {
    it("says letting go keeps the aim, for the Release button to shoot", async () => {
      await renderSettings();

      expect(checkbox("Release with a button")).toHaveAccessibleDescription(
        "Letting go keeps your aim. Shoot with the Release button.",
      );
    });

    it("lets go to shoot until told otherwise", async () => {
      await renderSettings();

      expect(checkbox("Release with a button")).not.toBeChecked();
    });

    it("ticks the box where it was kept on", async () => {
      await renderSettings({ releaseByButton: true });

      expect(checkbox("Release with a button")).toBeChecked();
    });

    it("leaves a shot to the button once the box is ticked, and keeps it for the next visit", async () => {
      const { user, store, storage } = await renderSettings();

      await user.click(checkbox("Release with a button"));

      expect([store.settings().releaseByButton, stored(storage)]).toEqual([
        true,
        expect.objectContaining({ releaseByButton: true }),
      ]);
    });

    it("lets go to shoot again once the box is cleared", async () => {
      const { user, store } = await renderSettings({ releaseByButton: true });

      await user.click(checkbox("Release with a button"));

      expect(store.settings().releaseByButton).toBe(false);
    });
  });

  describe("the aim guide", () => {
    it("offers 1, 3 and 5 turns, in that order", async () => {
      await renderSettings();

      expect(choices("Aim guide")).toEqual(["1 turn", "3 turns", "5 turns"]);
    });

    it("says what it counts", async () => {
      await renderSettings();

      expect(group("Aim guide")).toHaveAccessibleDescription(
        "Shows where your shot will go, up to the turn you choose.",
      );
    });

    it("follows a shot to its 3rd turn until another is chosen", async () => {
      await renderSettings();

      expect(screen.getByRole("radio", { name: "3 turns" })).toBeChecked();
    });

    it("checks the length kept from the last visit", async () => {
      await renderSettings({ guideTurns: 5 });

      expect(screen.getByRole("radio", { name: "5 turns" })).toBeChecked();
    });

    it.each([
      ["1 turn", 1],
      ["5 turns", 5],
    ])(
      "follows a shot as far as %s once chosen, and keeps it for the next visit",
      async (name, turns) => {
        const { user, store, storage } = await renderSettings();

        await user.click(screen.getByRole("radio", { name }));

        expect([store.settings().guideTurns, stored(storage)]).toEqual([
          turns,
          expect.objectContaining({ guideTurns: turns }),
        ]);
      },
    );
  });

  describe("the shot speed", () => {
    it("offers Normal and Fast, in that order", async () => {
      await renderSettings();

      expect(choices("Shot speed")).toEqual([
        expect.stringMatching(/^Normal\s*Easy to follow every bounce\.$/),
        expect.stringMatching(/^Fast\s*Quicker, for a wall you know well\.$/),
      ]);
    });

    it("flies at Normal until another speed is chosen", async () => {
      await renderSettings();

      expect(screen.getByRole("radio", { name: /^Normal/ })).toBeChecked();
    });

    it("checks the speed kept from the last visit", async () => {
      await renderSettings({ flightSpeed: "fast" });

      expect(screen.getByRole("radio", { name: /^Fast/ })).toBeChecked();
    });

    it("flies at the speed chosen, and keeps it for the next visit", async () => {
      const { user, store, storage } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Fast/ }));

      expect([store.settings().flightSpeed, stored(storage)]).toEqual([
        "fast",
        expect.objectContaining({ flightSpeed: "fast" }),
      ]);
    });
  });

  describe("fast-forward", () => {
    it("says how much faster it plays, until turned off, as the Fast-forward button does", async () => {
      await renderSettings();

      expect(checkbox("Fast-forward")).toHaveAccessibleDescription(
        "Plays every shot 4 times as fast, until you turn it off. Same as the Fast-forward button.",
      );
    });

    it("is off until told otherwise", async () => {
      await renderSettings();

      expect(checkbox("Fast-forward")).not.toBeChecked();
    });

    it("ticks the box where it was kept on", async () => {
      await renderSettings({ fastForward: true });

      expect(checkbox("Fast-forward")).toBeChecked();
    });

    it("turns it on once the box is ticked, and keeps it for the next visit", async () => {
      const { user, store, storage } = await renderSettings();

      await user.click(checkbox("Fast-forward"));

      expect([store.settings().fastForward, stored(storage)]).toEqual([
        true,
        expect.objectContaining({ fastForward: true }),
      ]);
    });

    it("turns it off again once the box is cleared", async () => {
      const { user, store } = await renderSettings({ fastForward: true });

      await user.click(checkbox("Fast-forward"));

      expect(store.settings().fastForward).toBe(false);
    });
  });

  describe("the sound", () => {
    it("says it turns all sound on or off, as the Sound button does", async () => {
      await renderSettings();

      expect(checkbox("Play sounds")).toHaveAccessibleDescription(
        "Turns all sound on or off. Same as the Sound button.",
      );
    });

    it("plays it until told otherwise", async () => {
      await renderSettings();

      expect(checkbox("Play sounds")).toBeChecked();
    });

    it("leaves the box clear where it was kept off", async () => {
      await renderSettings({ sound: false });

      expect(checkbox("Play sounds")).not.toBeChecked();
    });

    it("turns it off once the box is cleared, and keeps it for the next visit", async () => {
      const { user, store, storage } = await renderSettings();

      await user.click(checkbox("Play sounds"));

      expect([store.settings().sound, stored(storage)]).toEqual([
        false,
        expect.objectContaining({ sound: false }),
      ]);
    });

    it("turns it on again once the box is ticked", async () => {
      const { user, store } = await renderSettings({ sound: false });

      await user.click(checkbox("Play sounds"));

      expect(store.settings().sound).toBe(true);
    });
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Midnight blue/ })).toBeVisible();
  });

  describe("a reported state", () => {
    installCompressionStreams();

    it("isn't offered to load in a build for players", async () => {
      await renderSettings();

      expect(
        screen.queryByRole("textbox", { name: "Load game state" }),
      ).not.toBeInTheDocument();
    });

    it("asks to close once the state loaded is in play", async () => {
      const { user, closed } = await renderSettings({}, true);
      const state = await packState(
        REPORT_TAG,
        TestBed.inject(RickashayReports).capture().value,
      );

      await user.click(
        screen.getByRole("textbox", { name: "Load game state" }),
      );
      await user.paste(state);
      await user.click(screen.getByRole("button", { name: "Load" }));

      await vi.waitFor(() => {
        expect(closed).toHaveBeenCalledOnce();
      });
    });
  });
});
