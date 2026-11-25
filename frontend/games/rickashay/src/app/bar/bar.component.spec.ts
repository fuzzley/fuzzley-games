import type { Nudge } from "@fz/brick-wall/view/aiming";
import type { RunStage } from "@fz/core/run";
import { installFakeViewport, openBarMenu } from "@fz/game-ui/testing";
import { figure, figureValue } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { Mock } from "vitest";
import { BarComponent } from "./bar.component";

/** What the bar is handed, as a level stands while a shot is aimed. */
interface BarInputs {
  readonly level: number;
  readonly rounds: number;
  readonly par: number;
  readonly rowsLeft: number;
  readonly bestRally: number;
  readonly rallyMark: number;
  readonly score: number;
  readonly outcome: RunStage;
  readonly aiming: boolean;
  readonly flying: boolean;
  readonly releaseByButton: boolean;
  readonly fast: boolean;
  readonly soundOn: boolean;
  readonly helpLoading: boolean;
}

/** A level under way, its fifth shot aimed. */
const AIMING: BarInputs = {
  level: 12,
  rounds: 4,
  par: 9,
  rowsLeft: 23,
  bestRally: 11,
  rallyMark: 24,
  score: 128450,
  outcome: "playing",
  aiming: true,
  flying: false,
  releaseByButton: false,
  fast: false,
  soundOn: true,
  helpLoading: false,
};

/** Names one of the bar's outputs that carry nothing. */
type Output =
  | "pauseRun"
  | "resumeRun"
  | "releaseShot"
  | "fastForward"
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
  /** Each way the aim was nudged, in order. */
  readonly nudged: readonly Nudge[];
}

/** Renders the bar, handed a level aiming but for what a spec says, and listens to it. */
async function renderBar(
  inputs: Partial<BarInputs> = {},
): Promise<RenderedBar> {
  const heard: Record<Output, Mock<() => void>> = {
    pauseRun: vi.fn(),
    resumeRun: vi.fn(),
    releaseShot: vi.fn(),
    fastForward: vi.fn(),
    skipFlight: vi.fn(),
    toggleSound: vi.fn(),
    openLevels: vi.fn(),
    newGame: vi.fn(),
    openHelp: vi.fn(),
    openSettings: vi.fn(),
  };
  const nudged: Nudge[] = [];
  await render(BarComponent, {
    inputs: { ...AIMING, ...inputs },
    on: {
      ...heard,
      nudge: (toward: Nudge) => {
        nudged.push(toward);
      },
    },
  });
  return { user: userEvent.setup(), heard, nudged };
}

/** Returns the terms of the figures the bar shows, in order. */
function terms(): string[] {
  return screen.getAllByRole("term").map((dt) => dt.textContent.trim());
}

/** Returns the bar's link home, the wordmark or the home button, or null where it is in the menu. */
function homeLink(): HTMLElement | null {
  return within(screen.getByRole("banner")).queryByRole("link", {
    name: "Fuzzley Games",
  });
}

/** Returns the bar's buttons, in order. */
function barButtons(): HTMLElement[] {
  return within(screen.getByRole("banner")).getAllByRole("button");
}

/** Returns the bar's buttons each name gives, in the names' order. */
function barButtonsNamed(names: readonly string[]): HTMLElement[] {
  const bar = within(screen.getByRole("banner"));
  return names.map((name) => bar.getByRole("button", { name }));
}

/** The roomy bar's actions, in order, Release left out by the settings. */
const ROOMY_ACTIONS = [
  "Pause",
  "Nudge left",
  "Nudge right",
  "Fast-forward",
  "Skip",
  "Sound",
  "Levels",
  "New game",
  "How to play",
  "Settings",
] as const;

