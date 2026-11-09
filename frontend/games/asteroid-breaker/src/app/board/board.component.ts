import { DOCUMENT } from "@angular/common";
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
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  CanvasCardsComponent,
  PhaserCanvasComponent,
  type SceneSource,
  canvasRoom,
} from "@fz/phaser/canvas";
import type { HostOptions } from "@fz/phaser/host";
import {
  type CssRect,
  type Viewport,
  namedRectsAttribute,
  rectAttribute,
} from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import type { Torus } from "../../rules/torus";
import type { BeltSceneOptions } from "../../scene/belt_scene";
import type { Pictures } from "../../view/art/art";
import {
  POINTS_CHARACTERS,
  type PointsFont,
  pointsFace,
} from "../../view/art/points_art";
import {
  type BoardSetting,
  FRAME_CSS_PX,
  type FieldLayout,
  MARGIN_CSS_PX,
  type PixelRect,
  fieldMetrics,
  fieldShape,
} from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BoardCardComponent } from "./board_card.component";
import { fieldPalette } from "./field_palette";

/**
 * How long the board waits for the page to load the points' face before the
 * scene starts without it, in milliseconds; the scene writes them again in
 * it once it arrives.
 */
export const POINTS_FACE_WAIT_MS = 1500;

/** The characters the points are written in, which the page loads their face for. */
const POINTS_SAMPLE = POINTS_CHARACTERS.join("");

/**
 * Shows the board: the canvas the scene draws the field and the deck on,
 * which hears the keys, the mouse and fingers while the board has the focus,
 * a drawing of the empty field in CSS, where the scene will draw it, clear
 * of the deck's room, until the scene has drawn, and the card over the
 * field (`<app-board-card>`), told how the ship flies, which holds the
 * canvas's own (`<fz-canvas-cards>`), that the board is still loading on a
 * slow connection, or that it couldn't be drawn.
 *
 * The board is an application to assistive technology, so a screen reader
 * hands it the keys rather than reading with them; the canvas in it is
 * hidden, and the announcer says what happens.
 */
