import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from "@angular/core";
import { count } from "@fz/core/format";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  CanvasCardsComponent,
  PhaserCanvasComponent,
  type SceneSource,
  boardHostOptions,
  canvasRoom,
} from "@fz/phaser/canvas";
import { cssHex } from "@fz/phaser/color";
import {
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import { COLUMNS } from "../../rules/tuning";
import type { Pictures } from "../../scene/pictures";
import type { WallSceneOptions } from "../../scene/wall_scene";
import {
  FRAME_CSS_PX,
  MARGIN_CSS_PX,
  fieldMetrics,
  hasRoom,
} from "../../view/field/field_metrics";
import { ComingNextComponent } from "../panels/coming_next.component";
import { InThisWallComponent } from "../panels/in_this_wall.component";
import { GameService } from "../play/game.service";
import { BoardCardComponent } from "./board_card.component";

/**
 * How long the scene's atlas must stay as it was last baked before the
 * pictures of it are handed on, in milliseconds: a resize under way bakes
 * it again at each new unit, and each picture handed on is encoded again.
 */
export const PICTURES_SETTLE_MS = 250;

/**
 * Shows the board: the canvas the scene draws the field on, which hears the
 * keys, the mouse and fingers while the board has the focus; a drawing of
 * the empty field in CSS, where the scene will draw it, until the scene has
 * drawn; on the lintel over the ceiling, how many rows wait; the panels
 * beside the field where the room spares them (Coming next and In this
 * wall); and the card over the field under the lintel (`<app-board-card>`),
 * which holds the canvas's own (`<fz-canvas-cards>`), that the board is
 * still loading on a slow connection, or that it couldn't be drawn.
 *
 * Only the canvas and its ring are an application to assistive technology,
 * so a screen reader hands it the keys rather than reading with them; the
 * canvas in it is hidden, the announcer says what happens, and the panels
 * and the card beside it read as a page does, as the lintel's count does
 * where nothing else in the page says it.
 *
 * It measures itself as it is first drawn and hands the game the room,
 * before the scene first lays the field out, so the scene's first frame
 * draws the field the placeholder drew.
 */
@Component({
  selector: "app-board",
  imports: [
    BoardCardComponent,
    CanvasCardsComponent,
    ComingNextComponent,
    InThisWallComponent,
    PhaserCanvasComponent,
  ],
  host: {
    "[attr.data-field]": "fieldRect()",
    "[attr.data-room]": "roomRect()",
    "[attr.data-panels]": "panelZones()",
    "[attr.data-outcome]": "game.outcome()",
    "[attr.data-wall]": "wallRow()",
    "[attr.data-depth]": "depth()",
    "[style.--across]": "across()",
    "[style.--down]": "down()",
    "[style.--pixel-ratio]": "pixelRatio()",
    "[style.--margin.px]": "marginCss()",
    "[style.--frame.px]": "frameCss",
    "[style.--lintel.px]": "shown()?.lintelCss",
    "[style.--band.px]": "shown()?.bandCss",
    "[style.--band-ink]": "bandInk()",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild.required(PhaserCanvasComponent);
  private readonly play = viewChild.required<ElementRef<HTMLElement>>("play");

  /**
   * The canvas the board makes, as the host sizes it, and the ratio it
   * renders at, as the board measures them as it is first drawn and as its
   * size or the zoom changes.
   */
  private readonly measured = canvasRoom();

  /** The canvas the board makes, as last measured, or null before it is. */
  private readonly room = this.measured.viewport;

  /**
   * The device pixels to a CSS pixel the canvas renders at, as the board
   * last measured it, or as the display has it until then, which the board
   * publishes for the layout check.
   */
  protected readonly pixelRatio = this.measured.pixelRatio;

  /**
   * How far in from each edge of the canvas the scene lays the field out,
   * in CSS pixels, which the stylesheet declares as the canvas's insets and
   * the cards keep around the field.
   */
  protected readonly marginCss = computed(() =>
    this.viewport.isCompact() ? MARGIN_CSS_PX.compact : MARGIN_CSS_PX.roomy,
  );

  /**
   * How thick the field's frame is, in CSS pixels, as the scene draws it,
   * for the placeholder's frame, the focus ring outside it and the size of
   * the lintel's count.
   */
  protected readonly frameCss = FRAME_CSS_PX;

  /** Names the board for the level on it, as "Brick Fuzz Pop, level 6: Zip line". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.level();
    return `Brick Fuzz Pop, level ${String(number)}: ${data.name}`;
  });

  /** Where the scene last laid the field out, or null before it has. */
  private readonly laid = this.game.metrics;

  /**
   * The room the board last measured, while it has room for a field: the
   * room it handed the game.
   */
  private readonly roomy = computed(() => {
    const room = this.room();
    return room && hasRoom(room) ? room : null;
  });

  /**
   * Where the placeholder lays the field out: on the room the board
   * measured, in the shape the game gives it, as the scene will; or null
   * before the board is measured, or while it has no room.
   */
  private readonly placeholder = computed(() => {
    const room = this.roomy();
    return room && fieldMetrics(room, this.game.shape());
  });

  /**
   * Where the field and the panels show: where the scene laid them out, or,
   * until it has, where it will, with the lintel's and the band's thickness
   * in CSS pixels for the placeholder, the lintel's count and the Ready
   * card's layer; or null before the board is measured, where the
   * stylesheet fills the board, the margin in.
   */
  protected readonly shown = computed(() => {
    const metrics = this.laid() ?? this.placeholder();
    if (!metrics) return null;
    const { css, framed, panels } = metrics;
    return {
      framed,
      panels,
      lintelCss: css.y - framed.y,
      bandCss: framed.y + framed.height - css.y - css.height,
    };
  });

  /**
   * Where the field lies on the board, from the lintel's top to the band's
   * bottom, in CSS pixels, for the placeholder, the focus ring and every
   * card but Ready.
   */
  protected readonly fieldStyle = computed(() => {
    const shown = this.shown();
    return shown ? cssRectStyle(shown.framed) : null;
  });

  /**
   * Where the lintel lies over the ceiling's line, in CSS pixels, for the
   * count of the rows waiting, or null before the board is measured.
   */
  protected readonly lintelStyle = computed(() => {
    const shown = this.shown();
    if (!shown) return null;
    const { x, y, width } = shown.framed;
    return cssRectStyle({
      x,
      y,
      width,
      height: shown.lintelCss - FRAME_CSS_PX,
    });
  });

  /** How many rows wait over the ceiling, as the lintel says it: "5 rows waiting", or "No rows waiting". */
  protected readonly rowsWaiting = computed(() => {
    const rows = this.game.rowsLeft();
    return rows === 0
      ? "No rows waiting"
      : `${count(rows, "row", "rows")} waiting`;
  });

  /**
   * Where the card lies over the field: the Ready card, held at its layer's
   * top, from the ceiling to the band's bottom, under the lintel, so it
   * never covers the count of the rows waiting; every other card, centered,
   * over the whole field, as tall as a Cleared card needs on a phone on its
   * side; or null before the board is measured.
   */
  protected readonly cardStyle = computed(() => {
    const shown = this.shown();
    if (!shown) return null;
    if (this.game.boardCard()?.kind !== "ready") {
      return cssRectStyle(shown.framed);
    }
    const { x, y, width, height } = shown.framed;
    return cssRectStyle({
      x,
      y: y + shown.lintelCss,
      width,
      height: height - shown.lintelCss,
    });
  });

  /** Where the panels lie beside the field, or null where the room spares none. */
  protected readonly panelStyles = computed(() => {
    const panels = this.shown()?.panels;
    return panels
      ? { left: cssRectStyle(panels.left), right: cssRectStyle(panels.right) }
      : null;
  });

  /**
   * Whether the lintel's count is hidden from assistive technology, as
   * "true" or null: where the page says it already, in Coming next beside
   * the field, or in the bar's Rows left, which the bar shows from the width
   * its actions keep their labels at, unless the window is compact, as
   * `BarComponent`'s `fitsEveryFigure` says.
   */
  protected readonly lintelHidden = computed(() =>
    this.panelStyles() !== null ||
    (!this.viewport.isCompact() && this.viewport.fitsActionLabels())
      ? "true"
      : null,
  );

  /**
   * Where the scene drew the field, from the lintel's top to the band's
   * bottom, for the layout check: x, y, width and height.
   */
  protected readonly fieldRect = computed(() => {
    const laid = this.laid();
    return laid ? rectAttribute(laid.framed) : null;
  });

  /**
   * The room inside the canvas's insets the board last measured and handed
   * the game, whose shape the field takes between rounds, for the layout
   * check, written as the field's rectangle is, once the scene has laid the
   * field out.
   */
  protected readonly roomRect = computed(() => {
    const room = this.roomy();
    return this.laid() && room
      ? rectAttribute(cssRectOf(roomInside(room), room.pixelRatio))
      : null;
  });

  /**
   * Where the scene laid the panels out, for the layout check, by their
   * names, as "left x y width height, right x y width height", or nothing
   * where the room spares none; or null before the scene has laid the
   * field out.
   */
  protected readonly panelZones = computed(() => {
    const laid = this.laid();
    if (!laid) return null;
    const { panels } = laid;
    return panels
      ? namedRectsAttribute([
          ["left", panels.left],
          ["right", panels.right],
        ])
      : "";
  });

  /**
   * The field row the wall's lowest row stands in, as the round aimed or in
   * play started, for the layout check, which holds it on the row a level
   * opens on at the field's depth while the level waits for its first shot.
   */
  protected readonly wallRow = computed(() => this.game.start().wall.lowestRow);

  /**
   * How many rows deep the scene laid the field out, for the layout check,
   * which holds it to the depth the room's shape asks for.
   */
  protected readonly depth = computed(() => {
    const laid = this.laid();
    return laid ? laid.height / laid.unit : null;
  });

  /** How many units across the scene drew the field, for the layout check. */
  protected readonly across = computed(() => (this.laid() ? COLUMNS : null));

  /**
   * How many units down the scene drew the field, for the layout check: its
   * depth, its band and its lintel, each in the whole device pixels it was
   * drawn in.
   */
  protected readonly down = computed(() => {
    const laid = this.laid();
    return laid ? (laid.framed.height * laid.pixelRatio) / laid.unit : null;
  });

  /** The ink the placeholder draws the lintel and the band in, as the scene does. */
  protected readonly bandInk = computed(() => cssHex(this.game.palette().band));

  /**
   * The pictures of every kind of brick the board last handed the game,
   * while the panels or the Ready card show them; else, or before the
   * scene has baked, null. Each bake's are encoded as they are first read,
   * so they are read only where they show.
   */
  protected readonly pictures = computed(() =>
    this.showsPictures() ? (this.game.pictures()?.() ?? null) : null,
  );

  /** Whether the panels show, or the Ready card shows the kind of brick a level brings in, each with its picture. */
  private readonly showsPictures = computed(() => {
    const card = this.game.boardCard();
    return (
      this.panelStyles() !== null ||
      (card?.kind === "ready" && card.newKind !== null)
    );
  });

  /** The timer that hands the game the last bake's pictures once the atlas settles. */
  private picturesTimer: ReturnType<typeof setTimeout> | undefined;

  /** Whether the board has handed the game any pictures yet. */
  private picturesHanded = false;

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: WallSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    view: () => this.game.view(),
    waitingX: () => this.game.waitingX(),
    boon: () => this.game.boon(),
    crew: () => this.game.crew(),
    guide: () => this.game.guide(),
    aimings: () => this.game.aimings(),
    palette: () => this.game.palette(),
    shape: () => this.game.shape(),
    motion: () => this.game.motion(),
    sound: () => this.game.sound(),
    onLayout: (metrics) => {
      this.game.onLayout(metrics);
    },
    command: (command) => {
      this.game.fieldCommand(command);
    },
    onPictures: (pictures) => {
      this.takePictures(pictures);
    },
  };

  /**
   * Loads the scene, and Phaser with it, only once the canvas asks, so the
   * shell paints first; and hands the game the room the board last
   * measured as it makes it, so the field's first layout is on that room.
   */
  protected readonly scene: SceneSource = async () => {
    const { makeWallScene } = await import("../../scene/wall_scene");
    const room = this.room();
    if (room) this.game.setRoom(room);
    return makeWallScene(this.sceneOptions);
  };

  protected readonly hostOptions = boardHostOptions(
    "Brick Fuzz Pop",
    this.host.nativeElement,
  );

  constructor() {
    // Nothing goes on before the scene that moves it is drawn. After
    // rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
    // The game takes the room's shape between rounds, as it judges.
    effect(() => {
      const room = this.room();
      if (!room) return;
      untracked(() => {
        this.game.setRoom(room);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.picturesTimer);
    });
  }

  /** Puts the focus on the board after Angular's next render, as a run begins. */
  focus(options?: FocusOptions): void {
    afterNextRender(
      () => {
        this.play().nativeElement.focus(options);
      },
      { injector: this.injector },
    );
  }

  /**
   * Takes the focus for a press on the board, which Phaser's pointer
   * otherwise keeps from it, so the keys work after a tap or a click.
   */
  protected takeFocus(): void {
    this.play().nativeElement.focus({ preventScroll: true });
  }

  /** Goes on with the paused level, as the Paused card's Resume asks. */
  protected resumeRun(): void {
    this.takeFocusBack();
    this.game.resume();
  }

  /** Goes on to the next level, as the Cleared card's Next level asks. */
  protected nextLevel(): void {
    this.takeFocusBack();
    this.game.nextLevel();
  }

  /** Tries the lost level again, as the Ended card asks. */
  protected tryAgain(): void {
    this.takeFocusBack();
    this.game.tryAgain();
  }

  /** Starts a new game, as the Ended card asks once every level is cleared. */
  protected newGame(): void {
    this.takeFocusBack();
    void this.game.newGame();
  }

  /**
   * Takes the focus back from a card's button, which held it and goes with
   * the card, before the game moves on.
   */
  private takeFocusBack(): void {
    this.play().nativeElement.focus();
  }

  /**
   * Hands the game the pictures of the atlas the scene baked: the first at
   * once, each later one once the atlas has stayed as it is for
   * {@link PICTURES_SETTLE_MS}, so a resize under way, which bakes it at
   * each new unit, has nothing encoded until it stops.
   */
  private takePictures(pictures: () => Pictures): void {
    clearTimeout(this.picturesTimer);
    if (!this.picturesHanded) {
      this.picturesHanded = true;
      this.game.onPictures(pictures);
      return;
    }
    this.picturesTimer = setTimeout(() => {
      this.game.onPictures(pictures);
    }, PICTURES_SETTLE_MS);
  }
}