describe("BarComponent", () => {
  describe("on a roomy screen", () => {
    it("names the page with one heading", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Rickashay" }),
      ).toBeInTheDocument();
    });

    it("shows the level, the shots, the rows left, the best rally and the score", async () => {
      await renderBar();

      expect(terms()).toEqual([
        "Level",
        "Shots",
        "Rows left",
        "Best rally",
        "Score",
      ]);
    });

    it("shows the level, the rows left, and the score grouped in thousands", async () => {
      await renderBar();

      expect([figure("Level"), figure("Rows left"), figure("Score")]).toEqual([
        "12",
        "23",
        "128,450",
      ]);
    });

    it.each([
      ["Shots", "4/9", "4 shots, par 9"],
      ["Best rally", "11/24", "11, rally mark 24"],
    ])(
      "shows the %s against its measure, and says it in words",
      async (term, shown, words) => {
        await renderBar();

        expect([
          within(figureValue(term)).getByText(shown),
          within(figureValue(term)).getByText(words),
        ]).toEqual([
          expect.toHaveAttribute("aria-hidden", "true") as unknown,
          expect.toHaveClass("fz-visually-hidden") as unknown,
        ]);
      },
    );

    it("says a single shot as one", async () => {
      await renderBar({ rounds: 1 });

      expect(
        within(figureValue("Shots")).getByText("1 shot, par 9"),
      ).toBeInTheDocument();
    });

    it("offers Pause, the Nudges, Fast-forward and Skip, then the rest, each round", async () => {
      await renderBar();

      expect(barButtons()).toEqual(barButtonsNamed(ROOMY_ACTIONS));
    });

    it("offers Release after the Nudges where the settings ask for it", async () => {
      await renderBar({ releaseByButton: true });

      expect(barButtons().slice(0, 5)).toEqual(
        barButtonsNamed([
          "Pause",
          "Nudge left",
          "Nudge right",
          "Release",
          "Fast-forward",
        ]),
      );
    });

    // A browser reads a tooltip that says what an `aria-label` says again,
    // as the description, so no button carries a label: each is named by
    // its tooltip, Pause by its words.
    it.each(ROOMY_ACTIONS)(
      "names %s once, by the tooltip under the pointer",
      async (name) => {
        await renderBar();

        const button = within(screen.getByRole("banner")).getByRole("button", {
          name,
        });

        expect([button.title, button.getAttribute("aria-label")]).toEqual([
          name,
          null,
        ]);
      },
    );

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

    it("nudges the aim either way while a shot is aimed", async () => {
      const { user, nudged } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Nudge left" }));
      await user.click(screen.getByRole("button", { name: "Nudge right" }));

      expect(nudged).toEqual(["left", "right"]);
    });

    it("releases the shot aimed", async () => {
      const { user, heard } = await renderBar({ releaseByButton: true });

      await user.click(screen.getByRole("button", { name: "Release" }));

      expect(heard.releaseShot).toHaveBeenCalledOnce();
    });

    it("dims the Nudges and Release while no shot is aimed, and they do nothing", async () => {
      const { user, heard, nudged } = await renderBar({
        aiming: false,
        flying: true,
        releaseByButton: true,
      });
      const steering = barButtonsNamed([
        "Nudge left",
        "Nudge right",
        "Release",
      ]);

      for (const button of steering) await user.click(button);

      expect({
        dimmed: steering.map((button) => button.getAttribute("aria-disabled")),
        nudged,
        released: heard.releaseShot.mock.calls.length,
      }).toEqual({ dimmed: ["true", "true", "true"], nudged: [], released: 0 });
    });

    it("keeps the focus where it was through a Nudge pressed with a pointer", async () => {
      const { user } = await renderBar();
      const pause = screen.getByRole("button", { name: "Pause" });
      pause.focus();

      await user.click(screen.getByRole("button", { name: "Nudge left" }));

      expect(pause).toHaveFocus();
    });

    it("shows Fast-forward pressed while it is on, and switches it", async () => {
      const { user, heard } = await renderBar({ fast: true });
      const fast = screen.getByRole("button", { name: "Fast-forward" });

      await user.click(fast);

      expect([
        fast.getAttribute("aria-pressed"),
        heard.fastForward.mock.calls.length,
      ]).toEqual(["true", 1]);
    });

    it("skips the flight in the air", async () => {
      const { user, heard } = await renderBar({ aiming: false, flying: true });

      await user.click(screen.getByRole("button", { name: "Skip" }));

      expect(heard.skipFlight).toHaveBeenCalledOnce();
    });

    // The ring is drawn from `aria-busy`, which jsdom's styles can't show.
    it.each([
      ["while it loads", true, "true"],
      ["but while it loads", false, null],
    ] as const)("marks How to play busy %s", async (_, helpLoading, busy) => {
      await renderBar({ helpLoading });

      expect(
        screen
          .getByRole("button", { name: "How to play" })
          .getAttribute("aria-busy"),
      ).toBe(busy);
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
  ] as const)("on %s", (_, width, height) => {
    beforeEach(() => {
      installFakeViewport(width, height);
    });

    it("shows the shots and the score alone", async () => {
      await renderBar();

      expect(terms()).toEqual(["Shots", "Score"]);
    });
  });

  describe("on a compact screen", () => {
    beforeEach(() => {
      installFakeViewport(390, 844);
    });

    it("keeps Pause and the Nudges in the bar, beside the menu, while a shot is aimed", async () => {
      await renderBar();

      expect(barButtons()).toEqual(
        barButtonsNamed(["Pause", "Nudge left", "Nudge right", "More actions"]),
      );
    });

    it("keeps Release after the Nudges while a shot is aimed, where the settings ask for it", async () => {
      await renderBar({ releaseByButton: true });

      expect(barButtons()).toEqual(
        barButtonsNamed([
          "Pause",
          "Nudge left",
          "Nudge right",
          "Release",
          "More actions",
        ]),
      );
    });

    it.each([
      ["while a shot flies", "Pause", { aiming: false, flying: true }],
      [
        "while the run is paused",
        "Resume",
        { aiming: false, outcome: "paused" },
      ],
    ] as const)(
      "puts Fast-forward and Skip in the Nudges' places %s",
      async (_, pause, inputs) => {
        await renderBar({ ...inputs, releaseByButton: true });

        expect(barButtons()).toEqual(
          barButtonsNamed([pause, "Fast-forward", "Skip", "More actions"]),
        );
      },
    );

    it("moves the sound, the levels, New game, How to play and the settings into the menu", async () => {
      const { user } = await renderBar({ soundOn: false });

      const items = await openBarMenu(user);

      expect(items).toEqual([
        "Turn sound on",
        "Levels",
        "New game",
        "How to play",
        "Settings",
      ]);
    });

    it.each([
      ["while How to play loads", true, "true"],
      ["but while How to play loads", false, null],
    ] as const)(
      "marks the menu's button busy %s",
      async (_, helpLoading, busy) => {
        await renderBar({ helpLoading });

        expect(
          screen
            .getByRole("button", { name: "More actions" })
            .getAttribute("aria-busy"),
        ).toBe(busy);
      },
    );

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

  // The bar's link home gives Release its room where it would push the
  // actions off a phone, or cut the game's name short on a desktop.
  describe("with Release with a button on", () => {
    it.each([
      ["the wordmark", 1336, 800, "Fuzzley Games"],
      ["the home button for the wordmark", 1335, 800, ""],
    ] as const)("shows %s %i px wide", async (_, width, height, words) => {
      installFakeViewport(width, height);

      await renderBar({ releaseByButton: true });

      expect(homeLink()?.textContent.trim()).toBe(words);
    });

    it.each([
      ["a phone held upright", 408, 844],
      ["a phone on its side", 844, 434],
    ] as const)(
      "keeps the home button on %s with room for it beside Release",
      async (_, width, height) => {
        installFakeViewport(width, height);

        await renderBar({ releaseByButton: true });

        expect(homeLink()?.textContent.trim()).toBe("");
      },
    );

    it.each([
      ["a phone held upright", 407, 844],
      ["a phone on its side", 844, 433],
    ] as const)(
      "moves the link home into the menu on %s too small for it beside Release",
      async (_, width, height) => {
        installFakeViewport(width, height);
        const { user } = await renderBar({ releaseByButton: true });

        const items = await openBarMenu(user);

        expect([homeLink(), items[0]]).toEqual([null, "Fuzzley Games"]);
      },
    );

    it("keeps the link home in the menu where the bar has no room for it at all", async () => {
      installFakeViewport(340, 700);
      const { user } = await renderBar({ releaseByButton: true });

      const items = await openBarMenu(user);

      expect([homeLink(), items[0]]).toEqual([null, "Fuzzley Games"]);
    });

    it("follows the window as it narrows", async () => {
      const viewport = installFakeViewport(412, 915);
      await renderBar({ releaseByButton: true });

      viewport.setSize(390, 844);

      await vi.waitFor(() => {
        expect(homeLink()).toBeNull();
      });
    });

    it("keeps the link home where it is with Release off", async () => {
      installFakeViewport(390, 844);

      await renderBar();

      expect(homeLink()).toBeInTheDocument();
    });
  });
});
