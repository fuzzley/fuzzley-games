import { TestBed } from "@angular/core/testing";
import type { RunStage } from "@fz/core/run";
import { installFakeViewport, openBarMenu } from "@fz/game-ui/testing";
import { cssHex } from "@fz/phaser/color";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { figure, figureValue } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { Mock } from "vitest";
import { friendInk } from "../../view/colors/inks";
import { BarComponent } from "./bar.component";

/** Green, the fourth of the friends' inks, which differs between the modes. */
const GREEN = 3;

/** Blue, the sixth of the friends' inks. */
const BLUE = 5;

/** What the bar is handed, as a level stands mid-flight. */
interface BarInputs {
  readonly level: number;
  readonly rounds: number;
  readonly par: number;
  readonly rowsLeft: number;
  readonly score: number;
  readonly friends: readonly number[];
  readonly outcome: RunStage;
  readonly flying: boolean;
  readonly fast: boolean;
  readonly soundOn: boolean;
}

/** A level under way, its fourth round in flight with two friends behind it. */
const MID_FLIGHT: BarInputs = {
  level: 12,
  rounds: 4,
  par: 9,
  rowsLeft: 23,
  score: 128450,
  friends: [GREEN, BLUE],
  outcome: "playing",
  flying: true,
  fast: false,
  soundOn: true,
};

/** Names one of the bar's outputs that carry nothing. */
type Output =
  | "pauseRun"
  | "resumeRun"
  | "skipFlight"
  | "toggleSound"
  | "openLevels"
  | "newGame"
  | "openHelp"
  | "openSettings";

/** What a spec gets back from rendering the bar. */
interface RenderedBar {
  readonly user: UserEvent;
  /** Each output that carries nothing, by its name, listened to. */
  readonly heard: Readonly<Record<Output, Mock<() => void>>>;
  /** What Fast-forward asked for, each press's wish to play fast or not. */
  readonly fastAsked: boolean[];
  /** Puts a palette on the page. */
  readonly choosePalette: (theme: ThemeId) => void;
}

afterEach(() => {
  Reflect.deleteProperty(document.documentElement.dataset, "theme");
});

/** Renders the bar, handed a level mid-flight but for what a spec says, and listens to it. */
async function renderBar(
  inputs: Partial<BarInputs> = {},
): Promise<RenderedBar> {
  const heard: Record<Output, Mock<() => void>> = {
    pauseRun: vi.fn(),
    resumeRun: vi.fn(),
    skipFlight: vi.fn(),
    toggleSound: vi.fn(),
    openLevels: vi.fn(),
    newGame: vi.fn(),
    openHelp: vi.fn(),
    openSettings: vi.fn(),
  };
  const fastAsked: boolean[] = [];
  const { fixture } = await render(BarComponent, {
    inputs: { ...MID_FLIGHT, ...inputs },
    on: {
      ...heard,
      fastForward: (fast: boolean) => {
        fastAsked.push(fast);
      },
    },
  });
  return {
    user: userEvent.setup(),
    heard,
    fastAsked,
    choosePalette: (theme) => {
      TestBed.inject(ThemeService).select(theme);
      TestBed.tick();
      fixture.detectChanges();
    },
  };
}

/** Returns the terms of the figures the bar shows, in order. */
function terms(): string[] {
  return screen.getAllByRole("term").map((dt) => dt.textContent.trim());
}

/** Returns the fuzzballs a figure draws, which no role finds, as they are pictures. */
function fuzzballsOf(term: string): HTMLElement[] {
  return Array.from(
    figureValue(term).querySelectorAll<HTMLElement>("fz-fuzzball"),
  );
}

/** Returns the names of the bar's buttons, in order: each one's label, or its text. */
function buttonNames(): string[] {
  return within(screen.getByRole("banner"))
    .getAllByRole("button")
    .map(
      (button) =>
        button.getAttribute("aria-label") ?? button.textContent.trim(),
    );
}

