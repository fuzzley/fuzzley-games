import { DeferBlockState, TestBed } from "@angular/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { filesCertifying, loadsSettled } from "../../testing/certificates";
import { provideSpecPlay } from "../../testing/play";
import {
  CERTIFICATE_FILES,
  type CertificateFiles,
} from "../debug/certificates.service";
import { GameService } from "../play/game.service";
import { SettingsComponent } from "./settings.component";
import { type Settings, SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly store: SettingsService;
  readonly closed: ReturnType<typeof vi.fn>;
  readonly playCertificate: ReturnType<typeof vi.fn>;
}

/** Says whether the drawer offers the debug menu, as a build for players doesn't, and the certificates its menu reads. */
interface DebugOptions {
  readonly debugMenu?: boolean;
  readonly files?: CertificateFiles;
}

/**
 * Renders the settings, open, over those kept from the last visit, the
 * defaults for any not given.
 *
 * The specs keep one setting off its default at a time, so a box bound to
 * another setting shows the other's. The drawer offers no debug menu,
 * as a build for players doesn't, unless asked to.
 */
async function renderSettings(
  kept: Partial<Settings> = {},
  { debugMenu = false, files = {} }: DebugOptions = {},
): Promise<RenderedSettings> {
  const storage = new MemoryStorage();
  storage.setItem(
    "brick-fuzz-pop-settings",
    JSON.stringify({ version: 1, ...kept }),
  );
  const closed = vi.fn();
  const playCertificate = vi.fn();
  const { fixture } = await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed, playCertificate },
    providers: [
      provideMemoryStorage(storage),
      ...provideSpecPlay(),
      { provide: DEBUG_MENU, useValue: debugMenu },
      { provide: CERTIFICATE_FILES, useValue: files },
    ],
  });
  // The deferred menu, then the certificates it loads.
  for (const block of await fixture.getDeferBlocks()) {
    await block.render(DeferBlockState.Complete);
  }
  await loadsSettled(fixture);
  return {
    user: userEvent.setup(),
    store: TestBed.inject(SettingsService),
    closed,
    playCertificate,
  };
}

/** Returns the field's depth, as the game lays it out. */
function fieldDepth(): number {
  return TestBed.inject(GameService).shape().depth;
}

/** Returns the radio group a label names. */
function group(name: string): HTMLElement {
  return screen.getByRole("radiogroup", { name });
}

