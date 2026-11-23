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
  input,
  output,
  type Signal,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import type { RunStage } from "@fz/core/run";
import {
  PhaserCanvasComponent,
  type SceneSource,
  boardHostOptions,
  canvasRoom,
} from "@fz/phaser/canvas";
import { cssHex } from "@fz/phaser/color";
import {
  type Viewport,
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import { AnnouncerService } from "@fz/ui/announcer";
import { COLUMNS } from "../../rules/field";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  type FieldShape,
  MARGIN_CSS_PX,
  fieldMetrics,
  hasRoom,
} from "../../view/field_metrics";
import type { WallPalette } from "../../view/palette";

/** Holds a place on a wall game's board, as the style that lays an element there, in CSS pixels. */
export type BoardPlace = Readonly<Record<string, string>>;

/** Describes where a wall game's board lays its panels, beside the field. */
export interface WallBoardPanels {
  readonly left: BoardPlace;
  readonly right: BoardPlace;
}

/** What the announcer says as the board's WebGL context is lost, and as it is back. */
export const BOARD_CONTEXT_WORDS = {
  lost: "The graphics stopped. The game is paused until they come back.",
  restored: "The graphics are back.",
} as const;

/**
 * Shows a wall game's board: the canvas the scene draws the field on, which
 * hears the keys, the mouse and fingers while the board has the focus; a
 * drawing of the empty field in CSS, where the scene will draw it, until
 * the scene has drawn; on the lintel over the ceiling, how many rows wait;
 * and the game's own panels and card, its content, which it lays where
 * the board says, beside the field (`panels`) and over it (`cardPlace`).
 *
 * Only the canvas and its ring are an application to assistive technology,
 * named by the label the game gives and described by its keys, so a screen
 * reader hands it the keys rather than reading with them; the canvas in it
 * is hidden, and the panels and the card beside it read as a page does, as
 * the lintel's count does where nothing else in the page says it.
 *
 * It measures itself as it is first drawn and hands the game the room
 * (`room`), and again as the scene is made, so the scene's first frame
 * draws the field the placeholder drew. It publishes where the scene laid
 * the field out, in `data-*` attributes, for the layout check.
 */
