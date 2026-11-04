import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { WaveEntry } from "../../rules/waves";
import { inkOf, pilotsIn } from "../../testing/pilots";
import {
  CHAIN_WAVES,
  FRAME_MS,
  SPEC_WAVE,
  STRAY_WAVES,
  bringStraysHome,
  chainUp,
  loseShip,
  playToClear,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { BarComponent } from "./bar.component";

/** What a spec gets back from rendering the bar. */
interface RenderedBar {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly openSectors: ReturnType<typeof vi.fn>;
  readonly openHelp: ReturnType<typeof vi.fn>;
  readonly openSettings: ReturnType<typeof vi.fn>;
  readonly handBack: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the bar over the specs' waves, or those given, and listens to what it asks for. */
async function renderBar(waves?: readonly WaveEntry[]): Promise<RenderedBar> {
  const openSectors = vi.fn();
  const openHelp = vi.fn();
  const openSettings = vi.fn();
  const handBack = vi.fn();
  const { fixture } = await render(BarComponent, {
    providers: provideSpecWaves(waves),
    on: { openSectors, openHelp, openSettings, handBack },
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    openSectors,
    openHelp,
    openSettings,
    handBack,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Renders the bar with the gift wave started by a first move, a wave in play. */
async function renderInPlay(): Promise<RenderedBar> {
  const rendered = await renderBar();
  await rendered.game.startAt(SPEC_WAVE.gift);
  rendered.game.tick(FRAME_MS, shoot(rendered.game));
  rendered.detectChanges();
  return rendered;
}

/** Renders the bar with a chain counting, a break scoring twice. */
async function renderChaining(): Promise<RenderedBar> {
  const rendered = await renderBar(CHAIN_WAVES);
  chainUp(rendered.game);
  rendered.detectChanges();
  return rendered;
}

/** Returns a figure's term in the bar, by its words, as an element. */
function figureTerm(term: string): HTMLElement {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  if (!name) throw new Error(`No ${term} shown.`);
  return name;
}

/** Returns the value a figure in the bar gives, by its term, as an element. */
function figureValue(term: string): HTMLElement {
  const value = figureTerm(term).nextElementSibling;
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
        screen.getByRole("heading", { level: 1, name: "Asteroid Breaker" }),
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
      expect(game.speed()).toBe("fast");
    });

    it("names the speed chosen before it throws away the wave in play", async () => {
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

      expect({ speed: game.speed(), outcome: game.outcome() }).toEqual({
        speed: "normal",
        outcome: "playing",
      });
    });

    it("shows the wave, the score and the ships", async () => {
      await renderInPlay();

      expect([figure("Wave"), figure("Score"), figure("Ships")]).toEqual([
        "2",
        "0",
        "3 ships",
      ]);
    });

    it("writes the score grouped in thousands", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_WAVE.pebble);

      playToClear(game);
      detectChanges();

      expect(figure("Score")).toBe("1,040");
    });

    it("draws each ship as its pilot, the one at the controls first", async () => {
      await renderInPlay();

      // The pilots are pictures, hidden from a screen reader, so no role finds them.
      expect(pilotsIn(figureValue("Ships"))).toEqual([
        inkOf(0),
        inkOf(1),
        inkOf(2),
      ]);
    });

    it("shows a ship lost, its pilot gone from the line", async () => {
      const { game, detectChanges } = await renderInPlay();

      loseShip(game);
      detectChanges();

      expect({
        ships: figure("Ships"),
        pilots: pilotsIn(figureValue("Ships")),
      }).toEqual({
        ships: "2 ships",
        pilots: [inkOf(1), inkOf(2)],
      });
    });

    it("draws no pilot for a stray waiting at home, which flies no ship yet", async () => {
      const { game, detectChanges } = await renderBar(STRAY_WAVES);

      bringStraysHome(game, 1);
      detectChanges();

      expect(pilotsIn(figureValue("Ships"))).toHaveLength(3);
    });

    it("shows no chain while a break scores once", async () => {
      await renderInPlay();

      expect(terms()).not.toContain("Chain");
    });

    it("shows how many times a break scores while a chain counts", async () => {
      await renderChaining();

      expect(figure("Chain")).toBe("×2");
    });

    it("pauses a wave in play", async () => {
      const { user, game } = await renderInPlay();

      await user.click(screen.getByRole("button", { name: "Pause" }));

      expect(game.outcome()).toBe("paused");
    });

    it("goes on with a paused wave, handing the board the focus", async () => {
      const { user, game, handBack, detectChanges } = await renderInPlay();
      game.pause();
      detectChanges();

      await user.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(handBack).toHaveBeenCalledOnce();
    });

    it("dims Pause while there is no wave in play", async () => {
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

    it("asks for the settings", async () => {
      const { user, openSettings } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Settings" }));

      expect(openSettings).toHaveBeenCalledOnce();
    });

    it("asks for the sectors", async () => {
      const { user, openSectors } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Sectors" }));

      expect(openSectors).toHaveBeenCalledOnce();
    });

    it("asks how to play", async () => {
      const { user, openHelp } = await renderBar();

      await user.click(screen.getByRole("button", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });
  });

  describe.each([
    ["an upright phone", 390, 844],
    ["a phone on its side", 844, 390],
    ["a tablet", 1000, 800],
    ["a window wide enough for the actions' labels but too short", 1280, 480],
  ] as const)("on %s", (_, width, height) => {
    beforeEach(() => {
      viewport = installFakeViewport(width, height);
    });

    it("shows the score and the ships alone", async () => {
      await renderInPlay();

      expect(terms()).toEqual(["Score", "Ships"]);
    });

    it("shows a new run's ships beside its first pilot, at the controls", async () => {
      await renderInPlay();

      expect(pilotsIn(figureTerm("Ships"))).toEqual([inkOf(0)]);
    });

    it("shows the ships as a number beside the pilot at the controls", async () => {
      const { game, detectChanges } = await renderInPlay();

      loseShip(game);
      detectChanges();

      expect({
        number: within(figureValue("Ships")).getByText("2").textContent,
        atControls: pilotsIn(figureTerm("Ships")),
      }).toEqual({ number: "2", atControls: [inkOf(1)] });
    });

    it("leaves out the chain while one counts", async () => {
      await renderChaining();

      expect(terms()).not.toContain("Chain");
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

    it("moves the sectors, How to play and the settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items).toEqual(["Sectors", "How to play", "Settings"]);
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      viewport?.setSize(340, 700);
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });

    it("asks for the settings from the menu", async () => {
      const { user, openSettings } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Settings" }));

      expect(openSettings).toHaveBeenCalledOnce();
    });

    it("asks how to play from the menu", async () => {
      const { user, openHelp } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });

    it("asks for the sectors from the menu", async () => {
      const { user, openSectors } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Sectors" }));

      expect(openSectors).toHaveBeenCalledOnce();
    });
  });
});