/** Returns the checkbox a label names. */
function checkbox(name: string): HTMLElement {
  return screen.getByRole("checkbox", { name });
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
    it("offers by the pointer, pull back, and point and hold, in that order", async () => {
      await renderSettings();

      expect(
        within(group("Aiming"))
          .getAllByRole("radio")
          .map((radio) => radio.textContent.trim()),
      ).toEqual([
        expect.stringMatching(/^By the pointer\s*A finger pulls back/),
        expect.stringMatching(/^Pull back\s*Press anywhere on the field/),
        expect.stringMatching(/^Point and hold\s*Point where to aim/),
      ]);
    });

    it("aims by the pointer until another way is chosen", async () => {
      await renderSettings();

      expect(
        within(group("Aiming")).getByRole("radio", { name: /^By the pointer/ }),
      ).toBeChecked();
    });

    it("checks the way kept from the last visit", async () => {
      await renderSettings({ aiming: "pullBack" });

      expect(screen.getByRole("radio", { name: /^Pull back/ })).toBeChecked();
    });

    it("says the keys aim whichever way is chosen", async () => {
      await renderSettings();

      expect(group("Aiming")).toHaveAccessibleDescription(
        "The keys aim and charge whichever way is chosen.",
      );
    });

    it("aims as chosen", async () => {
      const { user, store } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Point and hold/ }));

      expect(store.settings().aiming).toBe("pointAndHold");
      expect(
        screen.getByRole("radio", { name: /^Point and hold/ }),
      ).toBeChecked();
    });
  });

  describe("the flight's speed", () => {
    it("offers Normal and Fast, in that order", async () => {
      await renderSettings();

      expect(
        within(group("The flight's speed"))
          .getAllByRole("radio")
          .map((radio) => radio.textContent.trim()),
      ).toEqual([
        expect.stringMatching(/^Normal\s*Every bounce easy to follow/),
        expect.stringMatching(/^Fast\s*Quicker/),
      ]);
    });

    it("says Fast-forward and Skip are there in every flight", async () => {
      await renderSettings();

      expect(group("The flight's speed")).toHaveAccessibleDescription(
        "Fast-forward and Skip are there from the start of every flight.",
      );
    });

    it("flies at Normal until another speed is chosen", async () => {
      await renderSettings();

      expect(screen.getByRole("radio", { name: /^Normal/ })).toBeChecked();
    });

    it("checks the speed kept from the last visit", async () => {
      await renderSettings({ flightSpeed: "fast" });

      expect(screen.getByRole("radio", { name: /^Fast/ })).toBeChecked();
    });

    it("flies at the speed chosen", async () => {
      const { user, store } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Fast/ }));

      expect(store.settings().flightSpeed).toBe("fast");
      expect(screen.getByRole("radio", { name: /^Fast/ })).toBeChecked();
    });
  });

  describe("long flights", () => {
    it("says a long flight doubles its speed", async () => {
      await renderSettings();

      expect(checkbox("Speed up long flights")).toHaveAccessibleDescription(
        "A flight that goes on and on doubles its speed by itself.",
      );
    });

    it("speeds them up until told otherwise", async () => {
      await renderSettings();

      expect(checkbox("Speed up long flights")).toBeChecked();
    });

    it("leaves the box clear where they were kept at their speed", async () => {
      await renderSettings({ speedUpLongFlights: false });

      expect(checkbox("Speed up long flights")).not.toBeChecked();
    });

    it("leaves them at their speed once the box is cleared", async () => {
      const { user, store } = await renderSettings();

      await user.click(checkbox("Speed up long flights"));

      expect(store.settings().speedUpLongFlights).toBe(false);
    });

    it("speeds them up again once the box is ticked", async () => {
      const { user, store } = await renderSettings({
        speedUpLongFlights: false,
      });

      await user.click(checkbox("Speed up long flights"));

      expect(store.settings().speedUpLongFlights).toBe(true);
    });
  });

  describe("the guide", () => {
    it("says what the guide shows", async () => {
      await renderSettings();

      expect(checkbox("Show the aim guide")).toHaveAccessibleDescription(
        /^Dots show the shot's flight to its first turn/,
      );
    });

    it("shows it until told otherwise", async () => {
      await renderSettings();

      expect(checkbox("Show the aim guide")).toBeChecked();
    });

    it("leaves the box clear where it was kept hidden", async () => {
      await renderSettings({ guide: false });

      expect(checkbox("Show the aim guide")).not.toBeChecked();
    });

    it("hides it once the box is cleared", async () => {
      const { user, store } = await renderSettings();

      await user.click(checkbox("Show the aim guide"));

      expect(store.settings().guide).toBe(false);
    });

    it("shows it again once the box is ticked", async () => {
      const { user, store } = await renderSettings({ guide: false });

      await user.click(checkbox("Show the aim guide"));

      expect(store.settings().guide).toBe(true);
    });
  });

  describe("the sound", () => {
    it("says what the sounds are", async () => {
      await renderSettings();

      expect(checkbox("Play sounds")).toHaveAccessibleDescription(
        /^A tick for each notch of charge/,
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

    it("turns it off once the box is cleared", async () => {
      const { user, store } = await renderSettings();

      await user.click(checkbox("Play sounds"));

      expect(store.settings().sound).toBe(false);
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

  describe("the debug menu", () => {
    it("is offered in the drawer where DEBUG_MENU says so", async () => {
      await renderSettings({}, { debugMenu: true });

      expect(
        within(screen.getByRole("dialog")).getByRole("region", {
          name: "Debug",
        }),
      ).toBeInTheDocument();
    });

    it("isn't offered in a build for players", async () => {
      await renderSettings();

      expect(
        screen.queryByRole("region", { name: "Debug" }),
      ).not.toBeInTheDocument();
    });

    it("hands the menu's Play the certificate on", async () => {
      const { user, playCertificate } = await renderSettings(
        {},
        { debugMenu: true, files: filesCertifying(fieldDepth) },
      );

      await user.click(
        screen.getByRole("button", { name: "Play the certificate" }),
      );

      expect(playCertificate).toHaveBeenCalledOnce();
    });
  });
});
