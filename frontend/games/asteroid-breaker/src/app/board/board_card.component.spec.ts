import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import type { CanvasState } from "@fz/phaser/canvas";
import {
  fireEvent,
  isInaccessible,
  render,
  screen,
} from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { STILL } from "../../rules/ship/ship";
import type { WaveEntry } from "../../rules/waves/waves";
import {
  FRAME_MS,
  ROOMY,
  SPACE,
  SPEC_WAVE,
  STRAY_WAVES,
  bringStraysHome,
  clearIn,
  clearToNext,
  endIn,
  endRun,
  pauseIn,
  playToClear,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { CLEARED_MS } from "../../view/effects/timing";
import type { BoardSetting } from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { BoardCardComponent } from "./board_card.component";

/** What the board tells its card. */
interface CardInputs {
  readonly canvasState: CanvasState;
  readonly slow: boolean;
  readonly board: BoardSetting;
}

/** What the board tells its card once the scene has drawn, on a screen with no touch. */
const DRAWN: CardInputs = { canvasState: "ready", slow: false, board: ROOMY };

/** What the board tells its card while the scene loads, before it is slow. */
const LOADING: Partial<CardInputs> = { canvasState: "loading" };

/** What the board tells its card once the scene has taken long enough to load to say so. */
const SLOW: Partial<CardInputs> = { canvasState: "loading", slow: true };

/** What a spec gets back from rendering the card. */
interface RenderedCard {
  readonly user: UserEvent;
  readonly game: GameService;
  /** The card's element, the layer the board lays over the field. */
  readonly layer: HTMLElement;
  /** Called each time the card says the board should take the focus. */
  readonly handBack: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
  /** Tells the card what the board would as the scene loads, keeping what it was told before. */
  readonly tell: (inputs: Partial<CardInputs>) => Promise<void>;
}

/**
 * Renders the card over the specs' waves, or those given, told what the
 * board tells it once the scene has drawn but for what is given.
 */
async function renderCard(
  inputs: Partial<CardInputs> = {},
  waves?: readonly WaveEntry[],
): Promise<RenderedCard> {
  const handBack = vi.fn();
  const { container, fixture, rerender } = await render(BoardCardComponent, {
    inputs: { ...DRAWN, ...inputs },
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
    tell: (inputs) =>
      rerender({ inputs, on: { handBack }, partialUpdate: true }),
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

/** Returns the Cleared card's sum, each line as its term and its points. */
function tallyLines(): [string, string][] {
  return screen
    .getAllByRole("term")
    .map((term) => [
      term.textContent.trim(),
      term.nextElementSibling?.textContent.trim() ?? "",
    ]);
}

describe("BoardCardComponent", () => {
  it("names the wave, and says how to fly by the keys, while it waits", async () => {
    await renderCard();

    expect(screen.getByText("Wave 1: Pebble")).toBeInTheDocument();
    expect(
      screen.getByText("Arrows or W A D to fly, Space to fire."),
    ).toBeInTheDocument();
  });

  it("names the wave while the scene still loads, before it is slow", async () => {
    await renderCard({ canvasState: "loading" });

    expect(screen.getByText("Wave 1: Pebble")).toBeInTheDocument();
  });

  it("says the ship fires by itself, where the settings have it", async () => {
    await renderCard({ board: { ...ROOMY, fireByItself: true } });

    expect(
      screen.getByText("Arrows or W A D to fly; the ship fires by itself."),
    ).toBeInTheDocument();
  });

  it.each<[string, Partial<BoardSetting>, string]>([
    ["", {}, "Steer with the left pad, fire with the right."],
    [
      " with the stick on the right",
      { stickOnRight: true },
      "Steer with the right pad, fire with the left.",
    ],
    [
      " firing by itself",
      { fireByItself: true },
      "Steer with the left pad; the ship fires by itself.",
    ],
    [
      " with the stick on the right, firing by itself",
      { stickOnRight: true, fireByItself: true },
      "Steer with the right pad; the ship fires by itself.",
    ],
  ])(
    "says how to fly by the deck%s, where it shows",
    async (_, change, words) => {
      await renderCard({ board: { ...ROOMY, deck: true, ...change } });

      expect(screen.getByText(words)).toBeInTheDocument();
    },
  );

  it("shows nothing over a ship in flight", async () => {
    await startedAt(SPEC_WAVE.gift);

    expect(screen.queryByText(/to fly/)).not.toBeInTheDocument();
  });

  it("says the wave is paused, with the score", async () => {
    const { game, detectChanges } = await startedAt(SPEC_WAVE.gift);

    game.pause();
    detectChanges();

    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("Score 0")).toBeInTheDocument();
  });

  it("draws the strays waiting at home on a paused wave, and says how many", async () => {
    const { game, detectChanges } = await renderCard({}, STRAY_WAVES);
    bringStraysHome(game, 2);

    game.pause();
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

  it("adds up a cleared wave's points", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(tallyLines()).toEqual([
      ["Rocks", "40"],
      ["Chains", "0"],
      ["Strays brought home", "0"],
      ["Wave cleared", "500"],
      ["No ship lost", "500"],
    ]);
  });

  it("says the last sector is cleared and Endless begins, with the trophy", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.last);

    clearIn(game);
    detectChanges();

    expect(screen.getByText("Specs cleared. Endless begins.")).toBeVisible();
    // The trophy is hidden from assistive technology, which the title tells.
    expect(document.querySelector('fz-icon[name="trophy"]')).not.toBeNull();
  });

  it("shows no trophy over a wave of a sector's but its last", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(document.querySelector('fz-icon[name="trophy"]')).toBeNull();
  });

  it("says a move or a shot goes on to the next wave", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearIn(game);
    detectChanges();

    expect(screen.getByText("Move or fire for wave 2.")).toBeInTheDocument();
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

  it("names the next wave while it waits for its first move", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    clearToNext(game);
    detectChanges();

    expect(screen.getByText("Wave 2: Gift")).toBeInTheDocument();
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
    let viewport: FakeViewport | null = null;

    beforeEach(() => {
      viewport = installFakeViewport(1024, 768);
    });

    afterEach(() => {
      viewport?.restore();
      viewport = null;
    });

    it("says nothing over a cleared wave while its last shards fly", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      playToClear(game);

      game.tick(CLEARED_MS / 2, STILL);
      detectChanges();

      expect(screen.queryByText("Wave 1 cleared")).not.toBeInTheDocument();
    });
  });

  it("says nothing over an ended run while its result is to come", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    endRun(game);
    detectChanges();

    expect(screen.queryByText("Lost on wave 1")).not.toBeInTheDocument();
  });

  it("says a run lost in Endless was lost there, once its result is put away", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.last + 1);

    endIn(game);
    detectChanges();

    expect(screen.getByText("Lost on wave 4, Endless")).toBeInTheDocument();
  });

  it("offers a new game once an ended run's result is put away", async () => {
    const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

    endIn(game);
    detectChanges();

    expect(screen.getByText("Lost on wave 1")).toBeInTheDocument();
    expect(screen.getByText("Score 0")).toBeInTheDocument();
  });

  it("starts a new game from the card over an ended run", async () => {
    const { user, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
    endIn(game);
    detectChanges();

    await user.click(screen.getByRole("button", { name: "New game" }));

    expect(game.outcome()).toBe("ready");
  });

  it("says when the board couldn't be drawn, offering to reload", async () => {
    await renderCard({ canvasState: "failed" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The board couldn't be drawn",
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
  });

  describe("while the board loads", () => {
    it("keeps a status region in the page, empty until the board is slow", async () => {
      await renderCard(LOADING);

      expect(screen.getByRole("status")).toHaveTextContent(/^$/);
    });

    it("says in that region the board is still loading, once it is slow", async () => {
      const { tell } = await renderCard(LOADING);
      const region = screen.getByRole("status");

      await tell({ slow: true });

      expect(screen.getByRole("status")).toBe(region);
      expect(region).toHaveTextContent(
        "Still loading the board. It can take a while on a slow connection.",
      );
    });

    it("shows the Still loading card once it is slow, offering nothing to press", async () => {
      await renderCard(SLOW);

      expect(screen.getByText("Still loading the board")).toBeVisible();
      expect(
        screen.getByText("It can take a while on a slow connection."),
      ).toBeVisible();
      expect(screen.queryAllByRole("button", { hidden: true })).toEqual([]);
    });

    it("hides the card from assistive technology, which reads its words in the region", async () => {
      await renderCard(SLOW);

      expect(isInaccessible(screen.getByText("Still loading the board"))).toBe(
        true,
      );
    });

    it.each<[string, CanvasState]>([
      ["drawn", "ready"],
      ["given up on", "failed"],
    ])(
      "empties the region once the slow board is %s, saying nothing more",
      async (_, canvasState) => {
        const { tell } = await renderCard(SLOW);

        await tell({ canvasState, slow: false });

        expect(screen.getByRole("status")).toHaveTextContent(/^$/);
      },
    );
  });
});
