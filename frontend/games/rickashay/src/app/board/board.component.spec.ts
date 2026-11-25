import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { STRAIGHT_UP } from "@fz/brick-wall/view/aim_settings";
import {
  MARGIN_CSS_PX,
  fieldMetrics,
  fieldShape,
} from "@fz/brick-wall/view/field_metrics";
import { FRAME_MS, playFor, playUntil } from "@fz/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import { NO_INSETS } from "@fz/phaser/insets";
import { type Viewport, cssRectStyle } from "@fz/phaser/layout";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  type SceneRun,
  collectErrors,
  provideFakePhaserCanvas,
  resize,
  runShownScene,
  watchResizes,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { paintRoles } from "@fz/style/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { figure } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { JUMP_WORDS, describeAim, rowsWaiting } from "../../rules/run/describe";
import { PALETTES } from "../../testing/roles";
import {
  STILL,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../../testing/spec_play";
import { FIELD_ROLES } from "../../view/colors/palette";
import { CALL_MS } from "../../view/effects/timing";
import { GameService } from "../play/game.service";
import type { RoundPlayer } from "../tokens";
import { BoardComponent } from "./board.component";

/** An upright phone's canvas, 390 by 700 CSS px, which spares the panels no room. */
const UPRIGHT = { width: 390, height: 700 } as const;

/** A roomy canvas, 1600 by 900 CSS px, which spares the panels room beside the field. */
const WIDE = { width: 1600, height: 900 } as const;

/** What a spec renders the board with. */
interface BoardSetUp {
  /** How the fake canvas answers; ready at once unless told otherwise. */
  readonly canvas?: FakeCanvasOptions;
  /** How the game plays each round released; a step down a row unless told otherwise. */
  readonly rounds?: RoundPlayer;
}

/** The board rendered, and what a spec reads of it. */
interface RenderedBoard {
  /** The board's frame's element, `fz-wall-board`. */
  readonly host: HTMLElement;
  /** The application inside it, which takes the focus and the keys. */
  readonly board: HTMLElement;
  readonly component: BoardComponent;
  readonly game: GameService;
  readonly fake: FakePhaserCanvas;
  readonly detectChanges: () => void;
}

/** Renders the board on a fake canvas, the game over the specs' levels. */
async function renderBoard({
  canvas = {},
  rounds = scriptedRounds("step"),
}: BoardSetUp = {}): Promise<RenderedBoard> {
  const view = await render(`<app-board />`, {
    imports: [BoardComponent],
    providers: [provideFakePhaserCanvas(canvas), ...provideSpecPlay(rounds)],
  });
  await view.fixture.whenStable();
  const debug = view.fixture.debugElement.query(By.directive(BoardComponent));
  return {
    host: (debug.nativeElement as HTMLElement).querySelector("fz-wall-board")!,
    board: screen.getByRole("application"),
    component: debug.injector.get(BoardComponent),
    game: TestBed.inject(GameService),
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges: () => {
      view.detectChanges();
    },
  };
}

/** Returns the canvas a board of a CSS size makes, its insets the roomy margin it declares. */
function canvasOf({
  width,
  height,
}: {
  readonly width: number;
  readonly height: number;
}): Viewport {
  const margin = MARGIN_CSS_PX.roomy;
  return viewport(width, height, 1, {
    top: margin,
    right: margin,
    bottom: margin,
    left: margin,
  });
}

/** Lays the board out at a CSS size, as the browser does, its insets the roomy margin it declares, and renders what that changes. */
function measureAt(
  rendered: RenderedBoard,
  { width, height }: { readonly width: number; readonly height: number },
): void {
  // jsdom works out no `var()`, which the stylesheet declares the insets in.
  for (const edge of ["top", "right", "bottom", "left"]) {
    rendered.host.style.setProperty(
      `--fz-canvas-inset-${edge}`,
      `${String(MARGIN_CSS_PX.roomy)}px`,
    );
  }
  resize(rendered.host, width, height);
  rendered.detectChanges();
}

/**
 * Runs the scene the board loads, for real, on a canvas of an upright
 * phone's size unless given another, laid out as a browser lays the board
 * out, its first frame drawn, and renders what that changes.
 */
async function runSceneOn(
  rendered: RenderedBoard,
  size: { readonly width: number; readonly height: number } = UPRIGHT,
): Promise<SceneRun<HostedScene>> {
  measureAt(rendered, size);
  const run = await runShownScene(rendered.fake, rendered.host, {
    ...size,
    insets: canvasOf(size).insets,
  });
  run.advance(FRAME_MS);
  rendered.detectChanges();
  return run;
}

/** Plays the round released until its flight reaches the level's rally mark, and renders the call. */
function playToCall(rendered: RenderedBoard): void {
  release(rendered.game);
  playUntil(
    rendered.game,
    () => STILL,
    () => rendered.game.call() !== null,
  );
  rendered.detectChanges();
}

/** Plays rounds until the card over the level's end opens, and renders it. */
function playToCard(rendered: RenderedBoard): void {
  playUntilCard(rendered.game);
  rendered.detectChanges();
}

describe("BoardComponent", () => {
  beforeEach(() => {
    // The board draws its field in the palette's inks, which jsdom has no
    // stylesheet to give it.
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("classic", FIELD_ROLES));
  });

  describe("the board", () => {
    it("names itself for the level on it", async () => {
      const { board } = await renderBoard();

      expect(board).toHaveAccessibleName("Rickaashay, level 1: First bounce");
    });

    it("lists the keys needed to play, which describe it", async () => {
      await renderBoard();

      expect(
        within(screen.getByRole("list", { name: "Keys" }))
          .getAllByRole("listitem")
          .map((key) => key.textContent),
      ).toEqual([
        "Left and Right, or A and D: aim. Hold Shift for smaller steps.",
        "Space: release the shot.",
        "G: hear where the guide goes.",
        "R: hear the 3 lowest rows with bricks in them.",
        "Esc: pause.",
        "P: pause and resume.",
        "Enter: resume, go to the next level, or try again.",
      ]);
    });

    it("takes the focus as a run begins", async () => {
      const { board, component, detectChanges } = await renderBoard();

      component.focus();
      detectChanges();

      expect(board).toHaveFocus();
    });

    it("says on the lintel how many rows wait over the ceiling, once the scene has laid the field out", async () => {
      const rendered = await renderBoard();

      await runSceneOn(rendered);

      expect(
        screen.getByText(rowsWaiting(rendered.game.rowsLeft())),
      ).toBeInTheDocument();
    });

    it("hands the scene's keys to the game", async () => {
      const rendered = await renderBoard();
      const run = await runSceneOn(rendered);

      await userEvent.type(rendered.board, "f");
      run.advance(FRAME_MS);

      expect(rendered.game.fast()).toBe(true);
    });

    it("gives way to the canvas's card, which says the board couldn't be drawn", async () => {
      const errors = collectErrors();
      const { fake, detectChanges } = await renderBoard({
        canvas: { readyAtOnce: false },
      });

      fake.host.latest.fail();
      await Promise.resolve();
      detectChanges();

      expect({
        alert: screen.getByRole("alert"),
        ready: screen.queryByText("Level 1: First bounce"),
        errors,
      }).toEqual({
        alert: expect.toHaveTextContent(
          "The board couldn't be drawn",
        ) as unknown,
        ready: null,
        errors: [new Error("The scene couldn't be loaded")],
      });
    });
  });

  describe("the bar's steering", () => {
    it("nudges the aim either way, as the bar's Nudges ask, once the scene has laid the field out", async () => {
      const rendered = await renderBoard();
      const run = await runSceneOn(rendered);
      const straight = rendered.game.guide();

      rendered.component.nudge("left");
      run.advance(FRAME_MS);
      const nudged = rendered.game.guide();
      rendered.component.nudge("right");
      run.advance(FRAME_MS);

      expect([nudged, rendered.game.guide()]).toEqual([
        expect.not.objectContaining(straight ?? {}),
        straight,
      ]);
    });

    it("says the aim a Nudge leaves, as it says the keys' turn", async () => {
      const rendered = await renderBoard();
      const run = await runSceneOn(rendered);

      rendered.component.nudge("left");
      run.advance(FRAME_MS);

      expect(TestBed.inject(AnnouncerService).message()).toBe(
        describeAim(STRAIGHT_UP + 1),
      );
    });

    it("releases the shot aimed, as the bar's Release asks", async () => {
      const rendered = await renderBoard();
      const run = await runSceneOn(rendered);

      rendered.component.releaseShot();
      run.advance(FRAME_MS);

      expect(rendered.game.flying()).toBe(true);
    });

    it("steers nothing in a scene made but not yet laid out, its steering still to make", async () => {
      const { component, fake } = await renderBoard();
      const make = await fake.host.latest.source();
      make({ insets: () => NO_INSETS, ready: () => undefined });

      const steer = (): void => {
        component.nudge("left");
        component.releaseShot();
      };

      expect(steer).not.toThrow();
    });

    it("leaves the lintel's count unread where the bar shows the rows left", async () => {
      installFakeViewport(1600, 900);
      const rendered = await renderBoard();

      await runSceneOn(rendered);

      expect(
        screen.getByText(rowsWaiting(rendered.game.rowsLeft())),
      ).toHaveAttribute("aria-hidden", "true");
    });

    it("leaves the lintel's count to be read where the bar has no room for the rows left", async () => {
      installFakeViewport(UPRIGHT.width, UPRIGHT.height);
      const rendered = await renderBoard();

      await runSceneOn(rendered);

      expect(
        screen.getByText(rowsWaiting(rendered.game.rowsLeft())),
      ).not.toHaveAttribute("aria-hidden");
    });
  });

  describe("its panels", () => {
    watchResizes();

    it("stand beside the field where the room spares them", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const canvas = canvasOf(WIDE);
      const { panels } = fieldMetrics(canvas, fieldShape(canvas));
      expect({
        left: screen.getByRole("region", { name: "Coming next" }),
        right: screen.getByRole("region", { name: "In this wall" }),
      }).toEqual({
        left: expect.toHaveStyle(cssRectStyle(panels!.left)) as unknown,
        right: expect.toHaveStyle(cssRectStyle(panels!.right)) as unknown,
      });
    });

    it("show none where the room spares none", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      expect(screen.queryAllByRole("region")).toEqual([]);
    });

    it("show the level in play, the rows waiting and what the jump does", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const comingNext = screen.getByRole("region", { name: "Coming next" });
      expect(
        [
          "Level 1: First bounce",
          rowsWaiting(rendered.game.rowsLeft()),
          JUMP_WORDS,
        ].map((words) => within(comingNext).queryByText(words) !== null),
      ).toEqual([true, true, true]);
    });

    it("list each kind of brick the wall holds, by its name and what it does", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const inThisWall = screen.getByRole("region", { name: "In this wall" });
      expect(
        within(within(inThisWall).getByRole("list"))
          .getAllByRole("listitem")
          .map((kind) => kind.textContent.trim()),
      ).toEqual([expect.stringMatching(/^Brick\s*Takes 1 strike\.$/)]);
    });

    it("show This shot under the kinds, its rally as far as it has played back", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("rally") });
      measureAt(rendered, WIDE);
      release(rendered.game);

      playUntil(
        rendered.game,
        () => STILL,
        () => rendered.game.soFar().rally === 5,
      );
      rendered.detectChanges();

      const inThisWall = screen.getByRole("region", { name: "In this wall" });
      expect(figure("Rally", inThisWall)).toBe("5");
    });

    it("draw This shot's springs, as the scene baked them", async () => {
      const rendered = await renderBoard();

      await runSceneOn(rendered, WIDE);

      const thisShot = screen.getByRole("heading", { name: "This shot" });
      const springs = thisShot.parentElement!.querySelectorAll("img");
      expect(
        Array.from(springs, (spring) => spring.getAttribute("src")),
      ).toEqual([
        expect.stringMatching(/^data:image\/png/),
        expect.stringMatching(/^data:image\/png/),
        expect.stringMatching(/^data:image\/png/),
      ]);
    });
  });

  describe("the Ready card", () => {
    it("names the level waiting, with its par and its rally mark", async () => {
      await renderBoard();

      const card = screen.getByRole("group", { name: "Level 1: First bounce" });

      expect(card).toHaveTextContent("Par8 shots");
      expect(card).toHaveTextContent("Rally mark9");
    });

    it("shows the picture of the kind the level brings in, as the scene baked it", async () => {
      const rendered = await renderBoard();

      await runSceneOn(rendered);

      expect(
        screen.getByRole("group").querySelector("img")?.getAttribute("src"),
      ).toMatch(/^data:image\/png/);
    });

    it("goes as the first shot flies", async () => {
      const { game, detectChanges } = await renderBoard();

      release(game);
      detectChanges();

      expect(screen.queryByRole("group")).toBeNull();
    });
  });

  describe("the call", () => {
    it("calls the game's name over the field as a flight reaches the level's rally mark, hidden from assistive technology, which the announcer tells", async () => {
      installFakeViewport(400, 700);
      const rendered = await renderBoard({ rounds: scriptedRounds("rally") });

      playToCall(rendered);

      const call = screen.getByText("Rickaashay!");
      expect([call.closest("[aria-hidden]"), call]).toEqual([
        expect.toHaveAttribute("aria-hidden", "true") as unknown,
        expect.toHaveClass("moving") as unknown,
      ]);
    });

    it("stands still where the player asks for less motion", async () => {
      installFakeViewport(400, 700).setReducedMotion(true);
      const rendered = await renderBoard({ rounds: scriptedRounds("rally") });

      playToCall(rendered);

      expect(screen.getByText("Rickaashay!")).not.toHaveClass("moving");
    });

    it("goes once it has shown for its time", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("rally") });
      playToCall(rendered);

      playFor(rendered.game, CALL_MS, STILL);
      rendered.detectChanges();

      expect(screen.queryByText("Rickaashay!")).toBeNull();
    });

    it("isn't made by a flight short of the rally mark", async () => {
      const { game, detectChanges } = await renderBoard();
      release(game);

      playUntil(
        game,
        () => STILL,
        () => game.phase() === "aiming",
      );
      detectChanges();

      expect(screen.queryByText("Rickaashay!")).toBeNull();
    });
  });

  describe("the cards over a level's end", () => {
    it("goes on, handing the board back the focus, as the Paused card's Resume goes on", async () => {
      const { board, game, detectChanges } = await renderBoard();
      release(game);
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect([game.outcome(), board]).toEqual([
        "playing",
        expect.toHaveFocus() as unknown,
      ]);
    });

    it("says how a level cleared went, its stars by name", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });

      playToCard(rendered);

      expect(
        screen.getByRole("group", { name: "Level 1 cleared!" }),
      ).toHaveTextContent("Within 8 shots");
    });

    it("goes on to the next level, handing the board back the focus, as Next level goes on", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });
      playToCard(rendered);

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect([
        screen.getByRole("group", { name: "Level 2: Side door" }),
        rendered.board,
      ]).toEqual([expect.anything(), expect.toHaveFocus() as unknown]);
    });

    it("tries the lost level again, handing the board back the focus, once the result is put away", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("lost") });
      playToCard(rendered);
      rendered.game.closeResult();
      rendered.detectChanges();

      await userEvent.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );

      expect([
        screen.getByRole("group", { name: "Level 1: First bounce" }),
        rendered.board,
      ]).toEqual([expect.anything(), expect.toHaveFocus() as unknown]);
    });

    it("starts a new game, handing the board back the focus, once every level is cleared and the result put away", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });
      await rendered.game.startAt(3);
      playToCard(rendered);
      rendered.game.closeResult();
      rendered.detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "New game" }));

      expect([
        screen.getByRole("group", { name: "Level 3: Columns" }),
        rendered.board,
      ]).toEqual([expect.anything(), expect.toHaveFocus() as unknown]);
    });
  });
});
