import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  type Signal,
  signal,
  viewChild,
} from "@angular/core";
import {
  CanvasCardsComponent,
  PhaserCanvasComponent,
  type SceneSource,
  boardHostOptions,
  canvasRoom,
  settledPictures,
} from "@fz/phaser/canvas";
import {
  type CssRect,
  PANEL_GAP_CSS_PX,
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import type { FuzzFluxSceneOptions } from "../../scene/fuzz_flux_scene";
import type { Pictures } from "../../scene/pictures";
import { type BoardMetrics, boardMetrics } from "../../view/board/metrics";
import { BOARD_ROLES, boardPalette } from "../../view/colors/palette";
import { GameService } from "../play/game.service";
import { BoardGridComponent } from "./board_grid.component";

/** The narrowest the room left of the board shows anything in, in CSS pixels: a short word or two of the line about a new thing. */
const LEAST_BESIDE_CSS_PX = 80;

/**
 * Shows the board: the canvas the scene draws the level on, which hears the
 * keys, the mouse and fingers while the board has the focus; the level's
 * squares drawn in CSS, where the scene will draw them, until it has; the
 * grid of its squares over the canvas where the scene laid the board out,
 * which takes the focus and lets the pointer through; and the canvas's own
 * cards (`<fz-canvas-cards>`), that the board is still loading on a slow
 * connection, or that it couldn't be drawn.
 *
 * The grid is what assistive technology reads of the board, and the canvas
 * under it is hidden; the announcer says what happens.
 *
 * It says where the scene laid the board, its room and the panels out, the
 * level in play and how it stands, for the layout check
 * (`tools/check-layout.mjs`).
 */
@Component({
  selector: "app-board",
  imports: [BoardGridComponent, CanvasCardsComponent, PhaserCanvasComponent],
  host: {
    "[style.--across]": "grid().width",
    "[style.--down]": "grid().height",
    "[style.--pixel-ratio]": "pixelRatio()",
    "[attr.data-board]": "boardRect()",
    "[attr.data-room]": "roomRect()",
    "[attr.data-panels]": "panelZones()",
    "[attr.data-level]": "game.inPlay().level.number",
    "[attr.data-outcome]": "game.outcome()",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly theme = inject(ThemeService);
  private readonly roles = this.theme.roles(BOARD_ROLES);
  private readonly boardGrid = viewChild.required(BoardGridComponent);
  protected readonly canvas = viewChild.required(PhaserCanvasComponent);

  /** Each goal's picture on the page, in the level's order, which a fuzzball's copy flies to. */
  readonly goalPictures = input<readonly Element[]>([]);

  /** Whether the player wants sound. */
  readonly sound = input(true);

  /** The board of the level in play, as the screen shows it, a new value only as a move is made. */
  protected readonly grid = computed(() => this.game.state().grid);

  /** Whether each square of the board holds a well, in reading order, as the placeholder draws them: a gap holds none. */
  protected readonly wells = computed(() =>
    this.grid().squares.map((square) => square !== null),
  );

  /**
   * The canvas the board makes, as the host sizes it, and the ratio it
   * renders at, as the board measures them as it is first drawn and as its
   * size or the zoom changes.
   */
  private readonly measured = canvasRoom();

  /**
   * The device pixels to a CSS pixel the canvas renders at, as the board
   * last measured it, or as the display has it until then, which the board
   * publishes for the layout check.
   */
  protected readonly pixelRatio = this.measured.pixelRatio;

  /** Where the scene last laid the board out, or null before it has. */
  private readonly laidOut = signal<BoardMetrics | null>(null);

  /**
   * Where the board shows: where the scene laid it out, or, until it has,
   * where it will on the canvas the board measured; or null before the
   * board is measured.
   */
  private readonly shown = computed(() => {
    const laid = this.laidOut();
    if (laid !== null) return laid;
    const room = this.measured.viewport();
    if (room === null) return null;
    const { width, height } = this.grid();
    return boardMetrics(room, width, height);
  });

  /**
   * Where the scene laid the board out, for the layout check, as "x y width
   * height" in CSS pixels, or null before it has.
   */
  protected readonly boardRect = computed(() => {
    const laid = this.laidOut();
    return laid && rectAttribute(laid.css);
  });

  /**
   * The room inside the canvas's chrome the board was last measured in, for
   * the layout check, written as the board's rectangle is, once the scene
   * has laid the board out.
   */
  protected readonly roomRect = computed(() => {
    const room = this.measured.viewport();
    return this.laidOut() && room
      ? rectAttribute(cssRectOf(roomInside(room), room.pixelRatio))
      : null;
  });

  /**
   * Where the scene laid the panels out, for the layout check, by their
   * names, as "left x y width height, right x y width height", or nothing
   * where the room spares none; or null before it has laid the board out.
   */
  protected readonly panelZones = computed(() => {
    const laid = this.laidOut();
    if (laid === null) return null;
    const { panels } = laid;
    return panels
      ? namedRectsAttribute([
          ["left", panels.left],
          ["right", panels.right],
        ])
      : "";
  });

  /** Where the game's panels lie beside the board, or null where the room spares none. */
  readonly panels = computed(() => {
    const panels = this.shown()?.panels;
    return panels
      ? { left: cssRectStyle(panels.left), right: cssRectStyle(panels.right) }
      : null;
  });

  /**
   * Where the room left of the board lies, where the room spares no panels:
   * {@link PANEL_GAP_CSS_PX} in from the canvas's edge and from the board,
   * as tall as the board and level with it; or null where there are panels,
   * before the board is measured, or where it is narrower than
   * {@link LEAST_BESIDE_CSS_PX}.
   */
  readonly besideBoard = computed(() => {
    const shown = this.shown();
    // Unmeasured, the board has no room yet; beside panels, none spare.
    if (shown?.panels !== null) return null;
    const { x, y, height } = shown.css;
    const width = x - 2 * PANEL_GAP_CSS_PX;
    return width < LEAST_BESIDE_CSS_PX
      ? null
      : cssRectStyle({ x: PANEL_GAP_CSS_PX, y, width, height });
  });

  /**
   * Where each goal's picture lies, in CSS pixels from the canvas's top
   * left corner, as the board last measured them, which the scene's copies
   * fly to: the same list until the board measures them again.
   */
  private goals: readonly CssRect[] = [];

  /**
   * Where the board lies on the canvas, in CSS pixels, for the placeholder
   * and the grid, or null where the stylesheet fills the canvas.
   */
  protected readonly boardStyle = computed(() => {
    const shown = this.shown();
    return shown && cssRectStyle(shown.css);
  });

  /** The pictures of the pieces the scene last baked, or null before it has. */
  private readonly picturesState = signal<(() => Pictures) | null>(null);

  /**
   * The pictures of the pieces the scene last baked, as the bar and How to
   * play show them, or null before it has.
   *
   * They are kept here, beside the scene that bakes them, rather than on the
   * game, which has nothing else to do with how the pieces are drawn.
   */
  readonly pictures: Signal<(() => Pictures) | null> =
    this.picturesState.asReadonly();

  /** Hands on the pictures of each bake of the scene's atlas: the first at once, and a later one once the atlas has settled. */
  private readonly takePictures = settledPictures<() => Pictures>(
    (pictures) => {
      this.picturesState.set(pictures);
    },
  );

  /** The board's colors, from the palette on the page, a new value only as the board's roles or the mode change. */
  private readonly palette = computed(() =>
    boardPalette(this.roles(), this.theme.mode()),
  );

  /** What the scene is handed: plain functions over the game and the board. */
  private readonly sceneOptions: FuzzFluxSceneOptions = {
    tick: (nowMs, playedMs) => {
      this.game.tick(nowMs, playedMs);
    },
    play: () => this.game.play(),
    palette: () => this.palette(),
    onLayout: (metrics) => {
      this.laidOut.set(metrics);
    },
    picking: () => this.game.picking(),
    ring: () => this.game.ring(),
    command: (command) => {
      this.game.boardCommand(command);
    },
    onPictures: (pictures) => {
      this.takePictures(pictures);
    },
    goals: () => this.goals,
    hand: () => this.game.hand(),
    sound: () => this.sound(),
    cues: () => this.game.cues(),
  };

  /**
   * Loads the scene, and Phaser with it, only once the canvas asks, so the
   * shell paints first, with the view's parts it hands the game as it makes
   * each scene.
   */
  protected readonly scene: SceneSource = async () => {
    const [{ makeFuzzFluxScene }, { VIEW_KIT }] = await Promise.all([
      import("../../scene/fuzz_flux_scene"),
      import("../play/view_kit"),
    ]);
    const make = makeFuzzFluxScene(this.sceneOptions);
    return (surroundings) => {
      this.game.useView(VIEW_KIT);
      return make(surroundings);
    };
  };

  /** What the canvas is handed: the game's name, the board's element hearing the keys. */
  protected readonly hostOptions = boardHostOptions(
    "Fuzz Flux",
    this.host.nativeElement,
  );

  constructor() {
    // Nothing goes on before the scene that plays it is drawn. After
    // rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
    // Each picture moves as the board is laid out again and as a count
    // beside it changes width, as the bar and the panel show the state.
    afterRenderEffect({
      read: () => {
        this.shown();
        this.game.state();
        this.measureGoals(this.goalPictures());
      },
    });
  }

  /** Measures where each goal's picture lies from the canvas's top left corner. */
  private measureGoals(pictures: readonly Element[]): void {
    const origin = this.host.nativeElement.getBoundingClientRect();
    this.goals = pictures.map((picture) => {
      const { x, y, width, height } = picture.getBoundingClientRect();
      return { x: x - origin.x, y: y - origin.y, width, height };
    });
  }

  /** Puts the focus on the board's tab stop after Angular's next render, as a level begins. */
  focus(options?: FocusOptions): void {
    afterNextRender(
      () => {
        this.boardGrid().focus(options);
      },
      { injector: this.injector },
    );
  }

  /**
   * Takes the focus for a press on the board, which Phaser's pointer
   * otherwise keeps from it, so the keys work after a tap or a click; with
   * no ring, which shows for the keys alone.
   */
  protected takeFocusForPress(): void {
    this.boardGrid().focus({ preventScroll: true, focusVisible: false });
  }

  /** Hands the grid's tab stop the focus that lands on the board itself, as a script's may. */
  protected passFocusToGrid(): void {
    this.boardGrid().focus();
  }
}
