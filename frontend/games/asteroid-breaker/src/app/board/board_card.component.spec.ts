import { TestBed } from "@angular/core/testing";
import { FRAME_MS, playFor } from "@fz/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { figure, figures } from "@fz/ui/testing";
import { CAPTURE_SKIP } from "@fz/ui/capture";
import { createRun } from "../../rules/run/run";
import { STILL } from "../../rules/ship/ship";
import { STATIC_STEPS } from "../../rules/tuning";
import { WAVES, type WaveEntry } from "../../rules/waves/waves";
import { inkOf, posesIn, ringedIn } from "../../testing/pilots";
import {
  ROOMY,
  SECTOR_WAVES,
  SPACE,
  SPEC_WAVE,
  clearIn,
  clearToNext,
  endIn,
  endRun,
  gatherSparks,
  knockOneLoose,
  pauseIn,
  playToClear,
  provideSpecWaves,
  shoot,
  takeUpCharged,
} from "../../testing/play";
import { CLEARED_MS } from "../../view/effects/timing";
import { TALLY_COUNT_MS } from "../../view/tally";
import type { BoardSetting } from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { BoardCardComponent } from "./board_card.component";

/** What a spec gets back from rendering the card. */
interface RenderedCard {
  readonly user: UserEvent;
  readonly game: GameService;
  /** The card's element, the layer the board lays over the field. */
  readonly layer: HTMLElement;
  /** Called each time the card says the board should take the focus. */
  readonly handBack: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/**
 * Renders the card over the specs' waves, or those given, told how the board
 * lays the field and the deck out, as on a screen with no touch unless given.
 */
async function renderCard(
  board: BoardSetting = ROOMY,
  waves?: readonly WaveEntry[],
): Promise<RenderedCard> {
  const handBack = vi.fn();
  const { container, fixture } = await render(BoardCardComponent, {
    inputs: { board },
    on: { handBack },
    providers: provideSpecWaves(waves),
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    layer: container,
    handBack,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Returns the card with its run at one of the specs' waves, waiting for its first move. */
async function renderAt(wave: number): Promise<RenderedCard> {
  const rendered = await renderCard();
  await rendered.game.startAt(wave);
  rendered.detectChanges();
  return rendered;
}

/** Returns the card with its run's wave started by a first move. */
async function startedAt(wave: number): Promise<RenderedCard> {
  const rendered = await renderAt(wave);
  rendered.game.tick(FRAME_MS, shoot(rendered.game));
  rendered.detectChanges();
  return rendered;
}

/**
 * Takes the run in play up with static at ×3, goes on, gathers the sparks
 * its wave's first break sheds and clears it, until its card shows.
 */
function clearCharged(game: GameService): void {
  takeUpCharged(game, STATIC_STEPS[1].from);
  game.resume();
  gatherSparks(game);
  clearIn(game);
}

describe("BoardCardComponent", () => {
  it("opens a new run with its sector, its waves and its wave, which starts as the ship flies", async () => {
    await renderCard();

    expect(screen.getByText("A new game")).toBeInTheDocument();
    expect(screen.getByText("Specs")).toBeInTheDocument();
    expect(screen.getByText("Waves 1 to 3")).toBeInTheDocument();
    expect(
      screen.getByText("Wave 1, Pebble · starts when you fly"),
    ).toBeInTheDocument();
  });

  it("says what is new in the sector", async () => {
    await renderCard(ROOMY, WAVES);

    expect(screen.getByText("Inner belt")).toBeInTheDocument();
    expect(
      screen.getByText("Break every rock to clear a wave."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Crystals always drop a pickup."),
    ).toBeInTheDocument();
  });

  it("says how to fly by the keys over a new run's first wave", async () => {
    await renderCard();

    expect(
      screen.getByText("Arrows or W A D to fly, Space to fire."),
    ).toBeInTheDocument();
  });

  it("says only how to fly where the settings have the ship fire on its own", async () => {
    await renderCard({ ...ROOMY, fireByItself: true });

    expect(screen.getByText("Arrows or W A D to fly.")).toBeInTheDocument();
  });

  it.each<[string, Partial<BoardSetting>, string]>([
    ["", {}, "Steer with the left stick, fire with the right."],
    [
      " with the stick on the right",
      { stickOnRight: true },
      "Steer with the right stick, fire with the left.",
    ],
    [
      " firing on its own",
      { fireByItself: true },
      "Steer with the left stick.",
    ],
    [
      " with the stick on the right, firing on its own",
      { stickOnRight: true, fireByItself: true },
      "Steer with the right stick.",
    ],
  ])(
    "says how to fly by the deck%s, where it shows",
    async (_, change, words) => {
      await renderCard({ ...ROOMY, deck: true, ...change });

      expect(screen.getByText(words)).toBeInTheDocument();
    },
  );

  it("shows nothing over a ship in flight", async () => {
    const { layer } = await startedAt(SPEC_WAVE.gift);

    expect(layer.querySelector(".card")).toBeNull();
  });

  it("opens a sector the run goes on to, saying nothing of how to fly", async () => {
    const { game, detectChanges } = await renderCard(ROOMY, SECTOR_WAVES);

    clearToNext(game);
    detectChanges();

    expect(screen.getByText("A new sector")).toBeInTheDocument();
    expect(screen.getByText("Waves 2 to 3")).toBeInTheDocument();
    expect(
      screen.getByText("Wave 2, Far · starts when you fly"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/to fly/)).not.toBeInTheDocument();
  });

  it("lays no card over a wave gone on to within a sector", async () => {
    const { game, layer, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearToNext(game);
    detectChanges();

    expect(layer.querySelector(".card")).toBeNull();
  });

  it("says the wave is paused, with the score", async () => {
    const { game, detectChanges } = await startedAt(SPEC_WAVE.gift);

    game.pause();
    detectChanges();

    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("Score 0")).toBeInTheDocument();
  });

  it("leaves the Paused card out of a bug report's picture, since Settings paused the run", async () => {
    const { game, detectChanges } = await startedAt(SPEC_WAVE.gift);

    game.pause();
    detectChanges();

    expect(screen.getByText("Paused").closest(".card")).toHaveAttribute(
      CAPTURE_SKIP.name,
      CAPTURE_SKIP.value,
    );
  });

  it("draws the crew aboard on a paused wave, the pilot at the controls ringed, then those knocked loose, wide eyed, and says how many", async () => {
    const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);
    knockOneLoose(game);

    game.pause();
    detectChanges();

    const crew = screen
      .getByText("2 of the crew aboard, 1 knocked loose")
      .closest("app-pilot-row");
    if (!crew) throw new Error("No crew drawn.");
    expect({ poses: posesIn(crew), ringed: ringedIn(crew) }).toEqual({
      poses: [
        [inkOf(0), "rest"],
        [inkOf(1), "rest"],
        [inkOf(2), "eep"],
      ],
      ringed: [true, false, false],
    });
  });

  it("draws the fuzzballs gone home on a paused wave, and says how many", async () => {
    const { game, detectChanges } = await renderCard();
    const run = createRun({
      id: game.run().id + 1,
      seed: 1,
      speed: "normal",
      wave: SPEC_WAVE.pebble,
    });
    const crew = { pilot: 0, tow: [1, 2, 3, 4, 5], home: [6, 7], lastGiven: 7 };

    game.takeUp({
      run: {
        ...run,
        wave: SPEC_WAVE.gift,
        crew,
        straysBanked: 5,
        strays: 5,
        outcome: "paused",
      },
      field: null,
      broughtHome: [3, 4, 5, 6, 7],
      tuned: false,
    });
    detectChanges();

    const home = screen.getByText("2 fuzzballs waiting at home");
    expect(home.querySelectorAll("app-pilot")).toHaveLength(2);
  });

  it("says nothing of home on a paused wave with no one waiting there", async () => {
    const { game, detectChanges } = await startedAt(SPEC_WAVE.gift);

    game.pause();
    detectChanges();

    expect(screen.queryByText(/waiting at home/)).not.toBeInTheDocument();
  });

  it("goes on at Resume, and hands the board back the focus", async () => {
    const { user, game, handBack, detectChanges } = await startedAt(
      SPEC_WAVE.gift,
    );
    game.pause();
    detectChanges();

    await user.click(screen.getByRole("button", { name: "Resume" }));

    expect({
      outcome: game.outcome(),
      handedBack: handBack.mock.calls.length,
    }).toEqual({ outcome: "playing", handedBack: 1 });
  });

  it("says which wave is cleared", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(screen.getByText("Wave 1 cleared!")).toBeVisible();
  });

  it("adds up a cleared wave's points, whole at once where the player prefers less motion", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(figures()).toEqual([
      ["Rocks", "100"],
      ["Sparks", "0"],
      ["Static", "0"],
      ["Strays brought home", "0"],
      ["Wave cleared", "500"],
      ["No hit taken", "500"],
      ["Total", "1,100"],
    ]);
  });

  it("adds up the sparks gathered and what static added, whole at once where the player prefers less motion", async () => {
    const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);

    clearCharged(game);
    detectChanges();

    expect(figures()).toEqual([
      ["Rocks", "100"],
      ["Sparks", "15"],
      ["Static", "75"],
      ["Strays brought home", "0"],
      ["Wave cleared", "500"],
      ["No hit taken", "500"],
      ["Total", "1,190"],
    ]);
  });

  it("draws the crew cheering, the pilot at the controls ringed, and says how many", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    const crew = screen
      .getByText("3 fuzzballs in the crew")
      .closest("app-pilot-row");
    if (!crew) throw new Error("No crew drawn.");
    expect({ poses: posesIn(crew), ringed: ringedIn(crew) }).toEqual({
      poses: [
        [inkOf(0), "happy"],
        [inkOf(1), "happy"],
        [inkOf(2), "happy"],
      ],
      ringed: [true, false, false],
    });
  });

  it("says the last sector is cleared and Endless begins, with the trophy", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.last);

    clearIn(game);
    detectChanges();

    expect(screen.getByText("Specs cleared! Endless begins.")).toBeVisible();
    // The trophy is hidden from assistive technology, which the title tells.
    expect(document.querySelector('fz-icon[name="trophy"]')).not.toBeNull();
  });

  it("shows no trophy over a wave of a sector's but its last", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(document.querySelector('fz-icon[name="trophy"]')).toBeNull();
  });

  it("names the next wave, and says flying goes on too", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(screen.getByText("Next: wave 2, Gift")).toBeInTheDocument();
    expect(screen.getByText("or just start flying")).toBeInTheDocument();
  });

  it("goes on to the next wave at the Cleared card's button, and hands the board back the focus", async () => {
    const { user, game, handBack, detectChanges } = await renderAt(
      SPEC_WAVE.pebble,
    );
    clearIn(game);
    detectChanges();

    await user.click(screen.getByRole("button", { name: "Next wave" }));

    expect({
      wave: game.wave().number,
      handedBack: handBack.mock.calls.length,
    }).toEqual({ wave: SPEC_WAVE.gift, handedBack: 1 });
  });

  it.each([
    ["Resume", pauseIn],
    ["Next wave", clearIn],
    ["New game", endIn],
  ])(
    "keeps the keys on %s from the board around it, which would fly the ship",
    async (name, show) => {
      const { layer, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      show(game);
      detectChanges();
      const heard = vi.fn();
      layer.addEventListener("keydown", heard);

      fireEvent.keyDown(screen.getByRole("button", { name }), SPACE);

      expect(heard).not.toHaveBeenCalled();
    },
  );

  describe("where motion is welcome", () => {
    beforeEach(() => {
      installFakeViewport(1024, 768);
    });

    it("says nothing over a cleared wave while its last shards fly", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      playToClear(game);

      game.tick(CLEARED_MS / 2, STILL);
      detectChanges();

      expect(screen.queryByText("Wave 1 cleared!")).not.toBeInTheDocument();
    });

    it("counts a cleared wave's points up, line by line, as its card opens", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      clearIn(game);
      detectChanges();

      expect(figures()).toEqual([
        ["Rocks", "23"],
        ["Sparks", "0"],
        ["Static", "0"],
        ["Strays brought home", "0"],
        ["Wave cleared", "0"],
        ["No hit taken", "0"],
        ["Total", "23"],
      ]);
    });

    it("counts the sparks gathered up, then what static added, each in its turn", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);
      clearCharged(game);

      // Two lines and a half of the six: the sparks whole, static's on its way.
      playFor(game, (TALLY_COUNT_MS * 2.5) / 6, STILL);
      detectChanges();

      expect(figures()).toEqual([
        ["Rocks", "100"],
        ["Sparks", "15"],
        ["Static", "70"],
        ["Strays brought home", "0"],
        ["Wave cleared", "0"],
        ["No hit taken", "0"],
        ["Total", "185"],
      ]);
    });

    it("shows a cleared wave's points whole once they have counted up", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      clearIn(game);

      playFor(game, TALLY_COUNT_MS, STILL);
      detectChanges();

      expect(figure("Total")).toBe("1,100");
    });
  });

  it("says nothing over an ended run while its result is to come", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    endRun(game);
    detectChanges();

    expect(screen.queryByText("Game over")).not.toBeInTheDocument();
  });

  it("says a run ended in Endless ended there, once its result is put away", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.last + 1);

    endIn(game);
    detectChanges();

    expect(
      screen.getByText("Out of crew on wave 4, Endless"),
    ).toBeInTheDocument();
  });

  it("says the game is over, where the run ended and its score, and offers a new game, once an ended run's result is put away", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    endIn(game);
    detectChanges();

    expect(screen.getByText("Game over")).toBeInTheDocument();
    expect(
      screen.getByText("Out of crew on wave 1, Pebble"),
    ).toBeInTheDocument();
    expect(screen.getByText("Score 60")).toBeInTheDocument();
  });

  it("starts a new game from the card over an ended run", async () => {
    const { user, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
    endIn(game);
    detectChanges();

    await user.click(screen.getByRole("button", { name: "New game" }));

    expect(game.outcome()).toBe("ready");
  });
});