@Component({
  selector: "app-board",
  imports: [BoardCardComponent, CanvasCardsComponent, PhaserCanvasComponent],
  host: {
    tabindex: "0",
    role: "application",
    "aria-roledescription": "game board",
    "[attr.aria-label]": "label()",
    "aria-describedby": "board-keys",
    "[attr.data-field]": "fieldRect()",
    "[attr.data-room]": "roomRect()",
    "[attr.data-deck]": "deckZones()",
    "[style.--across]": "laid()?.torus.width",
    "[style.--down]": "laid()?.torus.height",
    "[style.--pixel-ratio]": "pixelRatio()",
    "[attr.data-outcome]": "game.outcome()",
    "[class.in-play]": "inPlay()",
    "[style.--margin.px]": "board().marginCss",
    "[style.--frame.px]": "frameCss",
    "(pointerdown)": "takeFocus()",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService).settings;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required(PhaserCanvasComponent);

  /**
   * The canvas the board makes, as the host sizes it, and the ratio it
   * renders at, as the board measures them as it is first drawn and as its
   * size or the zoom changes.
   */
  private readonly measured = canvasRoom();

  /**
   * The device pixels to a CSS pixel the canvas renders at, as the board
   * last measured it, or as the display has it until then: the ratio the
   * placeholder lays the field out at, in whole device pixels as the scene
   * does, which the board publishes for the layout check.
   */
  protected readonly pixelRatio = this.measured.pixelRatio;

  /**
   * How thick the field's frame is, in CSS pixels, as the scene draws it,
   * for the placeholder's frame and the focus ring outside it.
   */
  protected readonly frameCss = FRAME_CSS_PX;

  /**
   * The settings the board lays the field and the deck out by, each a
   * signal of its own, so another setting changed lays nothing out again.
   */
  private readonly deckShowing = computed(() => this.settings().deck);
  private readonly stickOnRight = computed(() => this.settings().stickOnRight);
  private readonly fireByItself = computed(() => this.settings().fireByItself);

  /**
   * How the board lays the field and the deck out, as the settings say: the
   * deck where they have it show, on a touch screen unless they say
   * otherwise. Its margin is the stylesheet's too, which the cards keep.
   */
  protected readonly board = computed<BoardSetting>(() => {
    const deck = this.deckShowing();
    const stickOnRight = this.stickOnRight();
    const fireByItself = this.fireByItself();
    return {
      marginCss: this.viewport.isCompact()
        ? MARGIN_CSS_PX.compact
        : MARGIN_CSS_PX.roomy,
      deck:
        deck === "always" || (deck === "auto" && this.viewport.isTouchScreen()),
      stickOnRight,
      fireByItself,
    };
  });

  /** The canvas the board makes, as last measured, or null before it is. */
  private readonly room = this.measured.viewport;

  /** Names the board for the wave on it, as "Asteroid Breaker, wave 4: Thaw". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.wave();
    return `Asteroid Breaker, wave ${String(number)}: ${data.name}`;
  });

  /** Whether a ship flies, over which the pointer marks where the mouse aims it. */
  protected readonly inPlay = computed(() => this.game.outcome() === "playing");

  /** How the scene last laid the field and the deck out, or null before it has. */
  protected readonly laid = signal<FieldLayout | null>(null);

  /** The field's rectangle, for the layout check: x, y, width and height. */
  protected readonly fieldRect = computed(() => {
    const laid = this.laid();
    return laid ? rectAttribute(laid.metrics.css) : null;
  });

  /**
   * The room the field fills inside its frame, for the layout check, written as
   * the field's rectangle is.
   */
  protected readonly roomRect = computed(() => {
    const laid = this.laid();
    return laid
      ? rectAttribute(inCss(laid.metrics.room, laid.viewport.pixelRatio))
      : null;
  });

  /**
   * Where the deck's zones lie, for the layout check: each by its name and
   * its rectangle, as "stick x y width height, buttons x y width height";
   * or null where the deck doesn't show.
   */
  protected readonly deckZones = computed(() => {
    const laid = this.laid();
    if (!laid?.deck) return null;
    const { stick, buttons } = laid.deck;
    const { pixelRatio } = laid.viewport;
    return namedRectsAttribute([
      ["stick", inCss(stick, pixelRatio)],
      ["buttons", inCss(buttons, pixelRatio)],
    ]);
  });

  /**
   * Where the field lies on the board, in CSS pixels: where the scene drew
   * it, or, until then, where it will, for the placeholder, the focus ring
   * and the cards; or null before the board is measured, where the
   * stylesheet fills the board.
   */
  protected readonly fieldStyle = computed(() => {
    const rect = this.laid()?.metrics.css ?? this.placeholderField();
    return rect && rectStyle(rect);
  });

  /** The field's colors, from the palette on the page. */
  private readonly palette = fieldPalette(inject(ThemeService));

  /** Asks the scene for its pictures of the atlas it last baked, or null before it has baked. */
  private readonly askPictures = signal<(() => Pictures) | null>(null);

  /**
   * The pictures of every rock kind, pickup, a stray and the comet as the
   * scene last drew them, for How to play, or null before it has drawn.
   *
   * The scene encodes them as this is first read after each bake, so only
   * How to play reads it, as it opens.
   */
  readonly pictures = computed(() => this.askPictures()?.() ?? null);

  /**
   * The font the points are written in: the board's, a new record as the page
   * loads their face late.
   */
  private readonly pointsFont = signal<PointsFont>({ family: "sans-serif" });

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: BeltSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    frame: () => this.game.frame(),
    palette: () => this.palette(),
    motion: () => this.viewport.allowsMotion(),
    sound: () => this.settings().sound,
    thrusting: () => this.game.thrusting(),
    board: () => this.board(),
    onLayout: (layout) => {
      this.laid.set(layout);
      this.game.setRoom(layout.viewport, this.board());
    },
    command: (command) => {
      this.game.command(command);
    },
    onPictures: (pictures) => {
      this.askPictures.set(pictures);
    },
    font: () => this.pointsFont(),
  };

  /**
   * Loads the scene, and Phaser with it, only once the canvas asks, so the
   * shell paints first, and the face the points are written in beside it.
   */
  protected readonly scene: SceneSource = async () => {
    const [{ makeBeltScene }] = await Promise.all([
      import("../../scene/belt_scene"),
      this.loadPointsFace(),
    ]);
    return makeBeltScene(this.sceneOptions);
  };

  /**
   * Sets Phaser up for the board: keys heard only on the board's element,
   * the mouse and fingers for steering, the right button's menu kept shut,
   * as it thrusts, and nothing from a gamepad.
   */
  protected readonly hostOptions: HostOptions = {
    title: "Asteroid Breaker",
    // The page shows through until the scene draws, so nothing flashes.
    background: "transparent",
    config: {
      banner: false,
      autoFocus: false,
      disableContextMenu: true,
      render: {
        antialias: true,
        roundPixels: false,
        powerPreference: "low-power",
      },
      input: {
        keyboard: { target: this.host.nativeElement },
        mouse: true,
        touch: true,
        gamepad: false,
      },
      fps: { smoothStep: true },
    },
  };

  constructor() {
    // Nothing goes on before the scene that moves it is drawn. After
    // rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
    this.shapeForTheRoom();
  }

  /** Puts the focus on the board after Angular's next render, as a run begins. */
  focus(options?: FocusOptions): void {
    afterNextRender(
      () => {
        this.host.nativeElement.focus(options);
      },
      { injector: this.injector },
    );
  }

  /**
   * Takes the focus back as the player goes on from a card, whose button
   * held it and goes with the card.
   */
  protected takeFocusBack(): void {
    this.host.nativeElement.focus();
  }

  /**
   * Takes the focus for a press on the board, which Phaser's pointer
   * otherwise keeps from it, so the keys work after a tap or a click.
   */
  protected takeFocus(): void {
    const board = this.host.nativeElement;
    if (!board.contains(this.document.activeElement)) {
      board.focus({ preventScroll: true });
    }
  }

  /**
   * Hands the game the room the board measures until the scene lays the
   * field out, so the field the scene first draws is the one the
   * placeholder drew, not the shape it had, which it would draw for a
   * frame before the scene's own room reshaped it. Where the canvas the
   * scene measures differs from the board by a pixel, the scene's room
   * then reshapes it by a fraction of a unit.
   */
  private shapeForTheRoom(): void {
    effect(() => {
      const room = this.room();
      if (!room || this.laid()) return;
      const board = this.board();
      untracked(() => {
        this.game.setRoom(room, board);
      });
    });
  }

  /**
   * Returns the shape of the field the placeholder draws on a canvas: the one
   * the scene will lay the waiting wave out in.
   */
  private shapeOn(room: Viewport): Torus {
    return fieldShape(room, this.board(), this.game.frame().field.torus);
  }

  /**
   * Returns where the placeholder draws the field, in CSS pixels, or null
   * before the board is measured.
   */
  private placeholderField(): CssRect | null {
    const room = this.room();
    return room && fieldMetrics(room, this.board(), this.shapeOn(room)).css;
  }

  /**
   * Takes the board's font family for the points, and waits until the page
   * has loaded their face, failed to, or taken {@link POINTS_FACE_WAIT_MS}:
   * a canvas writes in a fallback rather than wait for a face to load, so
   * where the face isn't in yet, the scene writes the points again once it
   * is, unless the board has gone.
   */
  private async loadPointsFace(): Promise<void> {
    const fonts = this.document.fonts;
    const style = this.document.defaultView?.getComputedStyle(
      this.host.nativeElement,
    );
    const family = (style?.fontFamily ?? "") || "sans-serif";
    const face = pointsFace(family);
    this.pointsFont.set({ family });
    const loaded = fonts.load(face, POINTS_SAMPLE).catch(() => []);
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      loaded,
      new Promise((resolve) => {
        timer = setTimeout(resolve, POINTS_FACE_WAIT_MS);
      }),
    ]);
    clearTimeout(timer);
    if (fonts.check(face, POINTS_SAMPLE)) return;
    void loaded.then(() => {
      if (this.destroyRef.destroyed || !fonts.check(face, POINTS_SAMPLE)) {
        return;
      }
      this.pointsFont.set({ family });
    });
  }
}

/** Returns a rectangle on the canvas in CSS pixels, given in device pixels at a pixel ratio. */
function inCss(
  { x, y, width, height }: PixelRect,
  pixelRatio: number,
): CssRect {
  return {
    x: x / pixelRatio,
    y: y / pixelRatio,
    width: width / pixelRatio,
    height: height / pixelRatio,
  };
}

/** Returns the styles that lay an element over a rectangle, in CSS pixels. */
function rectStyle(rect: CssRect): Record<string, string> {
  return {
    left: `${String(rect.x)}px`,
    top: `${String(rect.y)}px`,
    width: `${String(rect.width)}px`,
    height: `${String(rect.height)}px`,
  };
}
