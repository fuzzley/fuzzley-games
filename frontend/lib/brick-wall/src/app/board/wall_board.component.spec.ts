import { ApplicationRef, Component, signal, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { RunStage } from "@fz/core/run";
import { CanvasCardsComponent, type SceneSource } from "@fz/phaser/canvas";
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
  FakePhaserCanvas,
  FakeResizeObserver,
  provideFakePhaserCanvas,
  resize,
  watchResizes,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { AnnouncerService } from "@fz/ui/announcer";
import {
  fireEvent,
  isInaccessible,
  render,
  screen,
  within,
} from "@testing-library/angular";
import { COLUMNS } from "../../rules/field";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  type FieldShape,
  MARGIN_CSS_PX,
  bandPixels,
  fieldMetrics,
  fieldShape,
  lintelPixels,
} from "../../view/field_metrics";
import { type PaletteRoles, wallPalette } from "../../view/palette";
import {
  BOARD_CONTEXT_WORDS,
  WallBoardComponent,
} from "./wall_board.component";

/** A roomy canvas, 1600 by 900 CSS px, which spares the panels room beside the field. */
const WIDE = { width: 1600, height: 900 } as const;

/** An upright phone's canvas, 390 by 700 CSS px, which spares the panels none. */
const UPRIGHT = { width: 390, height: 700 } as const;

/** The roles the spec's palette is mixed from, each unlike the others. */
const ROLES: PaletteRoles = {
  field: "#fafafa",
  fieldLine: "#d0d0d0",
  fieldText: "#101010",
  fieldMuted: "#707070",
  page: "#eeeeee",
  accent: "#00aa00",
  danger: "#ff0000",
  warning: "#ffa500",
};

/** The colors the spec's field is drawn in. */
const PALETTE = wallPalette(ROLES, "light");

/** The keys the spec's game is played with. */
const KEYS = ["Left and Right: aim.", "Space: shoot."] as const;