describe("BarComponent", () => {
  describe("on a roomy screen", () => {
    it("names the page with one heading", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Brick Fuzz Pop" }),
      ).toBeInTheDocument();
    });

    it("shows the level, the rounds, the rows left, the score and the crew", async () => {
      await renderBar();

      expect(terms()).toEqual([
        "Level",
        "Rounds",
        "Rows left",
        "Score",
        "Crew",
      ]);
    });

    it("shows the level and the rows left", async () => {
      await renderBar();

      expect([figure("Level"), figure("Rows left")]).toEqual(["12", "23"]);
    });

    it("shows the rounds against par", async () => {
      await renderBar();

      expect(within(figureValue("Rounds")).getByText("4/9")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("says the rounds against par in words", async () => {
      await renderBar();

      expect(
        within(figureValue("Rounds")).getByText("4 rounds, par 9"),
      ).toHaveClass("fz-visually-hidden");
    });

    it("says a single round as one", async () => {
      await renderBar({ rounds: 1 });

      expect(
        within(figureValue("Rounds")).getByText("1 round, par 9"),
      ).toBeInTheDocument();
    });

    it("writes the score grouped in thousands", async () => {
      await renderBar();

      expect(figure("Score")).toBe("128,450");
    });

    it("counts the crew as fuzzballs, the player's among them", async () => {
      await renderBar();

      expect(figure("Crew")).toBe("3 fuzzballs");
    });

    it("counts the player's fuzzball alone as one", async () => {
      await renderBar({ friends: [] });

      expect(figure("Crew")).toBe("1 fuzzball");
    });

    it("draws the player's fuzzball, then a fuzzball for each friend", async () => {
      await renderBar();

      expect(fuzzballsOf("Crew").map((ball) => ball.className)).toEqual([
        "own",
        "",
        "",
      ]);
    });

    it("draws each friend in its ink in a light palette", async () => {
      const { choosePalette } = await renderBar();

      choosePalette("classic");

      expect(fuzzballsOf("Crew").slice(1)).toEqual([
        expect.toHaveStyle({ color: cssHex(friendInk(GREEN, "light")) }),
        expect.toHaveStyle({ color: cssHex(friendInk(BLUE, "light")) }),
      ]);
    });

    it("draws each friend in its ink in a dark palette", async () => {
      const { choosePalette } = await renderBar();

      choosePalette("midnight");

      expect(fuzzballsOf("Crew")[1]).toHaveStyle({
        color: cssHex(friendInk(GREEN, "dark")),
      });
    });

    it("offers Pause, Fast-forward and Skip, then the rest, each round", async () => {
      await renderBar();

      expect(buttonNames()).toEqual([
        "Pause",
        "Fast-forward",
        "Skip",
        "Sound",
        "Levels",
        "New game",
        "How to play",
        "Settings",
      ]);
    });

    it("draws every action but Pause as a circle, New game too", async () => {
      await renderBar();

      const actions = within(screen.getByRole("banner"))
        .getAllByRole("button")
        .filter((button) => button.textContent.trim() !== "Pause");

      expect(
        actions.map((button) => button.classList.contains("fz-button-circle")),
      ).toEqual(actions.map(() => true));
    });

    it.each([
      ["in play", "playing", "Pause"],
      ["paused", "paused", "Resume"],
    ] as const)(
      "names Pause under the pointer with a run %s",
      async (_, outcome, name) => {
        await renderBar({ outcome });

        expect(screen.getByRole("button", { name })).toHaveAttribute(
          "title",
          name,
        );
      },
    );

    it("pauses the run in play", async () => {
      const { user, heard } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Pause" }));

      expect(heard.pauseRun).toHaveBeenCalledOnce();
    });

    it("goes on with the paused run", async () => {
      const { user, heard } = await renderBar({ outcome: "paused" });

      await user.click(screen.getByRole("button", { name: "Resume" }));

      expect(heard.resumeRun).toHaveBeenCalledOnce();
    });

    it("keeps Pause's label for a screen reader alone", async () => {
      await renderBar();

      expect(
        within(screen.getByRole("button", { name: "Pause" })).getByText(
          "Pause",
        ),
      ).toHaveClass("fz-visually-hidden");
    });

    it("dims Pause while no level is in play", async () => {
      await renderBar({ outcome: "ready", flying: false });

      expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("asks for the flight fast", async () => {
      const { user, fastAsked } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Fast-forward" }));

      expect(fastAsked).toEqual([true]);
    });

    it("asks for the flight at its speed again while it plays fast", async () => {
      const { user, fastAsked } = await renderBar({ fast: true });

      await user.click(screen.getByRole("button", { name: "Fast-forward" }));

      expect(fastAsked).toEqual([false]);
    });

    it("shows Fast-forward pressed while the flight plays fast", async () => {
      await renderBar({ fast: true });

      expect(
        screen.getByRole("button", { name: "Fast-forward" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("skips the flight", async () => {
      const { user, heard } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Skip" }));

      expect(heard.skipFlight).toHaveBeenCalledOnce();
    });

    it("skips a flight paused as the player tabbed to Skip", async () => {
      const { user, heard } = await renderBar({ outcome: "paused" });

      await user.click(screen.getByRole("button", { name: "Skip" }));

      expect(heard.skipFlight).toHaveBeenCalledOnce();
    });

    it.each(["Fast-forward", "Skip"])(
      "dims %s while there is no flight",
      async (name) => {
        await renderBar({ flying: false });

        expect(screen.getByRole("button", { name })).toHaveAttribute(
          "aria-disabled",
          "true",
        );
      },
    );

    it("shows the sound on, pressed", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it.each([
      ["turns the sound off", "Sound", "toggleSound"],
      ["asks for the levels", "Levels", "openLevels"],
      ["asks for a new game", "New game", "newGame"],
      ["asks how to play", "How to play", "openHelp"],
      ["asks for the settings", "Settings", "openSettings"],
    ] as const)("%s", async (_, name, output) => {
      const { user, heard } = await renderBar();

      await user.click(screen.getByRole("button", { name }));

      expect(heard[output]).toHaveBeenCalledOnce();
    });
  });

  describe.each([
    ["an upright phone", 390, 844],
    ["a phone on its side", 844, 390],
    ["a tablet", 1000, 800],
    ["a window as wide as a desktop's but too short", 1280, 480],
  ] as const)("on %s", (_, width, height) => {
    beforeEach(() => {
      installFakeViewport(width, height);
    });

    it("shows the rounds and the score alone", async () => {
      await renderBar();

      expect(terms()).toEqual(["Rounds", "Score"]);
    });
  });

  describe("on a compact screen", () => {
    beforeEach(() => {
      installFakeViewport(390, 844);
    });

    it("keeps Pause, Fast-forward and Skip in the bar, beside the menu", async () => {
      await renderBar();

      expect(buttonNames()).toEqual([
        "Pause",
        "Fast-forward",
        "Skip",
        "More actions",
      ]);
    });

    it("moves the sound, the levels, New game, How to play and the settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect(items).toEqual([
        "Turn sound off",
        "Levels",
        "New game",
        "How to play",
        "Settings",
      ]);
    });

    it("offers to turn the sound back on from the menu", async () => {
      const { user } = await renderBar({ soundOn: false });

      const items = await openBarMenu(user);

      expect(items[0]).toBe("Turn sound on");
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      installFakeViewport(340, 700);
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });

    it.each([
      ["turns the sound off", "Turn sound off", "toggleSound"],
      ["asks for the levels", "Levels", "openLevels"],
      ["asks for a new game", "New game", "newGame"],
      ["asks how to play", "How to play", "openHelp"],
      ["asks for the settings", "Settings", "openSettings"],
    ] as const)("%s from the menu", async (_, name, output) => {
      const { user, heard } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name }));

      expect(heard[output]).toHaveBeenCalledOnce();
    });
  });
});
