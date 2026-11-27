import { TestBed } from "@angular/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installFakeViewport } from "@fz/game-ui/testing";
import { collectErrors } from "@fz/phaser/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { type HeldLoad, OFFLINE, heldLoad, loadsSettled } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { DebugMenuComponent } from "../debug/debug_menu.component";
import { LOAD_DEBUG_MENU } from "../debug/load_debug_menu";
import { GAME_LEVELS } from "../tokens";
import { MENU_FAILED_WORDS, SettingsComponent } from "./settings.component";
import { SettingsService } from "./settings.service";

/** Says whether the drawer offers the debug menu, as a build for players doesn't, and how its chunk loads. */
interface DebugOptions {
  readonly debugMenu?: boolean;
  /** The menu's load, held until the spec lets it arrive or fail, or the chunk itself where not given. */
  readonly menu?: HeldLoad;
}

/** Describes the drawer rendered, and what a spec does with it. */
interface RenderedSettings {
  /** How often it asked to close. */
  readonly closed: ReturnType<typeof vi.fn>;
  /** Opens or shuts it. */
  readonly setOpen: (open: boolean) => void;
  /** Lets the page settle, the menu's load among what it waits for. */
  readonly settle: () => Promise<void>;
}

/**
 * Renders the settings drawer, open, the game on the small levels. The
 * drawer offers no debug menu, as a build for players doesn't, unless
 * asked to. A menu offered is waited for, but one whose load is held.
 */
async function renderSettings({
  debugMenu = false,
  menu,
}: DebugOptions = {}): Promise<RenderedSettings> {
  const closed = vi.fn();
  const { fixture } = await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: [
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
      { provide: DEBUG_MENU, useValue: debugMenu },
      ...(menu ? [{ provide: LOAD_DEBUG_MENU, useValue: menu.load }] : []),
    ],
  });
  // A held load would keep the page from settling.
  if (menu) {
    fixture.detectChanges();
  } else {
    await loadsSettled(fixture);
  }
  return {
    closed,
    setOpen: (open) => {
      fixture.componentRef.setInput("open", open);
      fixture.detectChanges();
    },
    settle: () => loadsSettled(fixture),
  };
}

/** Returns the settings in use. */
function settings(): SettingsService {
  return TestBed.inject(SettingsService);
}