@Component({
  selector: "fz-wall-board",
  imports: [PhaserCanvasComponent],
  host: {
    "[attr.data-field]": "fieldRect()",
    "[attr.data-room]": "roomRect()",
    "[attr.data-panels]": "panelZones()",
    "[attr.data-outcome]": "outcome()",
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
  templateUrl: "./wall_board.component.html",
  styleUrl: "./wall_board.component.scss",
})
export class WallBoardComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly announcer = inject(AnnouncerService);
  private readonly play = viewChild.required<ElementRef<HTMLElement>>("play");

  /** The canvas, whose own cards (`<fz-canvas-cards>`) the game's card shows over the field. */
  readonly canvas = viewChild.required(PhaserCanvasComponent);

  /** The game's name, which the canvas gives as its title. */
  readonly name = input.required<string>();

  /** What the application is called, such as the game and the level on it. */
  readonly label = input.required<string>();

  /** The keys needed to play, one to an item, which describe the application. */
  readonly keys = input.required<readonly string[]>();

  /** Loads the scene the canvas draws, and Phaser with it, once the canvas asks. */
  readonly scene = input.required<SceneSource>();

  /** Where the scene last laid the field and its panels out, or null before it has. */
  readonly metrics = input.required<FieldMetrics | null>();

  /** The field's shape, in which the placeholder lays it out until the scene has. */
  readonly shape = input.required<FieldShape>();

  /** The colors the field is drawn in, whose band's ink the placeholder takes. */
  readonly palette = input.required<WallPalette>();

  /** Where the run stands, for the layout check. */
  readonly outcome = input.required<RunStage>();

  /**
   * The field row the wall's lowest row stands in, as the round aimed or in
   * play started, for the layout check.
   */
  readonly wallRow = input.required<number>();

  /** How many rows wait over the ceiling, in the game's words, as the lintel says it. */
  readonly waiting = input.required<string>();

  /**
   * Whether the page says how many rows wait outside the board, as a bar
   * showing every figure does, so the lintel's count needn't be read.
   */
  readonly countShown = input(false);

  /** Whether the screen is compact, where the field keeps a smaller margin. */
  readonly compact = input(false);

  /**
   * Whether the card lies under the lintel, held at its layer's top, as a
   * card that must never cover the count of the rows waiting does, rather
   * than over the whole field.
   */
  readonly cardUnderLintel = input(false);

  /** Emitted with the canvas the board makes, inside its insets, as it measures it and as the scene is made. */
  readonly room = output<Viewport>();

  /** Emitted with whether the scene is drawn, which nothing goes on before. */
  readonly drawn = output<boolean>();

  /** Emitted as the canvas loses its WebGL context, for the game to pause the run. */
  readonly contextLost = output();

  /**
   * The canvas the board makes, as the host sizes it, and the ratio it
   * renders at, as the board measures them as it is first drawn and as its
   * size or the zoom changes.
   */
  private readonly measured = canvasRoom();

  /** The canvas the board makes, as last measured, or null before it is. */
  private readonly measuredRoom = this.measured.viewport;

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
    this.compact() ? MARGIN_CSS_PX.compact : MARGIN_CSS_PX.roomy,
  );

  /**
   * How thick the field's frame is, in CSS pixels, as the scene draws it,
   * for the placeholder's frame, the focus ring outside it and the size of
   * the lintel's count.
   */
  protected readonly frameCss = FRAME_CSS_PX;

  /**
   * The room the board last measured, while it has room for a field: the
   * room it handed the game.
   */
  private readonly roomy = computed(() => {
    const room = this.measuredRoom();
    return room && hasRoom(room) ? room : null;
  });

  /**
   * Where the placeholder lays the field out: on the room the board
   * measured, in the shape the game gives it, as the scene will; or null
   * before the board is measured, or while it has no room.
   */
  private readonly placeholder = computed(() => {
    const room = this.roomy();
    return room && fieldMetrics(room, this.shape());
  });

  /**
   * Where the field and the panels show: where the scene laid them out, or,
   * until it has, where it will, with the lintel's and the band's thickness
   * in CSS pixels for the placeholder, the lintel's count and a card held
   * under the lintel; or null before the board is measured, where the
   * stylesheet fills the board, the margin in.
   */
  protected readonly shown = computed(() => {
    const metrics = this.metrics() ?? this.placeholder();
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
   * bottom, in CSS pixels, for the placeholder, the focus ring and a card
   * over the whole field.
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

  /**
   * Where the game's card lies over the field: over the whole field, as
   * tall as a card needs on a phone on its side, or, where the game holds
   * it under the lintel, from the ceiling to the band's bottom, so a card
   * held at its layer's top never covers the count of the rows waiting; or
   * null before the board is measured, where the card fills the board.
   */
  readonly cardPlace = computed((): BoardPlace | null => {
    const shown = this.shown();
    if (!shown) return null;
    if (!this.cardUnderLintel()) return cssRectStyle(shown.framed);
    const { x, y, width, height } = shown.framed;
    return cssRectStyle({
      x,
      y: y + shown.lintelCss,
      width,
      height: height - shown.lintelCss,
    });
  });

  /** Where the game's panels lie beside the field, or null where the room spares none, where the game shows none. */
  readonly panels = computed((): WallBoardPanels | null => {
    const panels = this.shown()?.panels;
    return panels
      ? { left: cssRectStyle(panels.left), right: cssRectStyle(panels.right) }
      : null;
  });

  /**
   * Whether the lintel's count is hidden from assistive technology, as
   * "true" or null: where the page says it already, in the panels beside
   * the field or outside the board.
   */
  protected readonly lintelHidden = computed(() =>
    this.panels() !== null || this.countShown() ? "true" : null,
  );

  /**
   * Where the scene drew the field, from the lintel's top to the band's
   * bottom, for the layout check: x, y, width and height.
   */
  protected readonly fieldRect = computed(() => {
    const laid = this.metrics();
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
    return this.metrics() && room
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
    const laid = this.metrics();
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
   * How many rows deep the scene laid the field out, for the layout check,
   * which holds it to the depth the room's shape asks for.
   */
  protected readonly depth = computed(() => {
    const laid = this.metrics();
    return laid ? laid.height / laid.unit : null;
  });

  /** How many units across the scene drew the field, for the layout check. */
  protected readonly across = computed(() => (this.metrics() ? COLUMNS : null));

  /**
   * How many units down the scene drew the field, for the layout check: its
   * depth, its band and its lintel, each in the whole device pixels it was
   * drawn in.
   */
  protected readonly down = computed(() => {
    const laid = this.metrics();
    return laid ? (laid.framed.height * laid.pixelRatio) / laid.unit : null;
  });

  /** The ink the placeholder draws the lintel and the band in, as the scene does. */
  protected readonly bandInk = computed(() => cssHex(this.palette().band));

  /**
   * Loads the scene, once the canvas asks, so the shell paints first, and
   * hands the game the room the board last measured before the scene is
   * made, so the field's first layout is on that room.
   */
  protected readonly source: SceneSource = async () => {
    const make = await this.scene()();
    const room = this.measuredRoom();
    if (room) this.room.emit(room);
    return make;
  };

  /** What the canvas is handed: the game's name, the board's element hearing the keys. */
  protected readonly hostOptions = computed(() =>
    boardHostOptions(this.name(), this.host.nativeElement),
  );

  /**
   * Whether the canvas has lost its WebGL context, which leaves the field
   * blank, and the browser has yet to restore it.
   */
  private readonly restoringState = signal(false);

  /**
   * Whether the canvas has lost its WebGL context and the browser has yet
   * to restore it, as the game's card says in place of its own.
   */
  readonly restoring: Signal<boolean> = this.restoringState.asReadonly();

  constructor() {
    // Nothing goes on before the scene that moves it is drawn, nor while
    // the board can't draw it. After rendering, since the canvas's state
    // needs the scene it is given.
    afterRenderEffect(() => {
      this.drawn.emit(this.canvas().state() === "ready" && !this.restoring());
    });
    this.watchContext();
    // The game takes the room's shape between rounds, as it judges.
    effect(() => {
      const room = this.measuredRoom();
      if (!room) return;
      untracked(() => {
        this.room.emit(room);
      });
    });
  }

  /**
   * Asks the game to pause as the canvas loses its WebGL context, handing
   * the card that the board is being restored, and takes that away as the
   * browser restores it, the run left paused for the player to go on; the
   * announcer says each. The restoring card puts away the one shown, so the
   * board takes the focus from a button on it, which would leave the page
   * with none.
   */
  private watchContext(): void {
    const host = this.host.nativeElement;
    const gone = new AbortController();
    inject(DestroyRef).onDestroy(() => {
      gone.abort();
    });
    // The canvas's context events don't bubble, so the board hears them on
    // their way down to it.
    const heard = { capture: true, signal: gone.signal };
    host.addEventListener(
      "webglcontextlost",
      () => {
        // On a card's button, which goes, or on the board, which keeps it.
        if (host.contains(host.ownerDocument.activeElement)) {
          this.takeFocus();
        }
        this.restoringState.set(true);
        this.contextLost.emit();
        this.announcer.say(BOARD_CONTEXT_WORDS.lost);
      },
      heard,
    );
    host.addEventListener(
      "webglcontextrestored",
      () => {
        this.restoringState.set(false);
        this.announcer.say(BOARD_CONTEXT_WORDS.restored);
      },
      heard,
    );
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
   * Puts the focus on the board at once, as a card's button that held it
   * goes with the card, before the game moves on.
   */
  takeFocus(): void {
    this.play().nativeElement.focus();
  }

  /**
   * Takes the focus for a press on the board, which Phaser's pointer
   * otherwise keeps from it, so the keys work after a tap or a click.
   */
  protected takeFocusForPress(): void {
    this.play().nativeElement.focus({ preventScroll: true });
  }
}
