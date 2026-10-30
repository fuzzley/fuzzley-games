import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  SPEC_LEVEL,
  loseBall,
  playToClear,
  playUntil,
  provideSpecLevels,
  under,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BarComponent } from "./bar.component";

/** What a spec gets back from rendering the bar. */
interface RenderedBar {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly openLevels: ReturnType<typeof vi.fn>;
  readonly openHelp: ReturnType<typeof vi.fn>;
  readonly openSettings: ReturnType<typeof vi.fn>;
  readonly handBack: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the bar over the specs' levels, and listens to what it asks for. */
async function renderBar(): Promise<RenderedBar> {
  const openLevels = vi.fn();
  const openHelp = vi.fn();
  const openSettings = vi.fn();
  const handBack = vi.fn();
  const { fixture } = await render(BarComponent, {
    providers: provideSpecLevels(),
    on: { openLevels, openHelp, openSettings, handBack },
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    openLevels,
    openHelp,
    openSettings,
    handBack,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Renders the bar with the steel level's ball served, a level in play. */
async function renderInPlay(): Promise<RenderedBar> {
  const rendered = await renderBar();
  await rendered.game.startAt(SPEC_LEVEL.steel);
  rendered.game.launch();
  rendered.detectChanges();
  return rendered;
}

/** Returns the value a figure in the bar gives, by its term, as an element. */
function figureValue(term: string): HTMLElement {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  const value = name?.nextElementSibling;
  if (!(value instanceof HTMLElement)) throw new Error(`No ${term} shown.`);
  return value;
}

/** Returns the value a figure in the bar gives, by its term. */
function figure(term: string): string {
  return figureValue(term).textContent.trim();
}

/** Returns the terms of the figures the bar shows, in order. */
function terms(): string[] {
  return screen.getAllByRole("term").map((dt) => dt.textContent.trim());
}

/** Returns the badge that shows the speed and offers the others. */
function speedBadge(): HTMLElement {
  return screen.getByRole("button", { name: /^Speed: / });
}

/** Chooses a speed from the badge's menu. */
async function chooseSpeed(user: UserEvent, name: string): Promise<void> {
  await user.click(speedBadge());
  await user.click(
    screen.getByRole("menuitemradio", { name: new RegExp(`^${name}`) }),
  );
}

describe("BarComponent", () => {
  let viewport: FakeViewport | null = null;

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  describe("on a roomy screen", () => {
    it("names the page with one heading", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Brick Breaker" }),
      ).toBeInTheDocument();
    });

    it("shows the speed of the run", async () => {
      await renderBar();

      expect(speedBadge()).toHaveAccessibleName("Speed: Normal");
    });

    it("starts a run at the speed chosen while none is under way", async () => {
      const { user, game } = await renderBar();

      await chooseSpeed(user, "Fast");

      expect(
        await screen.findByRole("button", { name: "Speed: Fast" }),
      ).toBeInTheDocument();
      expect(game.run().speed).toBe("fast");
    });

    it("names the speed chosen before it throws away the level in play", async () => {
      const { user } = await renderInPlay();

      await chooseSpeed(user, "Relaxed");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Relaxed game?",
      );
    });

    it("keeps the run under way when the player backs out", async () => {
      const { user, game } = await renderInPlay();
      await chooseSpeed(user, "Relaxed");

      TestBed.inject(ConfirmService).cancel();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(game.run().speed).toBe("normal");
    });

    it("shows the level, the score and the lives", async () => {
      await renderInPlay();

      expect([figure("Level"), figure("Score"), figure("Lives")]).toEqual([
        "3",
        "0",
        "3 lives",
      ]);
    });

    it("writes the score grouped in thousands", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_LEVEL.blasts);

      playToClear(game);
      detectChanges();

      expect(figure("Score")).toBe("4,100");
    });

    it("shows a life lost", async () => {
      const { game, detectChanges } = await renderInPlay();

      loseBall(game);
      detectChanges();

      expect(figure("Lives")).toBe("2 lives");
    });

    it("shows no streak while a hit scores once", async () => {
      await renderInPlay();

      expect(terms()).not.toContain("Streak");
    });

    it("draws a heart for each life", async () => {
      await renderInPlay();

      // The hearts are pictures, hidden from a screen reader, so no role finds them.
      expect(figureValue("Lives").querySelectorAll("fz-icon")).toHaveLength(3);
    });

    it("shows how many times a hit scores while a streak counts", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_LEVEL.few);
      game.launch();

      playUntil(game, under, () => game.multiplier() > 1);
      detectChanges();

      expect(figure("Streak")).toBe("×2");
    });