describe("SettingsComponent", () => {
  beforeEach(() => {
    // A system that allows motion, which jsdom alone doesn't say.
    installFakeViewport(390, 844);
  });

  it("offers each speed, Normal checked at first", async () => {
    await renderSettings();

    expect(
      within(screen.getByRole("radiogroup", { name: "Speed" }))
        .getAllByRole("radio")
        .map((speed) => [
          speed.textContent.trim(),
          speed.getAttribute("aria-checked"),
        ]),
    ).toEqual([
      [
        expect.stringMatching(/^Normal\s*Easy to follow every bunch\.$/),
        "true",
      ],
      [
        expect.stringMatching(/^Fast\s*Quicker, for levels you know well\.$/),
        "false",
      ],
    ]);
  });

  it("keeps the speed chosen", async () => {
    await renderSettings();

    await userEvent.click(screen.getByRole("radio", { name: /^Fast/ }));

    expect(settings().settings().speed).toBe("fast");
  });

  it("says what Less motion stops", async () => {
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Less motion" }),
    ).toHaveAccessibleDescription(
      "Stops the shaking, the flashes and the fuzzballs flying to the goals. If your device is set to reduce motion, this starts on.",
    );
  });

  it.each([
    ["allows motion", false, false],
    ["asks for less", true, true],
  ])(
    "shows Less motion as the system has it until it is set: where it %s, checked %s",
    async (_, reduced, checked) => {
      installFakeViewport(390, 844).setReducedMotion(reduced);

      await renderSettings();

      expect(
        screen.getByRole("checkbox", { name: "Less motion" }),
      ).toHaveProperty("checked", checked);
    },
  );

  it("turns Less motion on as its box is checked", async () => {
    await renderSettings();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Less motion" }),
    );

    expect(settings().lessMotion()).toBe(true);
  });

  it("turns the sound off as its box is cleared", async () => {
    await renderSettings();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Play sounds" }),
    );

    expect(settings().settings().sound).toBe(false);
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByRole("radiogroup", { name: /theme/i })).toBeVisible();
  });

  it("asks to close from its close button", async () => {
    const { closed } = await renderSettings();

    await userEvent.click(
      screen.getByRole("button", { name: "Close settings" }),
    );

    expect(closed).toHaveBeenCalledOnce();
  });

  describe("the debug menu", () => {
    it("is offered in the drawer where DEBUG_MENU says so", async () => {
      await renderSettings({ debugMenu: true });

      expect(
        within(screen.getByRole("dialog")).getByRole("region", {
          name: "Debug",
        }),
      ).toBeInTheDocument();
    });

    it("isn't offered in a build for players, nor a reported state to load", async () => {
      await renderSettings();

      expect([
        screen.queryByRole("region", { name: "Debug" }),
        screen.queryByRole("textbox", { name: "Load game state" }),
      ]).toEqual([null, null]);
    });

    it("asks to close once the menu has played a deal", async () => {
      const { closed } = await renderSettings({ debugMenu: true });

      await userEvent.click(
        screen.getByRole("button", { name: "Play the deal" }),
      );

      await vi.waitFor(() => {
        expect(closed).toHaveBeenCalledOnce();
      });
    });

    describe("on a slow connection", () => {
      it("says the menu is loading while its chunk is on its way", async () => {
        await renderSettings({
          debugMenu: true,
          menu: heldLoad(DebugMenuComponent),
        });

        expect(
          within(screen.getByRole("dialog")).getByText(
            "Loading the debug menu…",
          ),
        ).toBeVisible();
      });

      it("shows the menu in its place once it has loaded", async () => {
        const menu = heldLoad(DebugMenuComponent);
        const { settle } = await renderSettings({ debugMenu: true, menu });

        menu.arrive();
        await settle();

        expect({
          loading: screen.queryByText("Loading the debug menu…"),
          menu: screen.getByRole("region", { name: "Debug" }),
        }).toEqual({
          loading: null,
          menu: expect.toBeInTheDocument() as unknown,
        });
      });

      it("says in the drawer's own live region, as the drawer hides the page's, that it couldn't be loaded, as the app's error handler is told why", async () => {
        const errors = collectErrors();
        const menu = heldLoad(DebugMenuComponent);
        const { settle } = await renderSettings({ debugMenu: true, menu });

        menu.fail();
        await settle();

        expect({
          said: await within(screen.getByRole("dialog")).findByText(
            MENU_FAILED_WORDS,
          ),
          loading: screen.queryByText("Loading the debug menu…"),
          menu: screen.queryByRole("region", { name: "Debug" }),
          errors,
        }).toEqual({
          said: expect.toHaveAttribute("aria-live", "polite") as unknown,
          loading: null,
          menu: null,
          errors: [OFFLINE],
        });
      });

      it("says nothing of a load that failed while the drawer was shut, as the player asked for nothing", async () => {
        collectErrors();
        const menu = heldLoad(DebugMenuComponent);
        const { setOpen, settle } = await renderSettings({
          debugMenu: true,
          menu,
        });
        setOpen(false);

        menu.fail();
        await settle();

        expect(TestBed.inject(AnnouncerService).message()).toBe("");
      });

      it("says nothing is loading as the drawer opens again once the menu is in it", async () => {
        const menu = heldLoad(DebugMenuComponent);
        const { setOpen, settle } = await renderSettings({
          debugMenu: true,
          menu,
        });
        menu.arrive();
        await settle();
        setOpen(false);

        setOpen(true);

        expect(
          screen.queryByText("Loading the debug menu…"),
        ).not.toBeInTheDocument();
      });

      it("loads it again as the drawer opens again after a load failed", async () => {
        collectErrors();
        const menu = heldLoad(DebugMenuComponent);
        const { setOpen, settle } = await renderSettings({
          debugMenu: true,
          menu,
        });
        menu.fail();
        await settle();

        setOpen(false);
        setOpen(true);
        menu.arrive();
        await settle();

        expect(
          screen.getByRole("region", { name: "Debug" }),
        ).toBeInTheDocument();
      });
    });
  });
});
