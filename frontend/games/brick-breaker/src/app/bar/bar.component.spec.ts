import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  SPEC_LEVEL,
  loseBall,
  playUntil,
  provideSpecLevels,
  under,
} from "../../testing/play";
import { GameService } from "../play/game.service";
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

/** Returns the value a figure in the bar gives, by its term. */
function figure(term: string): string {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  return name?.nextElementSibling?.textContent.trim() ?? "";
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

    it("shows a life lost", async () => {
      const { game, detectChanges } = await renderInPlay();

      loseBall(game);
      detectChanges();

      expect(figure("Lives")).toBe("2 lives");
    });

    it("shows no streak while a hit scores once", async () => {
      await renderInPlay();

      expect(screen.queryByRole("term", { name: "Streak" })).toBeNull();
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

    /** Opens the overflow menu. */
    async function openMenu(user: UserEvent): Promise<void> {
      await user.click(screen.getByRole("button", { name: "More actions" }));
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

    it("moves the levels, How to play and the settings into the menu", async () => {
      const { user } = await renderBar();

      await openMenu(user);

      expect(
        screen.getAllByRole("menuitem").map((item) => item.textContent.trim()),
      ).toEqual(["Levels", "How to play", "Settings"]);
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
