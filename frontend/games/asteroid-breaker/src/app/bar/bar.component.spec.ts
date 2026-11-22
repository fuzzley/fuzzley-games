import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { FRAME_MS } from "@fz/core/testing";
import {
  type FakeViewport,
  barChoice,
  chooseInBar,
  installFakeViewport,
  openBarMenu,
} from "@fz/game-ui/testing";
import { paintRoles } from "@fz/style/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { figure, figureValue, figures } from "@fz/ui/testing";
import { STILL } from "../../rules/ship/ship";
import { STATIC_STEPS } from "../../rules/tuning";
import type { WaveEntry } from "../../rules/waves/waves";
import { inkOf, pilotsIn, poseIn, posesIn } from "../../testing/pilots";
import { ROLES } from "../../testing/roles";
import {
  SPEC_WAVE,
  STRAY_WAVES,
  bringStraysHome,
  clearToNext,
  knockOneLoose,
  playToClear,
  provideSpecWaves,
  shoot,
  takeUpCharged,
} from "../../testing/play";
import { FIELD_ROLES } from "../board/field_roles";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
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

/**
 * Renders the bar over the specs' waves, or those given, in the field's
 * colors a stylesheet would give the page, which the face cam draws in, and
 * listens to what it asks for.
 */
async function renderBar(waves?: readonly WaveEntry[]): Promise<RenderedBar> {
  paintRoles(FIELD_ROLES, ROLES);
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

/**
 * Renders the bar with a run taken up with static at a level, paused, and
 * a frame of it, which shows the pilot's face and fur.
 */
async function renderChargedTo(level: number): Promise<RenderedBar> {
  const rendered = await renderBar();
  await rendered.game.startAt(SPEC_WAVE.pebble);
  rendered.game.tick(FRAME_MS, shoot(rendered.game));
  takeUpCharged(rendered.game, level);
  rendered.game.tick(FRAME_MS, STILL);
  rendered.detectChanges();
  return rendered;
}

/** Renders the bar with a run taken up at static's first step, what is scored scoring twice. */
async function renderCharged(): Promise<RenderedBar> {
  return renderChargedTo(STATIC_STEPS[2].from);
}

/** Returns a figure's term in the bar, by its words, as an element. */
function figureTerm(term: string): HTMLElement {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  if (!name) throw new Error(`No ${term} shown.`);
  return name;
}

/** Returns the terms of the figures the bar shows, in order. */
function terms(): string[] {
  return screen.getAllByRole("term").map((dt) => dt.textContent.trim());
}

/** Returns whether each of static's pips is lit, in order. */
function pips(): boolean[] {
  return Array.from(
    figureValue("Static").querySelectorAll("[data-lit]"),
    (pip) => pip.getAttribute("data-lit") === "true",
  );
}

describe("BarComponent", () => {
  describe("on a roomy screen", () => {
    // A browser reads a tooltip that says what an `aria-label` says again,
    // as the description, so each round button is named by its tooltip.
    it.each(["Sectors", "How to play", "Settings"])(
      "gives %s no label beside its tooltip, so its name is read once",
      async (name) => {
        await renderBar();

        expect(screen.getByRole("button", { name })).not.toHaveAttribute(
          "aria-label",
        );
      },
    );

    it("names the page with one heading", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Asteroid Breaker" }),
      ).toBeInTheDocument();
    });

    it("shows the speed of the run", async () => {
      await renderBar();

      expect(barChoice("Speed")).toHaveAccessibleName("Speed: Normal");
    });

    it("starts a run at the speed chosen while none is under way", async () => {
      const { user, game } = await renderBar();

      await chooseInBar(user, "Speed", "Fast");

      expect(
        await screen.findByRole("button", { name: "Speed: Fast" }),
      ).toBeInTheDocument();
      expect(game.speed()).toBe("fast");
    });

    it("names the speed chosen before it throws away the wave in play", async () => {
      const { user } = await renderInPlay();

      await chooseInBar(user, "Speed", "Relaxed");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Relaxed game?",
      );
    });

    it("keeps the run under way when the player backs out", async () => {
      const { user, game } = await renderInPlay();
      await chooseInBar(user, "Speed", "Relaxed");

      TestBed.inject(ConfirmService).cancel();
      await TestBed.inject(ApplicationRef).whenStable();

      expect({ speed: game.speed(), outcome: game.outcome() }).toEqual({
        speed: "normal",
        outcome: "playing",
      });
    });

    it("shows the wave, the score, the crew in tow and static", async () => {
      await renderInPlay();

      expect(figures()).toEqual([
        ["Wave", "2"],
        ["Score", "0"],
        ["Crew", "2 following"],
        ["Static", "×1"],
      ]);
    });

    it("writes the score grouped in thousands", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_WAVE.pebble);

      playToClear(game);
      detectChanges();

      expect(figure("Score")).toBe("1,100");
    });

    it("draws the crew, the pilot at the controls in the face cam, those in tow beside it", async () => {
      await renderInPlay();

      // The pilots are pictures, hidden from a screen reader, so no role finds them.
      expect({
        atControls: pilotsIn(figureTerm("Crew")),
        inTow: pilotsIn(figureValue("Crew")),
      }).toEqual({ atControls: [inkOf(0)], inTow: [inkOf(1), inkOf(2)] });
    });

    it("shows one knocked loose by a hit after the line in tow, wide eyed", async () => {
      const { game, detectChanges } = await renderInPlay();

      knockOneLoose(game);
      detectChanges();

      expect({
        crew: figure("Crew"),
        drawn: posesIn(figureValue("Crew")),
      }).toEqual({
        crew: "1 following, 1 knocked loose",
        drawn: [
          [inkOf(1), "rest"],
          [inkOf(2), "eep"],
        ],
      });
    });

    it("draws a stray brought home in tow, as it rides behind the pod at once", async () => {
      const { game, detectChanges } = await renderBar(STRAY_WAVES);

      bringStraysHome(game, 1);
      detectChanges();

      expect({
        crew: figure("Crew"),
        drawn: pilotsIn(figureValue("Crew")),
      }).toEqual({
        crew: "3 following",
        drawn: [inkOf(1), inkOf(2), inkOf(3)],
      });
    });

    it("counts the crew in tow past three, beside the first", async () => {
      const { game, detectChanges } = await renderBar(STRAY_WAVES);

      bringStraysHome(game, 2);
      detectChanges();

      // The number is hidden from a screen reader, which hears it in words.
      const value = within(figureValue("Crew"));
      expect({
        drawn: pilotsIn(figureValue("Crew")),
        count: value.getByText("4").getAttribute("aria-hidden"),
        said: value.getByText("4 following").className,
      }).toEqual({
        drawn: [inkOf(1)],
        count: "true",
        said: "fz-visually-hidden",
      });
    });

    it("shows the pilot at the controls sleepy while the wave waits for its first move", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_WAVE.gift);

      game.tick(FRAME_MS, STILL);
      detectChanges();

      expect(poseIn(figureTerm("Crew")).face).toBe("sleepy");
    });

    it("shows the pilot at the controls set as the ship fires", async () => {
      await renderInPlay();

      expect(poseIn(figureTerm("Crew")).face).toBe("set");
    });

    it("shows the pilot at the controls dizzy as a hit knocks one loose", async () => {
      const { game, detectChanges } = await renderInPlay();

      knockOneLoose(game);
      detectChanges();

      expect(poseIn(figureTerm("Crew")).face).toBe("dizzy");
    });

    it("shows the pilot at the controls happy over a cleared wave", async () => {
      const { game, detectChanges } = await renderBar();
      await game.startAt(SPEC_WAVE.pebble);

      playToClear(game);
      detectChanges();

      expect(poseIn(figureTerm("Crew")).face).toBe("happy");
    });

    it.each([
      [0, 1, [true, false, false, false]],
      [STATIC_STEPS[2].from, 2, [true, true, false, false]],
      [STATIC_STEPS[1].from, 3, [true, true, true, false]],
      [STATIC_STEPS[0].from, 4, [true, true, true, true]],
    ])(
      "shows static at %d scoring ×%i with as many pips lit, the pilot's fur lifted a step for each past the first",
      async (level, times, lit) => {
        await renderChargedTo(level);

        expect({
          multiplier: figure("Static"),
          pips: pips(),
          lift: poseIn(figureTerm("Crew")).lift,
        }).toEqual({
          multiplier: `×${String(times)}`,
          pips: lit,
          lift: times - 1,
        });
      },
    );

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

    it("dims Pause while the next wave waits for its first move", async () => {
      const { game, detectChanges } = await renderBar();
      clearToNext(game);
      detectChanges();

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

    it("turns the sound back on", async () => {
      const { user, detectChanges } = await renderBar();
      TestBed.inject(SettingsService).update({ sound: false });
      detectChanges();

      await user.click(screen.getByRole("button", { name: "Sound" }));

      expect(TestBed.inject(SettingsService).settings().sound).toBe(true);
    });

    it("keeps the focus where it was through a press on Sound", async () => {
      await renderBar();

      const kept = !fireEvent.pointerDown(
        screen.getByRole("button", { name: "Sound" }),
      );

      expect(kept).toBe(true);
    });

    it("starts a new game from the bar", async () => {
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
      installFakeViewport(width, height);
    });

    it("shows the score, the crew and static, without the wave", async () => {
      await renderInPlay();

      expect(terms()).toEqual(["Score", "Crew", "Static"]);
    });

    it("shows a new run's crew aboard as a number on the face cam, its first pilot at the controls", async () => {
      await renderInPlay();

      expect({
        number: within(figureValue("Crew")).getByText("3").textContent,
        said: within(figureValue("Crew")).getByText("3 aboard").className,
        atControls: pilotsIn(figureTerm("Crew")),
      }).toEqual({
        number: "3",
        said: "fz-visually-hidden",
        atControls: [inkOf(0)],
      });
    });

    it("draws no one in tow beside the face cam", async () => {
      await renderInPlay();

      expect(pilotsIn(figureValue("Crew"))).toEqual([]);
    });

    it("counts the crew aboard down as a hit knocks one loose", async () => {
      const { game, detectChanges } = await renderInPlay();

      knockOneLoose(game);
      detectChanges();

      expect(within(figureValue("Crew")).getByText("2")).toBeVisible();
    });

    it("shows the pilot at the controls with the face the field shows", async () => {
      await renderInPlay();

      expect(poseIn(figureTerm("Crew")).face).toBe("set");
    });

    it("shows how many times what is scored scores, with as many pips lit, the pilot's fur lifted", async () => {
      await renderCharged();

      expect({
        multiplier: figure("Static"),
        pips: pips(),
        lift: poseIn(figureTerm("Crew")).lift,
      }).toEqual({
        multiplier: "×2",
        pips: [true, true, false, false],
        lift: 1,
      });
    });
  });

  describe("on a compact screen", () => {
    let viewport: FakeViewport;

    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    it("keeps the speed in the bar, out of the menu", async () => {
      await renderBar();

      expect(barChoice("Speed")).toBeVisible();
    });

    it("keeps Pause in the bar", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
    });

    it("moves the sound, the sectors, New game, How to play and the settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect({
        items,
        newGameInBar: screen.queryByRole("button", { name: "New game" }),
      }).toEqual({
        items: [
          "Turn sound off",
          "Sectors",
          "New game",
          "How to play",
          "Settings",
        ],
        newGameInBar: null,
      });
    });

    it("starts a new game from the menu", async () => {
      const { user, game } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "New game" }));

      expect(game.runs()).toBe(1);
    });

    it("turns the sound off from the menu", async () => {
      const { user } = await renderBar();
      await openBarMenu(user);

      await user.click(
        screen.getByRole("menuitem", { name: "Turn sound off" }),
      );

      expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
    });

    it("offers to turn the sound back on from the menu", async () => {
      const { user, detectChanges } = await renderBar();
      TestBed.inject(SettingsService).update({ sound: false });
      detectChanges();

      const items = await openBarMenu(user);

      expect(items[0]).toBe("Turn sound on");
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      viewport.setSize(340, 700);
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });

    it("asks for the settings from the menu", async () => {
      const { user, openSettings } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Settings" }));

      expect(openSettings).toHaveBeenCalledOnce();
    });

    it("asks how to play from the menu", async () => {
      const { user, openHelp } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });

    it("asks for the sectors from the menu", async () => {
      const { user, openSectors } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Sectors" }));

      expect(openSectors).toHaveBeenCalledOnce();
    });
  });
});
