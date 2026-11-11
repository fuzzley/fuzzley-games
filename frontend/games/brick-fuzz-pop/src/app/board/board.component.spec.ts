import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { formatPoints } from "@fz/core/format";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { readNamedRects, readRect } from "@fz/dev/board-page";
import { installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import { cssHex } from "@fz/phaser/color";
import {
  type CssRect,
  type Viewport,
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  FakeResizeObserver,
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
import {
  fireEvent,
  isInaccessible,
  render,
  screen,
  within,
} from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { describeBoon, describeRows } from "../../rules/run/describe";
import { tallyOf } from "../../rules/run/scoring";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import type { WallScene } from "../../scene/wall_scene";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import {
  FREED_INK,
  SPEC_POINTS,
  STILL,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../../testing/play";
import { PALETTES } from "../../testing/roles";
import { FRAMES, INKS } from "../../view/art/frames";
import { FIELD_ROLES } from "../../view/colors/palette";
import {
  FRAME_CSS_PX,
  type FieldShape,
  MARGIN_CSS_PX,
  bandPixels,
  fieldMetrics,
  fieldShape,
  lintelPixels,
} from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import type { RoundPlayer } from "../tokens";
import { BoardComponent, PICTURES_SETTLE_MS } from "./board.component";

/** A roomy canvas, 1600 by 900 CSS px, which spares the panels room beside the field. */
const WIDE = { width: 1600, height: 900 } as const;

/** An upright phone's canvas, 390 by 700 CSS px, which spares the panels none. */
const UPRIGHT = { width: 390, height: 700 } as const;

/** A canvas taller than the deepest field fills, 390 by 1400 CSS px. */
const TALL = { width: 390, height: 1400 } as const;

/** A small phone's canvas, 300 by 500 CSS px. */
const SMALL = { width: 300, height: 500 } as const;

/** The longest a spec plays a round's flight for before giving up on it. */
const FLIGHT_LIMIT_MS = 60_000;

/** What a spec renders the board with. */
interface BoardSetUp {
  /** How the fake canvas answers; ready at once unless told otherwise. */
  readonly canvas?: FakeCanvasOptions;
  /** How the game plays each round released; a step down a row unless told otherwise. */
  readonly rounds?: RoundPlayer;
}

/** The board rendered, and what a spec reads of it. */
interface RenderedBoard {
  /** The board's element, `app-board`, which publishes the layout check's numbers. */
  readonly host: HTMLElement;
  /** The application inside it, which takes the focus and the keys. */
  readonly board: HTMLElement;
  readonly component: BoardComponent;
  readonly game: GameService;
  readonly fake: FakePhaserCanvas;
  readonly detectChanges: () => void;
  readonly destroy: () => void;
}

/** Renders the board beside a button outside it, on a fake canvas, the game over the specs' levels. */
async function renderBoard({
  canvas = {},
  rounds = scriptedRounds("step"),
}: BoardSetUp = {}): Promise<RenderedBoard> {
  const view = await render(
    `<app-board /><button type="button">Elsewhere</button>`,
    {
      imports: [BoardComponent],
      providers: [provideFakePhaserCanvas(canvas), ...provideSpecPlay(rounds)],
    },
  );
  await view.fixture.whenStable();
  const debug = view.fixture.debugElement.query(By.directive(BoardComponent));
  return {
    host: debug.nativeElement as HTMLElement,
    board: screen.getByRole("application"),
    component: debug.injector.get(BoardComponent),
    game: TestBed.inject(GameService),
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges: () => {
      view.detectChanges();
    },
    destroy: () => {
      view.fixture.destroy();
    },
  };
}

/** Returns the canvas a board of a CSS size makes, at a pixel ratio, its insets the roomy margin it declares. */
function canvasOf(
  { width, height }: { readonly width: number; readonly height: number },
  pixelRatio = 1,
): Viewport {
  const margin = MARGIN_CSS_PX.roomy;
  return viewport(width, height, pixelRatio, {
    top: margin,
    right: margin,
    bottom: margin,
    left: margin,
  });
}

/** Returns the field under its lintel, from the ceiling to the band's bottom, in CSS px. */
function underTheLintel(cells: CssRect, framed: CssRect): CssRect {
  return {
    x: framed.x,
    y: cells.y,
    width: framed.width,
    height: framed.y + framed.height - cells.y,
  };
}

/** Returns where a field of a shape lies on a canvas, from the lintel's top to the band's bottom, in CSS px. */
function framedOn(canvas: Viewport, shape: FieldShape): CssRect {
  return fieldMetrics(canvas, shape).framed;
}

/**
 * Lays the board out at a CSS size, its insets the roomy margin, as a
 * browser does, without rendering what that changes.
 */
function layOut(
  host: HTMLElement,
  { width, height }: { readonly width: number; readonly height: number },
): void {
  // jsdom works out no `var()`, which the stylesheet declares the insets in.
  for (const edge of ["top", "right", "bottom", "left"]) {
    host.style.setProperty(
      `--fz-canvas-inset-${edge}`,
      `${String(MARGIN_CSS_PX.roomy)}px`,
    );
  }
  resize(host, width, height);
}

/** Measures the board at a CSS size, as the browser lays it out, and renders what that changes. */
function measureAt(
  rendered: RenderedBoard,
  size: { readonly width: number; readonly height: number },
): void {
  layOut(rendered.host, size);
  rendered.detectChanges();
}

/**
 * Plays rounds out, each stepping the wall down a row, until as many rows
 * as asked wait over the ceiling, and renders the board.
 */
function playUntilRowsWait(rendered: RenderedBoard, rows: number): void {
  for (let round = 0; rendered.game.rowsLeft() > rows; round++) {
    if (round > MOST_DEPTH) throw new Error("The rows never came in.");
    playRoundOut(rendered.game);
  }
  rendered.detectChanges();
}

/** Plays rounds released, a frame at a time, until the card over the level's end opens, and renders it. */
function playToCard(rendered: RenderedBoard): void {
  playUntilCard(rendered.game);
  rendered.detectChanges();
}

/** Every friend's frame, in each ink a friend may take. */
const FRIEND_FRAMES: readonly string[] = INKS.map((ink) => FRAMES.friend(ink));

/**
 * Returns a round player whose first round frees a friend, and whose later
 * rounds step the wall down, their flights a friend's behind the player's.
 */
function freeingThenFlyingWithAFriend(): RoundPlayer {
  const freeing = scriptedRounds("freed");
  const stepping = scriptedRounds("step");
  let played = 0;
  return (start, shot, levelBoon) =>
    played++ === 0
      ? freeing(start, shot, levelBoon)
      : {
          ...stepping(start, shot, levelBoon),
          flight: FLIGHT_FIXTURES.friend.round.flight,
        };
}

/** Returns a round player whose rounds clear the level, each freeing a friend as it does. */
function clearingAndFreeing(): RoundPlayer {
  const clearing = scriptedRounds("cleared");
  return (start, shot, levelBoon) => {
    const round = clearing(start, shot, levelBoon);
    const friends = [...round.next.crew.friends, FREED_INK];
    return { ...round, next: { ...round.next, crew: { friends } } };
  };
}

describe("BoardComponent", () => {
  beforeEach(() => {
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("classic", FIELD_ROLES));
  });

  describe("the board", () => {
    it("is an application named for the level on it, and described by its keys", async () => {
      await renderBoard();

      const board = screen.getByRole("application", {
        name: "Brick Fuzz Pop, level 1: Hello, wall",
      });
      expect(board).toHaveAccessibleDescription(
        /^The left and right arrow keys turn the aim/,
      );
    });

    it("is named for the level the run goes on to", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });
      playToCard(rendered);

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect(rendered.board).toHaveAccessibleName(
        "Brick Fuzz Pop, level 2: Stripes",
      );
    });

    it("hears the keys on its own element, through Phaser, and keeps the right button's menu shut", async () => {
      const { host, fake } = await renderBoard();

      expect(fake.host.options).toMatchObject({
        title: "Brick Fuzz Pop",
        config: {
          disableContextMenu: true,
          input: { keyboard: { target: host } },
        },
      });
    });

    it("takes the focus for a press on it", async () => {
      const { board } = await renderBoard();

      fireEvent.pointerDown(board);

      expect(board).toHaveFocus();
    });

    it("takes the focus once rendered, as a run begins", async () => {
      const { board, component, detectChanges } = await renderBoard();

      component.focus();
      detectChanges();

      expect(board).toHaveFocus();
    });

    it("says the field row the wall's lowest row stands in, for the layout check", async () => {
      const { host, game, detectChanges } = await renderBoard();
      const before = game.start().wall.lowestRow;

      playRoundOut(game);
      detectChanges();

      expect(host.dataset["wall"]).toBe(String(before - 1));
    });

    it("says the wall's row as the round in flight started, as the scene draws it till the wall settles", async () => {
      const { host, game, detectChanges } = await renderBoard();
      const before = game.start().wall.lowestRow;

      release(game);
      detectChanges();

      expect(host.dataset["wall"]).toBe(String(before));
    });

    it("says where the run stands, for the layout check", async () => {
      const { host, game, detectChanges } = await renderBoard();

      release(game);
      detectChanges();

      expect(host.dataset["outcome"]).toBe("playing");
    });

    describe("as the scene keeps the field", () => {
      // jsdom answers no media query, so its screen is a roomy one.
      it.each([
        {
          screen: "compact",
          size: (): void => {
            installFakeViewport(390, 844);
          },
          margin: MARGIN_CSS_PX.compact,
        },
        {
          screen: "roomy",
          size: (): void => undefined,
          margin: MARGIN_CSS_PX.roomy,
        },
      ])(
        "keeps the field and its cards the margin in that the scene keeps on a $screen screen",
        async ({ size, margin }) => {
          size();
          const { host } = await renderBoard();

          expect(host.style.getPropertyValue("--margin")).toBe(
            `${String(margin)}px`,
          );
        },
      );

      it("frames the placeholder's field as thick as the scene frames it", async () => {
        const { host } = await renderBoard();

        expect(host.style.getPropertyValue("--frame")).toBe(
          `${String(FRAME_CSS_PX)}px`,
        );
      });
    });

    it("lays the field the margin in where the browser can't measure the board", async () => {
      // jsdom has no `ResizeObserver` to measure the board by.
      const { host } = await renderBoard();

      expect(host.querySelector(".field")).not.toHaveAttribute("style");
    });

    it("counts no rows on the lintel where the browser can't measure the board", async () => {
      await renderBoard();

      expect(screen.queryByText(/waiting$/)).toBeNull();
    });

    it("makes the scene in the game's shape where the browser can't measure the board", async () => {
      const { game, fake } = await renderBoard();
      const shape = game.shape();

      await fake.host.latest.source();

      expect(game.shape()).toBe(shape);
    });

    it("lets nothing go on while the scene is still loading", async () => {
      const { game } = await renderBoard({ canvas: { readyAtOnce: false } });

      expect(game.drawn()).toBe(false);
    });

    it("lets the run go on once the scene has drawn", async () => {
      const { game } = await renderBoard();

      expect(game.drawn()).toBe(true);
    });
  });

  describe("the placeholder", () => {
    watchResizes();

    it("draws the empty field where the scene will lay it out, from the lintel's top to the band's foot", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      const canvas = canvasOf(UPRIGHT);
      // The placeholder is only drawn, so it has no role to find it by.
      expect(rendered.host.querySelector(".field")).toHaveStyle(
        cssRectStyle(framedOn(canvas, fieldShape(canvas))),
      );
    });

    it("draws the lintel and the band as thick as the scene will, in their ink", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      const canvas = canvasOf(UPRIGHT);
      const shape = fieldShape(canvas);
      const { unit } = fieldMetrics(canvas, shape);
      const style = rendered.host.style;
      expect({
        lintel: style.getPropertyValue("--lintel"),
        band: style.getPropertyValue("--band"),
        ink: style.getPropertyValue("--band-ink"),
      }).toEqual({
        lintel: `${String(lintelPixels(shape, unit))}px`,
        band: `${String(bandPixels(shape, unit))}px`,
        ink: cssHex(rendered.game.palette().band),
      });
    });

    it("draws the lintel and the band in CSS pixels on a screen of two device pixels to one", async () => {
      const rendered = await renderBoard();
      vi.stubGlobal("devicePixelRatio", 2);

      measureAt(rendered, UPRIGHT);

      const canvas = canvasOf(UPRIGHT, 2);
      const shape = fieldShape(canvas);
      const { unit } = fieldMetrics(canvas, shape);
      const style = rendered.host.style;
      expect({
        lintel: style.getPropertyValue("--lintel"),
        band: style.getPropertyValue("--band"),
      }).toEqual({
        lintel: `${String(lintelPixels(shape, unit) / 2)}px`,
        band: `${String(bandPixels(shape, unit) / 2)}px`,
      });
    });

    it("publishes the ratio it lays the field out at, as the canvas renders at", async () => {
      const rendered = await renderBoard();
      vi.stubGlobal("devicePixelRatio", 2);

      measureAt(rendered, UPRIGHT);

      expect(rendered.host.style.getPropertyValue("--pixel-ratio")).toBe("2");
    });

    it("draws nothing where the board has no room, as a hidden board's", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, { width: 0, height: 0 });

      // The placeholder is only drawn, so it has no role to find it by.
      const field = rendered.host.querySelector<HTMLElement>(".field")!;
      expect(field.style.cssText).toBe("");
    });

    it("lays the field out in the shape the round in flight keeps, on the room as it changes", async () => {
      const rendered = await renderBoard({ canvas: { readyAtOnce: false } });
      measureAt(rendered, UPRIGHT);
      release(rendered.game);

      measureAt(rendered, WIDE);

      expect(rendered.host.querySelector(".field")).toHaveStyle(
        cssRectStyle(framedOn(canvasOf(WIDE), fieldShape(canvasOf(UPRIGHT)))),
      );
    });

    it("lays the ring over the field and the Ready card under its lintel, before the scene has drawn it", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      const canvas = canvasOf(UPRIGHT);
      const { css, framed } = fieldMetrics(canvas, fieldShape(canvas));
      // The card's element is only the layer a card shows in, and the ring
      // is only drawn, so neither has a role to find it by.
      expect(rendered.host.querySelector("app-board-card")).toHaveStyle(
        cssRectStyle(underTheLintel(css, framed)),
      );
      expect(rendered.host.querySelector(".ring")).toHaveStyle(
        cssRectStyle(framed),
      );
    });

    it("lays every other card over the whole field, as tall as a Cleared card needs", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, UPRIGHT);
      playRoundOut(rendered.game);
      release(rendered.game);

      rendered.game.pause();
      rendered.detectChanges();

      const canvas = canvasOf(UPRIGHT);
      // The card's element is only the layer a card shows in.
      expect(rendered.host.querySelector("app-board-card")).toHaveStyle(
        cssRectStyle(framedOn(canvas, fieldShape(canvas))),
      );
    });

    it("hands the game the room it measures, which shapes the field waiting for its first shot", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      expect(rendered.game.shape()).toEqual(fieldShape(canvasOf(UPRIGHT)));
    });

    it("hands the game the room it last measured as the scene is made, before the scene lays the field out", async () => {
      const { host, game, fake } = await renderBoard();
      // Measured, but not yet rendered, so only the scene's making hands
      // the game the room.
      layOut(host, UPRIGHT);

      await fake.host.latest.source();

      expect(game.shape()).toEqual(fieldShape(canvasOf(UPRIGHT)));
    });

    it("places the panels beside the field where the room spares them", async () => {
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

    it("lays the field flush with the panels, from the lintel's top to the band's foot", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const panel = screen.getByRole("region", { name: "Coming next" }).style;
      // The placeholder is only drawn, so it has no role to find it by.
      const field = rendered.host.querySelector<HTMLElement>(".field")!.style;
      expect({ top: field.top, height: field.height }).toEqual({
        top: panel.top,
        height: panel.height,
      });
    });

    it("shows no panels where the room spares them none", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      expect(screen.queryAllByRole("region")).toEqual([]);
    });

    it("keeps the lintel's count, the panels and the card outside the application, read as a page is", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const application = within(rendered.board);
      expect({
        panels: screen.getAllByRole("region").length,
        inApplication: application.queryAllByRole("region").length,
        card: application.queryByText("Level 1: Hello, wall"),
        lintels: screen.queryAllByText(/waiting$/).length,
        lintel: application.queryByText(/waiting$/),
      }).toEqual({
        panels: 2,
        inApplication: 0,
        card: null,
        lintels: 1,
        lintel: null,
      });
    });

    it("publishes nothing for the layout check before the scene has laid the field out", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const { dataset, style } = rendered.host;
      expect({
        field: dataset["field"],
        room: dataset["room"],
        panels: dataset["panels"],
        depth: dataset["depth"],
        across: style.getPropertyValue("--across"),
        down: style.getPropertyValue("--down"),
      }).toEqual({
        field: undefined,
        room: undefined,
        panels: undefined,
        depth: undefined,
        across: "",
        down: "",
      });
    });

    it("publishes the field's units down from the device pixels the scene laid it out in", async () => {
      // So tall a field's band and lintel are each a fraction of a unit,
      // on a screen of two device pixels to one.
      const { host, game, detectChanges } = await renderBoard();
      const canvas = canvasOf(TALL, 2);
      const { framed } = fieldMetrics(canvas, fieldShape(canvas));

      game.onLayout(fieldMetrics(canvas, fieldShape(canvas)));
      detectChanges();

      expect(Number(host.style.getPropertyValue("--down"))).toBeCloseTo(
        framed.height / (framed.width / COLUMNS),
        9,
      );
    });

    it("stops watching the board once it is gone", async () => {
      const { destroy } = await renderBoard();

      destroy();

      expect(FakeResizeObserver.made.map((made) => made.watched.size)).toEqual([
        0,
      ]);
    });
  });

  describe("its lintel", () => {
    watchResizes();

    /** Renders a board on a phone, where nothing else counts the rows waiting, measured upright. */
    async function phoneBoard(): Promise<RenderedBoard> {
      installFakeViewport(390, 844);
      const rendered = await renderBoard();
      measureAt(rendered, UPRIGHT);
      return rendered;
    }

    /** Returns the lintel's count of the rows waiting, hidden from assistive technology or not. */
    function lintel(): HTMLElement {
      return screen.getByText(/waiting$/);
    }

    it("says how many rows wait over the ceiling", async () => {
      await phoneBoard();

      // The specs' first level holds seven rows over an upright phone's field.
      expect(lintel()).toHaveTextContent(/^7 rows waiting$/);
    });

    it("says one row waits once the rest have come in", async () => {
      const rendered = await phoneBoard();

      playUntilRowsWait(rendered, 1);

      expect(lintel()).toHaveTextContent(/^1 row waiting$/);
    });

    it("says no rows wait once the last has come in", async () => {
      const rendered = await phoneBoard();

      playUntilRowsWait(rendered, 0);

      expect(lintel()).toHaveTextContent(/^No rows waiting$/);
    });

    it("lies in the lintel, over the ceiling's line, where the field is laid out", async () => {
      await phoneBoard();

      const canvas = canvasOf(UPRIGHT);
      const { css, framed } = fieldMetrics(canvas, fieldShape(canvas));
      expect(lintel()).toHaveStyle(
        cssRectStyle({
          x: framed.x,
          y: framed.y,
          width: framed.width,
          height: css.y - framed.y - FRAME_CSS_PX,
        }),
      );
    });

    it.each([
      {
        where: "on a phone",
        size: (): void => {
          installFakeViewport(390, 844);
        },
      },
      {
        where: "on a roomy screen whose bar has no room to count them",
        size: (): void => {
          installFakeViewport(1000, 700);
        },
      },
      {
        where:
          "on a short screen as wide as the bar's labels, whose bar is a phone's",
        size: (): void => {
          installFakeViewport(1300, 450);
        },
      },
    ])("is read $where, where no panels show", async ({ size }) => {
      size();
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      expect(isInaccessible(lintel())).toBe(false);
    });

    it.each([
      {
        where:
          "the bar counts the rows, from the width its actions keep their labels at",
        size: (): void => {
          installFakeViewport(1280, 800);
        },
        room: UPRIGHT,
      },
      {
        where: "Coming next counts them, beside the field",
        size: (): void => {
          installFakeViewport(1000, 700);
        },
        room: WIDE,
      },
    ])(
      "is hidden from assistive technology where $where",
      async ({ size, room }) => {
        size();
        const rendered = await renderBoard();

        measureAt(rendered, room);

        const count = lintel();
        expect({
          hidden: isInaccessible(count),
          words: count.textContent.trim(),
        }).toEqual({
          hidden: true,
          words: expect.stringMatching(/^\d+ rows waiting$/) as unknown,
        });
      },
    );
  });

  describe("its panels", () => {
    watchResizes();

    it("show the level in play, and the kinds of brick its wall holds", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const comingNext = screen.getByRole("region", { name: "Coming next" });
      const inThisWall = screen.getByRole("region", { name: "In this wall" });
      expect(
        within(comingNext).getByText("Level 1: Hello, wall"),
      ).toBeVisible();
      expect(within(inThisWall).getByText("Brick")).toBeVisible();
    });

    it("light the boon a jump earned the shot being aimed", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("jump") });
      measureAt(rendered, WIDE);

      playRoundOut(rendered.game);
      rendered.detectChanges();

      const inThisWall = screen.getByRole("region", { name: "In this wall" });
      expect(within(inThisWall).getByText("Next shot: hot shot")).toBeVisible();
    });
  });

  describe("its card", () => {
    it("names the level waiting for its first shot, what its jumps earn, and the kind of brick it brings in", async () => {
      const { game } = await renderBoard();

      expect(screen.getByText("Level 1: Hello, wall")).toBeVisible();
      expect(screen.getByText(describeBoon(game.levelBoon()))).toBeVisible();
      expect(screen.getByText("New: Brick.")).toBeVisible();
    });

    it("shows none while the level is played", async () => {
      const { host, game, detectChanges } = await renderBoard();

      release(game);
      detectChanges();

      // The card's element is only the layer a card shows in, with no role.
      expect(host.querySelector("app-board-card")!.textContent.trim()).toBe("");
    });

    it("says the level is paused, with the score", async () => {
      const { game, detectChanges } = await renderBoard();
      playRoundOut(game);
      release(game);

      game.pause();
      detectChanges();

      expect(screen.getByText("Paused")).toBeVisible();
      expect(
        screen.getByText(`Score ${formatPoints(SPEC_POINTS.step)}`),
      ).toBeVisible();
    });

    it("goes on, handing the board back the focus, as Resume goes on", async () => {
      const { board, game, detectChanges } = await renderBoard();
      release(game);
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(board).toHaveFocus();
    });

    it("says how the level cleared added up, with the friends its last round freed", async () => {
      const rendered = await renderBoard({ rounds: clearingAndFreeing() });

      playToCard(rendered);

      const run = rendered.game.run();
      const tally = Object.values(tallyOf(run)).map(formatPoints);
      expect(screen.getByText("Level 1 cleared")).toBeVisible();
      expect(screen.getByText(`1 round, par ${String(run.par)}`)).toBeVisible();
      expect(
        screen.getAllByRole("definition").map((points) => points.textContent),
      ).toEqual(tally);
      expect(
        screen.getByText(`Score ${formatPoints(run.score)}`),
      ).toBeVisible();
      expect(screen.getByText("1 friend freed")).toBeVisible();
    });

    it("shows nothing over the level cleared until its card's wait runs out", async () => {
      const { game, detectChanges } = await renderBoard({
        rounds: scriptedRounds("cleared"),
      });

      release(game);
      playUntil(
        game,
        () => STILL,
        () => game.outcome() === "cleared",
      );
      detectChanges();

      expect({
        waiting: game.card(),
        shown: screen.queryByText("Level 1 cleared"),
      }).toEqual({ waiting: null, shown: null });
    });

    it("goes on to the next level, handing the board back the focus, as Next level goes on", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });
      playToCard(rendered);

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect(screen.getByText("Level 2: Stripes")).toBeVisible();
      expect(rendered.board).toHaveFocus();
    });

    it("names no kind of brick for a level that brings none in", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });
      playToCard(rendered);

      rendered.game.nextLevel();
      rendered.detectChanges();

      expect(screen.queryByText(/^New:/)).not.toBeInTheDocument();
    });

    it.each([
      { end: "a lost run", rounds: "lost", level: 1, title: "Game over" },
      {
        end: "the last level cleared",
        rounds: "cleared",
        level: 3,
        title: "Every level cleared!",
      },
    ] as const)(
      "shows nothing over $end while its result is open",
      async ({ rounds, level, title }) => {
        const rendered = await renderBoard({ rounds: scriptedRounds(rounds) });
        await rendered.game.startAt(level);

        playToCard(rendered);

        expect(screen.queryByText(title)).not.toBeInTheDocument();
      },
    );

    it("says where a lost run was lost once its result is put away", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("lost") });
      playToCard(rendered);

      rendered.game.closeResult();
      rendered.detectChanges();

      expect(screen.getByText("Lost on level 1, Hello, wall")).toBeVisible();
    });

    it("tries the lost level again, handing the board back the focus, as Try again goes on", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("lost") });
      playToCard(rendered);
      rendered.game.closeResult();
      rendered.detectChanges();

      await userEvent.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );

      expect(rendered.game.outcome()).toBe("ready");
      expect(rendered.board).toHaveFocus();
    });

    it("starts a new game, handing the board back the focus, once every level is cleared and the result put away", async () => {
      const rendered = await renderBoard({ rounds: scriptedRounds("cleared") });
      await rendered.game.startAt(3);
      playToCard(rendered);
      rendered.game.closeResult();
      rendered.detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "New game" }));

      expect(screen.getByText("Level 3: Pips")).toBeVisible();
      expect(rendered.board).toHaveFocus();
    });

    it("gives way to the canvas's, which says the board couldn't be drawn, as the app's error handler is told why", async () => {
      const errors = collectErrors();
      const { fake, detectChanges } = await renderBoard({
        canvas: { readyAtOnce: false },
      });

      fake.host.latest.fail();
      await Promise.resolve();
      detectChanges();

      expect({
        alert: screen.getByRole("alert"),
        ready: screen.queryByText("Level 1: Hello, wall"),
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

  describe("with the scene it loads", () => {
    watchResizes();

    /**
     * Runs the scene the board hands its canvas, as Phaser would, the board
     * and the canvas measured at the same CSS size, and draws its first
     * frame.
     */
    async function runBoardScene(
      size: { readonly width: number; readonly height: number } = UPRIGHT,
      setUp: BoardSetUp = {},
    ): Promise<RenderedBoard & { run: SceneRun<HostedScene> }> {
      const rendered = await renderBoard(setUp);
      const run = await runSceneOn(rendered, size);
      run.advance(FRAME_MS);
      rendered.detectChanges();
      return { ...rendered, run };
    }

    /**
     * Measures a board at a CSS size and runs the scene it hands its canvas
     * on a canvas of that size, drawing no frame.
     */
    async function runSceneOn(
      rendered: RenderedBoard,
      size: { readonly width: number; readonly height: number },
    ): Promise<SceneRun<HostedScene>> {
      measureAt(rendered, size);
      return runShownScene(rendered.fake, rendered.host, {
        ...size,
        insets: canvasOf(size).insets,
      });
    }

    /** Returns the scene the board made, as the wall scene it is. */
    async function wallSceneOf(hosted: HostedScene): Promise<WallScene> {
      const { WallScene: Wall } = await import("../../scene/wall_scene");
      if (!(hosted instanceof Wall)) throw new Error("Not the wall scene.");
      return hosted;
    }

    /**
     * Draws the scene's frames until `done` says so, failing after
     * {@link FLIGHT_LIMIT_MS} of them.
     */
    function advanceSceneUntil(
      run: SceneRun<HostedScene>,
      done: () => boolean,
    ): void {
      for (let ms = 0; !done(); ms += FRAME_MS) {
        if (ms >= FLIGHT_LIMIT_MS)
          throw new Error("The scene never got there.");
        run.advance(FRAME_MS);
      }
    }

    /** Returns the frames of the fuzzballs the scene shows. */
    function shownBalls(scene: WallScene): string[] {
      return scene.balls.bodies
        .filter((body) => body.visible)
        .map((body) => body.frame.name);
    }

    it("lays the field out first on the room the board measured", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, WIDE);
      const canvas = canvasOf(WIDE);

      await runShownScene(rendered.fake, rendered.host, {
        ...WIDE,
        insets: canvas.insets,
      });

      expect(rendered.game.metrics()).toEqual(
        fieldMetrics(canvas, fieldShape(canvas)),
      );
    });

    it("lays the ring and the Ready card where the scene drew the field, the card under its lintel, where the canvas it measured differs from the board", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, { width: WIDE.width + 10, height: WIDE.height });
      const run = await runShownScene(rendered.fake, rendered.host, {
        ...WIDE,
        insets: canvasOf(WIDE).insets,
      });

      run.advance(FRAME_MS);
      rendered.detectChanges();

      const { game, host } = rendered;
      const { css, framed } = game.metrics()!;
      // The ring is only drawn, and the card's element is only the layer a
      // card shows in, so neither has a role to find it by.
      expect(host.querySelector(".ring")).toHaveStyle(cssRectStyle(framed));
      expect(host.querySelector("app-board-card")).toHaveStyle(
        cssRectStyle(underTheLintel(css, framed)),
      );
    });

    it("publishes where the scene laid the field out, from the lintel's top to the band's foot, and lays the focus ring there", async () => {
      const { host, game } = await runBoardScene();

      const field = game.metrics()!.framed;
      expect({
        drawnAt: host.dataset["field"],
        ring: host.querySelector(".ring"),
      }).toEqual({
        drawnAt: rectAttribute(field),
        ring: expect.toHaveStyle(cssRectStyle(field)) as unknown,
      });
    });

    it("publishes the field's shape in its units, nine across and a unit to every row of its height, its band and its lintel as drawn", async () => {
      // So tall a field has its most rows, and its band and its lintel
      // their thickest, each a fraction of a unit drawn in whole pixels.
      const { host, game } = await runBoardScene(TALL);

      const { width, height } = readRect(host.getAttribute("data-field"))!;
      const across = Number(host.style.getPropertyValue("--across"));
      const down = Number(host.style.getPropertyValue("--down"));
      expect({ across, wide: width / across, high: height / down }).toEqual({
        across: COLUMNS,
        wide: game.metrics()!.css.width / COLUMNS,
        high: expect.closeTo(width / across, 9) as unknown,
      });
    });

    it("publishes how many rows deep it laid the field out, the most a room so tall asks for", async () => {
      const { host } = await runBoardScene(TALL);

      expect(host.dataset["depth"]).toBe(String(MOST_DEPTH));
    });

    it("publishes the room the scene laid the field out in, inside the canvas's insets", async () => {
      const { host } = await runBoardScene(WIDE);

      expect(host.dataset["room"]).toBe(
        rectAttribute(cssRectOf(roomInside(canvasOf(WIDE)), 1)),
      );
    });

    it("publishes where the panels lie, by their names, where the room spares them", async () => {
      const { host, game } = await runBoardScene(WIDE);

      const { panels } = game.metrics()!;
      expect(host.dataset["panels"]).toBe(
        namedRectsAttribute([
          ["left", panels!.left],
          ["right", panels!.right],
        ]),
      );
    });

    it("publishes the room, the panels and the field's units down in CSS pixels on a canvas of two device pixels to one", async () => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { host } = await runBoardScene(WIDE);

      const canvas = canvasOf(WIDE, 2);
      const { framed, panels } = fieldMetrics(canvas, fieldShape(canvas));
      expect({
        room: readRect(host.getAttribute("data-room")),
        panels: readNamedRects(host.getAttribute("data-panels") ?? "").map(
          ({ name, rect }) => ({ name, rect }),
        ),
        down: Number(host.style.getPropertyValue("--down")),
      }).toEqual({
        room: cssRectOf(roomInside(canvas), 2),
        panels: [
          { name: "left", rect: panels!.left },
          { name: "right", rect: panels!.right },
        ],
        down: expect.closeTo(
          framed.height / (framed.width / COLUMNS),
          9,
        ) as unknown,
      });
    });

    it("publishes that it laid no panels out where the room spares none", async () => {
      const { host } = await runBoardScene(UPRIGHT);

      expect(host.dataset["panels"]).toBe("");
    });

    it("plays the round released on, a frame of the scene's at a time, until the next is aimed", async () => {
      const { game, run } = await runBoardScene();
      release(game);

      advanceSceneUntil(run, () => game.phase() === "aiming");

      expect({ phase: game.phase(), rounds: game.rounds() }).toEqual({
        phase: "aiming",
        rounds: 1,
      });
    });

    it("pauses the level at the key above the right little finger's home key", async () => {
      const { game, run } = await runBoardScene();
      release(game);

      run.key("keydown", "KeyP", "p");

      expect(game.outcome()).toBe("paused");
    });

    it("reads the wall's lowest rows at the key above the left index finger's home key", async () => {
      const { game, run } = await runBoardScene();

      run.key("keydown", "KeyR", "r");

      expect(TestBed.inject(AnnouncerService).message()).toBe(
        describeRows(game.start()),
      );
    });

    it("mutes the scene while the settings turn the sound off", async () => {
      const { run } = await runBoardScene();
      TestBed.inject(SettingsService).update({ sound: false });

      run.advance(FRAME_MS);

      expect(run.scene.sound.mute).toBe(true);
    });

    it("shows the pictures of the bricks the scene baked, in the panels and on the cards", async () => {
      const { host } = await runBoardScene(WIDE);

      // Each picture is only drawn, beside the kind's name, so it has no role.
      const pictures = [
        ...host.querySelectorAll<HTMLImageElement>("app-board-card img"),
        ...host.querySelectorAll<HTMLImageElement>("app-in-this-wall img"),
      ];
      expect(pictures.map((picture) => picture.src.length > 0)).toEqual([
        true,
        true,
      ]);
    });

    it("has the waiting fuzzball wear the boon a jump earned it, from the jump's landing", async () => {
      // Where motion is welcome, the wall settles after the landing.
      installFakeViewport(1280, 720).setReducedMotion(false);
      const { game, run } = await runBoardScene(UPRIGHT, {
        rounds: scriptedRounds("jump"),
      });
      const scene = await wallSceneOf(run.scene);
      release(game);

      advanceSceneUntil(run, () => game.phase() !== "flying");
      run.advance(FRAME_MS);

      expect({ phase: game.phase(), balls: shownBalls(scene) }).toEqual({
        phase: "settling",
        balls: [FRAMES.hotShot],
      });
    });

    it("flies each friend the round's crew holds in its ink", async () => {
      const { game, run } = await runBoardScene(UPRIGHT, {
        rounds: freeingThenFlyingWithAFriend(),
      });
      const scene = await wallSceneOf(run.scene);
      playRoundOut(game);
      release(game);

      advanceSceneUntil(run, () =>
        shownBalls(scene).some((ball) => FRIEND_FRAMES.includes(ball)),
      );

      expect(shownBalls(scene)).toContain(FRAMES.friend(FREED_INK));
    });

    it("has the scene encode the pictures where the Ready card shows the kind of brick a level brings in", async () => {
      const rendered = await renderBoard();
      const run = await runSceneOn(rendered, UPRIGHT);
      const encode = vi.spyOn(run.scene.textures, "getBase64");

      rendered.detectChanges();

      expect(encode).toHaveBeenCalled();
    });

    it("has the scene encode no pictures where neither the panels nor a new kind of brick shows them", async () => {
      const rendered = await renderBoard();
      await rendered.game.startAt(2);
      const run = await runSceneOn(rendered, UPRIGHT);
      const encode = vi.spyOn(run.scene.textures, "getBase64");

      rendered.detectChanges();

      expect(encode).not.toHaveBeenCalled();
    });

    it("has the scene encode the pictures where the panels show them", async () => {
      const rendered = await renderBoard();
      await rendered.game.startAt(2);
      const run = await runSceneOn(rendered, WIDE);
      const encode = vi.spyOn(run.scene.textures, "getBase64");

      rendered.detectChanges();

      expect(encode).toHaveBeenCalled();
    });

    it("publishes no room while the board has none, as a hidden board's", async () => {
      const rendered = await runBoardScene(UPRIGHT);

      measureAt(rendered, { width: 0, height: 0 });

      expect(rendered.host.dataset["room"]).toBeUndefined();
    });

    it("lets the shot fly at Space, handing the game the scene's steering", async () => {
      const { game, run } = await runBoardScene();

      run.key("keydown", "Space", " ");
      run.advance(FRAME_MS);

      expect(game.phase()).toBe("flying");
    });

    it("lets go of a key held down on it as the focus leaves it", async () => {
      const { board, game, run } = await runBoardScene();
      release(game);
      board.focus();
      run.key("keydown", "KeyF", "f");
      run.advance(FRAME_MS);

      screen.getByRole("button", { name: "Elsewhere" }).focus();
      run.advance(FRAME_MS);

      expect({ flying: game.flying(), fast: game.fast() }).toEqual({
        flying: true,
        fast: false,
      });
    });

    describe("as the scene bakes its atlas again", () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      /**
       * Runs the board's scene on a wide canvas, then has the specs move
       * the timers the pictures wait on.
       */
      async function runWide(): Promise<
        RenderedBoard & { run: SceneRun<HostedScene> }
      > {
        const board = await runBoardScene(WIDE);
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        return board;
      }

      /** Has the scene bake its atlas again, at the unit a canvas of a CSS size holds. */
      function bakeAt(
        run: SceneRun<HostedScene>,
        { width, height }: { readonly width: number; readonly height: number },
      ): void {
        run.game.scale.resize(width, height);
        run.advance(FRAME_MS);
      }

      it("keeps the pictures the game has until the atlas settles", async () => {
        const { game, run } = await runWide();
        const first = game.pictures();
        bakeAt(run, UPRIGHT);

        vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);

        expect(game.pictures()).toBe(first);
      });

      it("hands the game the pictures of the new atlas once it has settled", async () => {
        const { game, run } = await runWide();
        const first = game.pictures();
        bakeAt(run, UPRIGHT);

        vi.advanceTimersByTime(PICTURES_SETTLE_MS);

        expect(game.pictures()).not.toBe(first);
      });

      it("waits again for the atlas to settle each time it is baked", async () => {
        const { game, run } = await runWide();
        const first = game.pictures();
        bakeAt(run, UPRIGHT);
        vi.advanceTimersByTime(PICTURES_SETTLE_MS / 2);
        bakeAt(run, SMALL);

        vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);

        expect(game.pictures()).toBe(first);
      });

      it("hands the game no pictures once the board is gone", async () => {
        const { game, run, destroy } = await runWide();
        const first = game.pictures();
        bakeAt(run, UPRIGHT);

        destroy();
        vi.advanceTimersByTime(PICTURES_SETTLE_MS);

        expect(game.pictures()).toBe(first);
      });
    });
  });
});
