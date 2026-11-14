import {
  Component,
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
import { formatPoints } from "@fz/core/format";
import { helpEntries } from "@fz/game-ui/help_catalog";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  CanvasCardsComponent,
  KeepKeysDirective,
  PhaserCanvasComponent,
  type SceneSource,
  boardHostOptions,
  canvasCardOf,
  canvasRoom,
  settledPictures,
} from "@fz/phaser/canvas";
import {
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import { brickKind } from "../../rules/catalog/bricks";
import { placeOf } from "../../rules/levels/levels";
import { paddleTopOf } from "../../rules/paddle/paddle";
import { endTitle } from "../../rules/run/describe";
import {
  BALL_RADIUS,
  BRICKS_TOP,
  BRICK_HEIGHT,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_TOP,
  PADDLE_WIDTH,
  ROWS,
} from "../../rules/tuning";
import type { BricksSceneOptions } from "../../scene/bricks_scene";
import type { Pictures } from "../../view/art/art";
import {
  type FieldMetrics,
  fieldHeightFor,
  fieldMetrics,
  fingerRoomOf,
} from "../../view/field/field_metrics";
import { RIM, rimWidth } from "../../view/field/rim";
import { backdropStyle } from "../../view/places/backdrop";
import { BenchComponent } from "../panels/bench.component";
import { InPlayComponent } from "../panels/in_play.component";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { StarsComponent } from "../stars/stars.component";
import { fieldPalette } from "./field_palette";

/** Names a card of the board's own laid over the field, or none. */
type Card = "ready" | "paused" | "cleared" | "ended" | null;

/**
 * How far below the field's middle the Ready card sits, in field units:
 * halfway between the foot of the bricks' rows and the paddle, so it covers
 * neither as the player aims, the same on a taller field, whose paddle lies
 * as far above its floor. The other cards, which stand while nothing moves,
 * are taller than that gap and sit in the middle.
 */
const CARD_DROP =
  (BRICKS_TOP + ROWS * BRICK_HEIGHT + PADDLE_TOP) / 2 - FIELD_HEIGHT / 2;

/**
 * The least height of the field, in CSS pixels, the Cleared card stands over
 * at its full size, the level's stars one under another with what each asks:
 * its tallest, with a line for double pay, and room to spare. Over a shorter
 * field it sets smaller and lays the stars across, so it fits on the field.
 */
const FULL_CLEARED_CARD_FIELD_CSS_PX = 380;

/**
 * Shows the board: the canvas the scene draws the field on, which hears the
 * keys, the mouse and fingers while the board has the focus, a drawing of
 * the empty field in CSS until the scene has drawn, the panels beside the
 * field where the room spares them (the bench and in play), and the cards
 * that say how to launch and what the level's stars ask, that the level is
 * paused, the stars a level cleared holds and how its points added up, and
 * how to start again once an ended run's result is put away,
 * or the canvas's own (`<fz-canvas-cards>`), that the board is still
 * loading on a slow connection, or that it couldn't be drawn.
 *
 * Only the canvas and its ring are an application to assistive
 * technology, so a screen reader hands it the keys rather than reading with
 * them; the canvas in it is hidden, the announcer says what happens, and
 * the panels and the cards beside it read as a page does. Phaser hears the
 * keys on the board's own element, to which they rise from the
 * application; a card's button keeps its own (`fzKeepKeys`).
 *
 * The panels show from where `fieldMetrics()` lays them, the scene's once
 * it has laid the field out and the board's own on the room it measured
 * until then, so they stand where they will before the scene first draws.
 */
@Component({
  selector: "app-board",
  imports: [
    BenchComponent,
    CanvasCardsComponent,
    InPlayComponent,
    KeepKeysDirective,
    PhaserCanvasComponent,
    StarsComponent,
  ],
  host: {
    "[attr.data-field]": "fieldRect()",
    "[attr.data-room]": "roomRect()",
    "[attr.data-panels]": "panelZones()",
    "[attr.data-outcome]": "game.outcome()",
    "[class.in-play]": "inPlay()",
    "[style.--across]": "across",
    "[style.--down]": "game.fieldHeight()",
    "[style.--finger-room]": "fingerRoom()",
    "[style.--card-drop]": "cardDrop",
    "[style.--card-foot]": "cardFoot()",
    "[style.--pixel-ratio]": "pixelRatio()",
    "[style.--rim-width]": "rim()?.width",
    "[style.--rim-corner]": "rim()?.corner",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild.required(PhaserCanvasComponent);
  private readonly play = viewChild.required<ElementRef<HTMLElement>>("play");

  protected readonly across = FIELD_WIDTH;
  protected readonly cardDrop = CARD_DROP;

  /**
   * How far below the field's middle the Ready card's foot may reach, in
   * field units: a ball's width above the ball waiting on the paddle, so a
   * card too tall for the gap, as one naming a new kind of brick may be,
   * rises over the bricks rather than over the ball.
   */
  protected readonly cardFoot = computed(() => {
    const height = this.game.fieldHeight();
    return paddleTopOf(height) - 4 * BALL_RADIUS - height / 2;
  });

  /**
   * The canvas the board makes, as the host sizes it, and the ratio it
   * renders at, as the board measures them as it is first drawn and as its
   * size or the zoom changes.
   */
  private readonly measured = canvasRoom();

  /** The canvas the board makes, as last measured, or null before it is. */
  private readonly room = this.measured.viewport;

  /** How tall a field the board has room for, which the game gives the field as its ball waits to be served. */
  private readonly roomFor = computed(() => {
    const room = this.room();
    return room ? fieldHeightFor(room) : FIELD_HEIGHT;
  });

  /**
   * The room the board leaves under the field for a finger, in CSS pixels,
   * where it has room for a taller field: it follows the board, whose shape
   * changes at once, not the field, which waits for its ball to be served.
   */
  protected readonly fingerRoom = computed(() => fingerRoomOf(this.roomFor()));

  /** Where the placeholder draws the paddle, waiting in the middle, in field units. */
  protected readonly paddleStyle = computed(() => ({
    "--paddle-left": (FIELD_WIDTH - PADDLE_WIDTH) / 2,
    "--paddle-top": paddleTopOf(this.game.fieldHeight()),
    "--paddle-width": PADDLE_WIDTH,
    "--paddle-height": PADDLE_HEIGHT,
  }));

  /**
   * The device pixels to a CSS pixel the canvas renders at, as the board
   * last measured it, or as the display has it until then, so the
   * placeholder sizes its unit in whole device pixels as the scene does.
   */
  protected readonly pixelRatio = this.measured.pixelRatio;

  /** Names the board for the level on it, as "Brick Breaker, level 3: Pyramid". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.level();
    return `Brick Breaker, level ${String(number)}: ${data.name}`;
  });

  /** Whether a ball is in play, over which the pointer is hidden. */
  protected readonly inPlay = computed(
    () => this.game.outcome() === "playing" && !this.game.serving(),
  );

  /** Where the scene last laid the field and the panels out, or null before it has. */
  private readonly laid = signal<FieldMetrics | null>(null);

  /**
   * Where the scene will lay the field and the panels out, on the room the
   * board measured, the finger's room under it, at the game's height; or
   * null before the board is measured.
   */
  private readonly placeholder = computed(() => {
    const room = this.room();
    if (!room) return null;
    const insets = {
      ...room.insets,
      bottom: room.insets.bottom + this.fingerRoom(),
    };
    return fieldMetrics({ ...room, insets }, this.game.fieldHeight());
  });

  /**
   * Where the field and the panels lie: where the scene laid them out, or,
   * until it has, where it will; or null before the board is measured.
   */
  private readonly fieldAt = computed(() => this.laid() ?? this.placeholder());

  /**
   * The rim the scene draws round the field, in CSS pixels: how wide
   * (`rimWidth()`) and how round its outer corners, for the placeholder to
   * draw it as wide and the focus ring to lie outside it, where the field
   * lies (`fieldAt`); or null before the board is measured.
   */
  protected readonly rim = computed(() => {
    const metrics = this.fieldAt();
    if (!metrics) return null;
    const width = rimWidth(metrics) / metrics.pixelRatio;
    return { width, corner: RIM.corner * width };
  });

  /** The field's rectangle, for the layout check: x, y, width and height. */
  protected readonly fieldRect = computed(() => {
    const laid = this.laid();
    return laid && rectAttribute(laid.css);
  });

  /**
   * Lays the focus ring around the field where the scene drew it, or where
   * the stylesheet works it out until then.
   */
  protected readonly ringStyle = computed(() => {
    const laid = this.laid();
    return laid && cssRectStyle(laid.css);
  });

  /**
   * Where the panels lie beside the field (`fieldAt`), or null where the
   * room spares none, or before the board is measured.
   */
  protected readonly panelStyles = computed(() => {
    const panels = this.fieldAt()?.panels;
    return panels
      ? { left: cssRectStyle(panels.left), right: cssRectStyle(panels.right) }
      : null;
  });

  /**
   * The room inside the canvas's insets the board last measured, for the
   * layout check, written as the field's rectangle is, once the scene has
   * laid the field out.
   */
  protected readonly roomRect = computed(() => {
    const room = this.room();
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

  /** The place the level's set is in, which the scene tiles the field with and the page shows past it. */
  private readonly place = computed(() => placeOf(this.game.level().set));

  /**
   * How the page shows the place past the field (`backdropStyle()`), from
   * where the field lies (`fieldAt`); or null before the board is measured.
   */
  protected readonly backdrop = computed(() => {
    const metrics = this.fieldAt();
    return metrics && backdropStyle(this.place(), metrics);
  });

  /** The board's own card over the field, if any, and none while the canvas shows its own. */
  protected readonly card = computed<Card>(() => {
    if (canvasCardOf(this.canvas())) return null;
    switch (this.game.outcome()) {
      case "ready":
        return "ready";
      case "playing":
        return this.game.serving() ? "ready" : null;
      case "paused":
        return "paused";
      case "cleared":
        return this.game.clearedOpen() ? "cleared" : null;
      case "over":
      case "won":
        return this.game.resultClosed() ? "ended" : null;
    }
  });

  /** What the Ready card calls the level: its number and its name. */
  protected readonly levelTitle = computed(() => {
    const { number, data } = this.game.level();
    return `Level ${String(number)}: ${data.name}`;
  });

  /**
   * Whether the level opens, before its first serve, as the Ready card names
   * its stars and the kinds of brick new in it; not at a serve after a lost
   * ball, where the card would only stand taller over the field.
   */
  protected readonly opening = computed(() => this.game.outcome() === "ready");

  /**
   * The kinds of brick new in the level, the first by number to hold them,
   * which the Ready card names as the level opens, before its first serve,
   * each with its line and its picture once the scene has drawn it; it
   * reads the pictures only where a kind is new.
   */
  protected readonly newKinds = computed(() => {
    if (!this.opening()) return [];
    const ids = this.game
      .kindsHere()
      .filter(({ isNew }) => isNew)
      .map(({ id }) => id);
    return ids.length === 0
      ? []
      : helpEntries(ids, brickKind, this.pictures()?.bricks);
  });

  /** What the Ready card says launches the ball: a tap on a touch screen, else Space or a click. */
  protected readonly launchWords = computed(() =>
    this.viewport.isTouchScreen()
      ? "Tap to launch."
      : "Press Space or click to launch.",
  );

  /** The run's score, as the cards write it. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** What the Cleared card calls the level. */
  protected readonly clearedTitle = computed(
    () => `Level ${String(this.game.level().number)} cleared`,
  );

  /**
   * Whether the field is too short for the Cleared card at its full size,
   * where it lies (`fieldAt`): the card sets smaller over it, its stars laid
   * across, side by side.
   */
  protected readonly shortField = computed(() => {
    const metrics = this.fieldAt();
    return (
      metrics !== null && metrics.css.height < FULL_CLEARED_CARD_FIELD_CSS_PX
    );
  });

  /** How the level just cleared added up, a line for each part, for its card. */
  protected readonly tallyLines = computed(() => {
    const tally = this.game.tally();
    if (!tally) return [];
    return [
      { label: "Bricks", points: formatPoints(tally.bricks) },
      { label: "Streaks", points: formatPoints(tally.streaks) },
      ...(tally.dares > 0
        ? [{ label: "Double pay", points: formatPoints(tally.dares) }]
        : []),
      { label: "Bonus", points: formatPoints(tally.bonus) },
    ];
  });

  /** What the card over an ended run calls it. */
  protected readonly endCardTitle = computed(() => endTitle(this.game.run()));

  /**
   * The field's colors, from the palette on the page, a new object when the
   * field's roles or the mode change.
   */
  protected readonly palette = fieldPalette(inject(ThemeService));

  /** Asks the scene for its pictures of the atlas it last baked, or null before it has baked. */
  private readonly askPictures = signal<(() => Pictures) | null>(null);

  /**
   * The pictures of every brick, ball and capsule as the scene last drew
   * them, for How to play, the panels and the Ready card, or null before it
   * has drawn.
   *
   * The scene encodes them as this is first read after each bake, so only
   * How to play reads it, as it opens, the panels, while they show, and the
   * Ready card, while it names a kind of brick new in the level.
   */
  readonly pictures = computed(() => this.askPictures()?.() ?? null);

  /**
   * Takes the pictures of each bake of the scene's atlas: the first at
   * once, and a later one once the atlas has settled.
   */
  private readonly takePictures = settledPictures<() => Pictures>(
    (pictures) => {
      this.askPictures.set(pictures);
    },
  );

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: BricksSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    frame: () => this.game.frame(),
    palette: () => this.palette(),
    motion: () => this.viewport.allowsMotion(),
    touch: () => this.settings.settings().touch,
    sound: () => this.settings.settings().sound,
    chimes: () => this.game.chimes(),
    fingerRoom: () => this.fingerRoom(),
    onLayout: (metrics) => {
      this.laid.set(metrics);
    },
    command: (command) => {
      this.game.command(command);
    },
    onPictures: (pictures) => {
      this.takePictures(pictures);
    },
    place: () => this.place(),
  };

  /**
   * Loads the scene, and Phaser with it, only once the canvas asks, so the
   * shell paints first.
   */
  protected readonly scene: SceneSource = async () => {
    const { makeBricksScene } = await import("../../scene/bricks_scene");
    return makeBricksScene(this.sceneOptions);
  };

  protected readonly hostOptions = boardHostOptions(
    "Brick Breaker",
    this.host.nativeElement,
  );

  constructor() {
    // Nothing launches, or goes on, before the scene that moves it is drawn.
    // After rendering, since the canvas's state needs the scene it is given.
    afterRenderEffect(() => {
      this.game.setDrawn(this.canvas().state() === "ready");
    });
    this.askForTheRoom();
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

  /** Goes on with the paused level, and hands the focus back to the board. */
  protected resume(): void {
    this.game.resume();
    this.play().nativeElement.focus();
  }

  /** Goes on to the next level, and hands the focus back to the board. */
  protected nextLevel(): void {
    this.game.nextLevel();
    this.play().nativeElement.focus();
  }

  /** Starts another run, from the card over an ended one. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /**
   * Asks the game for as tall a field as the canvas the board measures has
   * room for, each time it is measured.
   */
  private askForTheRoom(): void {
    effect(() => {
      if (!this.room()) return;
      const height = this.roomFor();
      untracked(() => {
        this.game.setFieldHeight(height);
      });
    });
  }

  /**
   * Takes the focus for a press on the board, which Phaser's pointer
   * otherwise keeps from it, so the keys work after a tap or a click.
   */
  protected takeFocus(): void {
    this.play().nativeElement.focus({ preventScroll: true });
  }
}