/** What the spec's game's scene source makes, which the fake canvas never calls. */
function makeNoScene(): never {
  throw new Error("The fake canvas makes no scene.");
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

/** Returns where a field lies on a canvas, in the shape its room asks for, from the lintel's top to the band's bottom, in CSS px. */
function metricsOn(canvas: Viewport): FieldMetrics {
  return fieldMetrics(canvas, fieldShape(canvas));
}

/**
 * Lays a game's board out, as the spec's game takes the room's shape as it
 * is handed one, with a panel on each side where the room spares them, and
 * a card that says whether the board is being restored, beside a button
 * outside it.
 */
@Component({
  imports: [CanvasCardsComponent, WallBoardComponent],
  template: `
    <fz-wall-board
      #board
      name="Made-up Wall"
      [label]="label()"
      [keys]="keys"
      [scene]="scene"
      [metrics]="metrics()"
      [shape]="shape()"
      [palette]="palette"
      [outcome]="outcome()"
      [wallRow]="wallRow()"
      [waiting]="waiting()"
      [countShown]="countShown()"
      [compact]="compact()"
      [cardUnderLintel]="cardUnderLintel()"
      (room)="takeRoom($event)"
      (drawn)="drawn.set($event)"
      (contextLost)="losses.set(losses() + 1)"
    >
      @if (board.panels(); as panels) {
        <section aria-label="Left panel" [style]="panels.left">
          <p>{{ waiting() }}</p>
        </section>
        <section aria-label="Right panel" [style]="panels.right"></section>
      }
      <div
        class="card"
        role="group"
        aria-label="Card"
        [style]="board.cardPlace()"
      >
        @if (board.restoring()) {
          <p>Restoring</p>
        } @else {
          <button type="button">Go on</button>
        }
        <fz-canvas-cards [canvas]="board.canvas()" />
      </div>
    </fz-wall-board>
    <button type="button">Elsewhere</button>
  `,
})
class GameBoard {
  readonly board = viewChild.required(WallBoardComponent);
  readonly label = signal("Made-up Wall, level 3: Gravel");
  readonly keys = KEYS;
  readonly scene: SceneSource = () => Promise.resolve(makeNoScene);
  readonly metrics = signal<FieldMetrics | null>(null);
  readonly shape = signal<FieldShape>(fieldShape(canvasOf(UPRIGHT)));
  readonly palette = PALETTE;
  readonly outcome = signal<RunStage>("playing");
  readonly wallRow = signal(9);
  readonly waiting = signal("4 rows waiting");
  readonly countShown = signal(false);
  readonly compact = signal(false);
  readonly cardUnderLintel = signal(false);
  /** Every room the board handed the game, oldest first. */
  readonly rooms: Viewport[] = [];
  readonly drawn = signal<boolean | null>(null);
  readonly losses = signal(0);

  /** Takes the room's shape, as a game does. */
  takeRoom(room: Viewport): void {
    this.rooms.push(room);
    this.shape.set(fieldShape(room));
  }
}

/** The board rendered, and what a spec reads of it. */
interface RenderedBoard {
  /** The board's element, `fz-wall-board`, which publishes the layout check's numbers. */
  readonly host: HTMLElement;
  /** The application inside it, which takes the focus and the keys. */
  readonly board: HTMLElement;
  readonly game: GameBoard;
  readonly fake: FakePhaserCanvas;
  readonly detectChanges: () => void;
  readonly destroy: () => void;
}

/** Renders the spec's game's board on a fake canvas, ready at once unless told otherwise. */
async function renderBoard(readyAtOnce = true): Promise<RenderedBoard> {
  const view = await render(GameBoard, {
    providers: [provideFakePhaserCanvas({ readyAtOnce })],
  });
  await view.fixture.whenStable();
  return {
    host: view.container.querySelector("fz-wall-board")!,
    board: screen.getByRole("application"),
    game: view.fixture.componentInstance,
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges: () => {
      view.detectChanges();
    },
    destroy: () => {
      view.fixture.destroy();
    },
  };
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

/** Returns the field under its lintel, from the ceiling to the band's bottom, in CSS px. */
function underTheLintel({ css, framed }: FieldMetrics): CssRect {
  return {
    x: framed.x,
    y: css.y,
    width: framed.width,
    height: framed.y + framed.height - css.y,
  };
}

/** Returns the lintel's count of the rows waiting, outside the left panel, which says it in the same words. */
function lintel(): HTMLElement {
  const panel = screen.queryByRole("region", { name: "Left panel" });
  const [count, ...more] = screen
    .getAllByText(/waiting$/)
    .filter((shown) => panel?.contains(shown) !== true);
  if (count === undefined || more.length > 0) {
    throw new Error("Expected the lintel's count alone outside the panel.");
  }
  return count;
}

describe("WallBoardComponent", () => {
  describe("the board", () => {
    it("is an application named by the label the game gives, and described by its keys", async () => {
      await renderBoard();

      expect(
        screen.getByRole("application", {
          name: "Made-up Wall, level 3: Gravel",
        }),
      ).toHaveAccessibleDescription("Left and Right: aim. Space: shoot.");
    });

    it("lists the keys the game gives, one at a time", async () => {
      await renderBoard();

      expect(
        within(screen.getByRole("list", { name: "Keys" }))
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(KEYS);
    });

    it("is named again as the game names it", async () => {
      const { board, game, detectChanges } = await renderBoard();

      game.label.set("Made-up Wall, level 4: Quarry");
      detectChanges();

      expect(board).toHaveAccessibleName("Made-up Wall, level 4: Quarry");
    });

    it("hides the canvas in the application, which shows only the game's name to assistive technology", async () => {
      const { board } = await renderBoard();

      expect(within(board).queryAllByRole("img")).toEqual([]);
    });

    it("hears the keys on its own element, through Phaser, under the game's name, and keeps the right button's menu shut", async () => {
      const { host, fake } = await renderBoard();

      expect(fake.host.options).toMatchObject({
        title: "Made-up Wall",
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
      const { board, game, detectChanges } = await renderBoard();

      game.board().focus();
      detectChanges();

      expect(board).toHaveFocus();
    });

    it("takes the focus at once from a card's button that goes with the card", async () => {
      const { board, game } = await renderBoard();
      screen.getByRole("button", { name: "Go on" }).focus();

      game.board().takeFocus();

      expect(board).toHaveFocus();
    });

    it("says where the run stands, and the row the wall's lowest row stands in, for the layout check", async () => {
      const { host, game, detectChanges } = await renderBoard();

      game.outcome.set("paused");
      game.wallRow.set(7);
      detectChanges();

      expect({
        outcome: host.dataset["outcome"],
        wall: host.dataset["wall"],
      }).toEqual({ outcome: "paused", wall: "7" });
    });

    it.each([
      { screen: "compact", compact: true, margin: MARGIN_CSS_PX.compact },
      { screen: "roomy", compact: false, margin: MARGIN_CSS_PX.roomy },
    ])(
      "keeps the field and its card the margin in that the scene keeps on a $screen screen",
      async ({ compact, margin }) => {
        const { host, game, detectChanges } = await renderBoard();

        game.compact.set(compact);
        detectChanges();

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

    it("lays the field the margin in where the browser can't measure the board", async () => {
      // jsdom has no `ResizeObserver` to measure the board by.
      const { host } = await renderBoard();

      expect({
        field: host.querySelector(".field")!.getAttribute("style"),
        card: host.querySelector(".card")!.getAttribute("style"),
      }).toEqual({ field: null, card: null });
    });

    it("counts no rows on the lintel where the browser can't measure the board", async () => {
      await renderBoard();

      expect(screen.queryByText(/waiting$/)).toBeNull();
    });

    it("makes the scene the game's source makes, handing the game no room where the browser can't measure the board", async () => {
      const { game, fake } = await renderBoard();

      const made = await fake.host.latest.source();

      expect({ made, rooms: game.rooms }).toEqual({
        made: makeNoScene,
        rooms: [],
      });
    });

    it("publishes no room where the browser can't measure the board, once the scene has laid the field out", async () => {
      const rendered = await renderBoard();

      rendered.game.metrics.set(metricsOn(canvasOf(UPRIGHT)));
      rendered.detectChanges();

      expect(rendered.host.dataset["room"]).toBeUndefined();
    });

    it("lets nothing go on while the scene is still loading", async () => {
      const { game } = await renderBoard(false);

      expect(game.drawn()).toBe(false);
    });

    it("lets the game go on once the scene has drawn", async () => {
      const { game } = await renderBoard();

      expect(game.drawn()).toBe(true);
    });

    it("hands the game's card the canvas, whose own cards it shows", async () => {
      const { fake, detectChanges } = await renderBoard(false);

      fake.host.latest.fail();
      await TestBed.inject(ApplicationRef).whenStable();
      detectChanges();

      expect(screen.getByRole("group", { name: "Card" })).toContainElement(
        screen.getByRole("alert"),
      );
    });
  });

  describe("the placeholder", () => {
    watchResizes();

    it("draws the empty field where the scene will lay it out, from the lintel's top to the band's foot", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      // The placeholder is only drawn, so it has no role to find it by.
      expect(rendered.host.querySelector(".field")).toHaveStyle(
        cssRectStyle(metricsOn(canvasOf(UPRIGHT)).framed),
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
        ink: cssHex(PALETTE.band),
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
        ratio: style.getPropertyValue("--pixel-ratio"),
      }).toEqual({
        lintel: `${String(lintelPixels(shape, unit) / 2)}px`,
        band: `${String(bandPixels(shape, unit) / 2)}px`,
        ratio: "2",
      });
    });

    it("draws nothing where the board has no room, as a hidden board's", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, { width: 0, height: 0 });

      // The placeholder is only drawn, so it has no role to find it by.
      const field = rendered.host.querySelector<HTMLElement>(".field")!;
      expect(field.style.cssText).toBe("");
    });

    it("hands the game the room it measures", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      expect(rendered.game.rooms.at(-1)).toEqual(canvasOf(UPRIGHT));
    });

    it("hands the game the room it last measured as the scene is made, before the scene lays the field out", async () => {
      const { host, game, fake } = await renderBoard();
      // Measured, but not yet rendered, so only the scene's making hands
      // the game the room.
      layOut(host, UPRIGHT);

      await fake.host.latest.source();

      expect(game.rooms.at(-1)).toEqual(canvasOf(UPRIGHT));
    });

    it("lays the field out in the shape the game gives it, on the room the board measured", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, WIDE);
      const shape = fieldShape(canvasOf(UPRIGHT));

      rendered.game.shape.set(shape);
      rendered.detectChanges();

      expect(rendered.host.querySelector(".field")).toHaveStyle(
        cssRectStyle(fieldMetrics(canvasOf(WIDE), shape).framed),
      );
    });

    it("lays the ring and the card over the whole field", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      const { framed } = metricsOn(canvasOf(UPRIGHT));
      // The ring is only drawn, so it has no role to find it by.
      expect({
        ring: rendered.host.querySelector(".ring"),
        card: screen.getByRole("group", { name: "Card" }),
      }).toEqual({
        ring: expect.toHaveStyle(cssRectStyle(framed)) as unknown,
        card: expect.toHaveStyle(cssRectStyle(framed)) as unknown,
      });
    });

    it("lays the card under the lintel where the game holds it there", async () => {
      const rendered = await renderBoard();
      rendered.game.cardUnderLintel.set(true);

      measureAt(rendered, UPRIGHT);

      expect(screen.getByRole("group", { name: "Card" })).toHaveStyle(
        cssRectStyle(underTheLintel(metricsOn(canvasOf(UPRIGHT)))),
      );
    });

    it("lays the game's panels beside the field where the room spares them", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, WIDE);

      const { panels } = metricsOn(canvasOf(WIDE));
      expect({
        left: screen.getByRole("region", { name: "Left panel" }),
        right: screen.getByRole("region", { name: "Right panel" }),
      }).toEqual({
        left: expect.toHaveStyle(cssRectStyle(panels!.left)) as unknown,
        right: expect.toHaveStyle(cssRectStyle(panels!.right)) as unknown,
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
        card: application.queryByRole("group"),
        lintels: screen.getAllByText(/waiting$/).length,
        lintel: application.queryByText(/waiting$/),
      }).toEqual({
        panels: 2,
        inApplication: 0,
        card: null,
        // The lintel's count and the left panel's, both outside the
        // application.
        lintels: 2,
        lintel: null,
      });
    });

    it("stops watching the board once it is gone", async () => {
      const { destroy } = await renderBoard();

      destroy();

      expect(FakeResizeObserver.made.map((made) => made.watched.size)).toEqual([
        0,
      ]);
    });
  });

  describe("as the scene lays the field out", () => {
    watchResizes();

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

    it("publishes where the scene laid the field and the panels out, in the room it measured, for the layout check", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, WIDE);
      const canvas = canvasOf(WIDE);
      const laid = metricsOn(canvas);

      rendered.game.metrics.set(laid);
      rendered.detectChanges();

      const { dataset, style } = rendered.host;
      expect({
        field: dataset["field"],
        room: dataset["room"],
        panels: dataset["panels"],
        depth: dataset["depth"],
        across: style.getPropertyValue("--across"),
        down: Number(style.getPropertyValue("--down")),
      }).toEqual({
        field: rectAttribute(laid.framed),
        room: rectAttribute(cssRectOf(roomInside(canvas), 1)),
        panels: namedRectsAttribute([
          ["left", laid.panels!.left],
          ["right", laid.panels!.right],
        ]),
        depth: String(fieldShape(canvas).depth),
        across: String(COLUMNS),
        down: expect.closeTo(
          laid.framed.height / (laid.framed.width / COLUMNS),
          9,
        ) as unknown,
      });
    });

    it("publishes the room and the field's units down in CSS pixels on a canvas of two device pixels to one", async () => {
      const rendered = await renderBoard();
      vi.stubGlobal("devicePixelRatio", 2);
      measureAt(rendered, WIDE);
      const canvas = canvasOf(WIDE, 2);
      const laid = metricsOn(canvas);

      rendered.game.metrics.set(laid);
      rendered.detectChanges();

      const { dataset, style } = rendered.host;
      expect({
        room: dataset["room"],
        down: Number(style.getPropertyValue("--down")),
      }).toEqual({
        room: rectAttribute(cssRectOf(roomInside(canvas), 2)),
        down: expect.closeTo(
          laid.framed.height / (laid.framed.width / COLUMNS),
          9,
        ) as unknown,
      });
    });

    it("publishes no room once the board has none, as a hidden board's", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, UPRIGHT);
      rendered.game.metrics.set(metricsOn(canvasOf(UPRIGHT)));
      rendered.detectChanges();

      measureAt(rendered, { width: 0, height: 0 });

      expect(rendered.host.dataset["room"]).toBeUndefined();
    });

    it("publishes that the scene laid no panels out where the room spares none", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, UPRIGHT);

      rendered.game.metrics.set(metricsOn(canvasOf(UPRIGHT)));
      rendered.detectChanges();

      expect(rendered.host.dataset["panels"]).toBe("");
    });

    it("lays the field, the ring and the card where the scene drew the field, where it differs from the room the board measured", async () => {
      const rendered = await renderBoard();
      measureAt(rendered, UPRIGHT);
      const { framed } = metricsOn(canvasOf(WIDE));

      rendered.game.metrics.set(metricsOn(canvasOf(WIDE)));
      rendered.detectChanges();

      expect({
        field: rendered.host.querySelector(".field"),
        ring: rendered.host.querySelector(".ring"),
        card: screen.getByRole("group", { name: "Card" }),
      }).toEqual({
        field: expect.toHaveStyle(cssRectStyle(framed)) as unknown,
        ring: expect.toHaveStyle(cssRectStyle(framed)) as unknown,
        card: expect.toHaveStyle(cssRectStyle(framed)) as unknown,
      });
    });
  });

  describe("its lintel", () => {
    watchResizes();

    it("says how many rows wait, in the game's words, where the lintel lies over the ceiling's line", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      const { css, framed } = metricsOn(canvasOf(UPRIGHT));
      expect({
        count: lintel(),
        words: lintel().textContent.trim(),
      }).toEqual({
        count: expect.toHaveStyle(
          cssRectStyle({
            x: framed.x,
            y: framed.y,
            width: framed.width,
            height: css.y - framed.y - FRAME_CSS_PX,
          }),
        ) as unknown,
        words: "4 rows waiting",
      });
    });

    it("is read where nothing else in the page says how many rows wait", async () => {
      const rendered = await renderBoard();

      measureAt(rendered, UPRIGHT);

      expect(isInaccessible(lintel())).toBe(false);
    });

    it.each([
      {
        where: "the page says it outside the board",
        room: UPRIGHT,
        countShown: true,
      },
      {
        where: "the panels show beside the field",
        room: WIDE,
        countShown: false,
      },
    ])(
      "is hidden from assistive technology where $where",
      async ({ room, countShown }) => {
        const rendered = await renderBoard();
        rendered.game.countShown.set(countShown);

        measureAt(rendered, room);

        expect(isInaccessible(lintel())).toBe(true);
      },
    );
  });

  describe("as the canvas loses its WebGL context", () => {
    /** Raises a context event on the board, as the canvas inside it does; it doesn't bubble. */
    function raise(board: HTMLElement, type: string): void {
      board.dispatchEvent(new Event(type));
    }

    it("asks the game to pause, hands the card that the board is being restored, and says the graphics stopped", async () => {
      const { board, game, detectChanges } = await renderBoard();

      raise(board, "webglcontextlost");
      detectChanges();

      expect({
        losses: game.losses(),
        drawn: game.drawn(),
        card: screen.getByRole("group", { name: "Card" }),
        said: TestBed.inject(AnnouncerService).message(),
      }).toEqual({
        losses: 1,
        drawn: false,
        card: expect.toHaveTextContent("Restoring") as unknown,
        said: BOARD_CONTEXT_WORDS.lost,
      });
    });

    it("hands the board the focus from the card's button, so the page keeps it", async () => {
      const { board, detectChanges } = await renderBoard();
      screen.getByRole("button", { name: "Go on" }).focus();

      raise(board, "webglcontextlost");
      detectChanges();

      expect(board).toHaveFocus();
    });

    it("leaves the focus where it is when it isn't on the board", async () => {
      const { board, detectChanges } = await renderBoard();
      const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
      elsewhere.focus();

      raise(board, "webglcontextlost");
      detectChanges();

      expect(elsewhere).toHaveFocus();
    });

    it("lets the game go on as the board is back, and says so", async () => {
      const { board, game, detectChanges } = await renderBoard();
      raise(board, "webglcontextlost");
      detectChanges();

      raise(board, "webglcontextrestored");
      detectChanges();

      expect({
        drawn: game.drawn(),
        card: screen.getByRole("group", { name: "Card" }),
        said: TestBed.inject(AnnouncerService).message(),
      }).toEqual({
        drawn: true,
        card: expect.toContainElement(
          screen.getByRole("button", { name: "Go on" }),
        ) as unknown,
        said: BOARD_CONTEXT_WORDS.restored,
      });
    });

    it("stops listening once the board is gone", async () => {
      const { board, game, destroy } = await renderBoard();

      destroy();
      raise(board, "webglcontextlost");

      expect({
        losses: game.losses(),
        said: TestBed.inject(AnnouncerService).message(),
      }).toEqual({ losses: 0, said: "" });
    });
  });
});