    it("pauses a level in play", async () => {
      const { user, game } = await renderInPlay();

      await user.click(screen.getByRole("button", { name: "Pause" }));

      expect(game.outcome()).toBe("paused");
    });

    it("goes on with a paused level, handing the board the focus", async () => {
      const { user, game, handBack, detectChanges } = await renderInPlay();
      game.pause();
      detectChanges();

      await user.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(handBack).toHaveBeenCalledOnce();
    });

    it("dims Pause while there is no level in play", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("does nothing at a dimmed Pause", async () => {
      const { user, game } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Pause" }));

      expect(game.outcome()).toBe("ready");
    });

    it("keeps the focus where it was through a press on Pause", async () => {
      await renderBar();

      const kept = !fireEvent.pointerDown(
        screen.getByRole("button", { name: "Pause" }),
      );

      expect(kept).toBe(true);
    });

    it("shows the sound on, pressed", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("turns the sound off, which the settings keep", async () => {
      const { user } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Sound" }));

      expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
      expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("keeps the focus where it was through a press on Sound", async () => {
      await renderBar();

      const kept = !fireEvent.pointerDown(
        screen.getByRole("button", { name: "Sound" }),
      );

      expect(kept).toBe(true);
    });

    it("starts a new game", async () => {
      const { user, game } = await renderBar();

      await user.click(screen.getByRole("button", { name: "New game" }));

      expect(game.runs()).toBe(1);
    });

    it.each([
      ["the levels", "Levels", "openLevels"],
      ["How to play", "How to play", "openHelp"],
      ["the settings", "Settings", "openSettings"],
    ] as const)("asks for %s", async (_, name, output) => {
      const rendered = await renderBar();

      await rendered.user.click(screen.getByRole("button", { name }));

      expect(rendered[output]).toHaveBeenCalledOnce();
    });
  });

  describe.each([
    ["an upright phone", 390, 844],
    ["a phone on its side", 844, 390],
    ["a tablet", 1000, 800],
  ] as const)("on %s", (_, width, height) => {
    beforeEach(() => {
      viewport = installFakeViewport(width, height);
    });

    it("shows the score and the lives alone", async () => {
      await renderInPlay();

      expect(terms()).toEqual(["Score", "Lives"]);
    });

    it("shows the lives as a number", async () => {
      const { game, detectChanges } = await renderInPlay();

      loseBall(game);
      detectChanges();

      expect(within(figureValue("Lives")).getByText("2")).toBeInTheDocument();
    });

    it("leaves out the streak while one counts", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_LEVEL.few);
      game.launch();

      playUntil(game, under, () => game.multiplier() > 1);
      detectChanges();

      expect(terms()).not.toContain("Streak");
    });
  });

  describe("on a compact screen", () => {
    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    /** Opens the overflow menu, and returns what it offers. */
    async function openMenu(user: UserEvent): Promise<string[]> {
      await user.click(screen.getByRole("button", { name: "More actions" }));
      return screen
        .getAllByRole("menuitem")
        .map((item) => item.textContent.trim());
    }

    it("keeps the speed in the bar, out of the menu", async () => {
      await renderBar();

      expect(speedBadge()).toBeVisible();
    });

    it("keeps Pause and New game in the bar", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
      expect(screen.getByRole("button", { name: "New game" })).toBeVisible();
    });

    it("moves the sound, the levels, How to play and the settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items).toEqual([
        "Turn sound off",
        "Levels",
        "How to play",
        "Settings",
      ]);
    });

    it("turns the sound off from the menu", async () => {
      const { user } = await renderBar();
      await openMenu(user);

      await user.click(
        screen.getByRole("menuitem", { name: "Turn sound off" }),
      );

      expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
    });

    it("offers to turn the sound back on from the menu", async () => {
      const { user, detectChanges } = await renderBar();
      TestBed.inject(SettingsService).update({ sound: false });
      detectChanges();

      const items = await openMenu(user);

      expect(items[0]).toBe("Turn sound on");
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      viewport?.setSize(340, 700);
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });

    it.each([
      ["the levels", "Levels", "openLevels"],
      ["How to play", "How to play", "openHelp"],
      ["the settings", "Settings", "openSettings"],
    ] as const)("asks for %s from the menu", async (_, name, output) => {
      const rendered = await renderBar();
      await openMenu(rendered.user);

      await rendered.user.click(screen.getByRole("menuitem", { name }));

      expect(rendered[output]).toHaveBeenCalledOnce();
    });
  });
});
