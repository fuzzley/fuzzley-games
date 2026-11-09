import type { Game } from "phaser";
import { ViewportScaler } from "../host/viewport_scaler";
import { NO_INSETS } from "../insets";
import type { DevicePixelSize, Viewport } from "../layout";
import { CANVAS_INSET_PROPERTIES } from "../measure";
import { FakeDisplay } from "../testing/fake_display";
import {
  FakeResizeObserver,
  resize,
  watchResizes,
} from "../testing/fake_resize_observer";
import { startGame, stopGame } from "../testing/start_game";
import { watchCanvasViewport } from "./canvas_viewport";

/** Returns an element of the page laid out at a size in CSS pixels. */
function elementOf(width: number, height: number): HTMLElement {
  const element = document.createElement("div");
  document.body.append(element);
  layOut(element, width, height);
  return element;
}

/**
 * Lays an element out at a size in CSS pixels, as a browser would, telling
 * nothing that watches it, as a change of zoom that leaves its device pixels
 * as they were tells nothing.
 */
function layOut(element: Element, width: number, height: number): void {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, width, height),
  );
}

/** Puts the page on a display of a pixel ratio, which a spec may change. */
function displayAt(devicePixelRatio: number): FakeDisplay {
  const display = new FakeDisplay(devicePixelRatio);
  vi.spyOn(window, "devicePixelRatio", "get").mockImplementation(
    () => display.devicePixelRatio,
  );
  vi.stubGlobal("matchMedia", (media: string) => display.matchMedia(media));
  return display;
}

/** The games the specs started, to stop after each. */
const games: Game[] = [];

afterEach(() => {
  for (const game of games.splice(0)) stopGame(game);
  document.body.replaceChildren();
});

/** The canvas's size and pixel ratio, as the host makes it or a board measures it. */
type MadeCanvas = Omit<Viewport, "insets">;

/**
 * The pixel ratio the budget of 4.5 million device pixels holds a 1280 by
 * 720 canvas to on a display of 3.
 */
const BUDGETED_RATIO = Math.sqrt(4_500_000 / (1280 * 720));

/** Describes a box in CSS pixels. */
interface Box {
  readonly width: number;
  readonly height: number;
}

/**
 * Canvases the host makes: the box in CSS pixels, the display's ratio, and
 * the box's device pixels as the browser counted them, if it did.
 */
const CANVASES: readonly [
  string,
  Box,
  number,
  DevicePixelSize | null,
  MadeCanvas,
][] = [
  [
    "a window at 1x",
    { width: 1280, height: 720 },
    1,
    { width: 1280, height: 720 },
    { width: 1280, height: 720, pixelRatio: 1 },
  ],
  [
    "a phone at a fractional ratio, from the device pixels counted",
    { width: 412, height: 915 },
    2.625,
    { width: 1082, height: 2402 },
    { width: 1082, height: 2402, pixelRatio: 2.625 },
  ],
  [
    "a phone at a fractional ratio, in whole CSS pixels where none are counted",
    { width: 412, height: 915 },
    2.625,
    null,
    { width: 1081.5, height: 2401.875, pixelRatio: 2.625 },
  ],
  [
    "a fractional box, from the device pixels counted",
    { width: 640.5, height: 360.5 },
    2,
    { width: 1281, height: 721 },
    { width: 1281, height: 721, pixelRatio: 2 },
  ],
  [
    "a fractional box, in whole CSS pixels where none are counted",
    { width: 640.5, height: 360.5 },
    2,
    null,
    { width: 1280, height: 720, pixelRatio: 2 },
  ],
  [
    "a large window above 2x at 2, in whole CSS pixels",
    { width: 1707, height: 960 },
    2.5,
    { width: 4268, height: 2400 },
    { width: 3414, height: 1920, pixelRatio: 2 },
  ],
  [
    "a window above 2x held to its budget, in whole CSS pixels",
    { width: 1280, height: 720 },
    3,
    { width: 3840, height: 2160 },
    {
      width: 1280 * BUDGETED_RATIO,
      height: 720 * BUDGETED_RATIO,
      pixelRatio: BUDGETED_RATIO,
    },
  ],
  [
    "a box resized since the browser counted it, in whole CSS pixels",
    { width: 500, height: 844 },
    3,
    { width: 1170, height: 2532 },
    { width: 1500, height: 2532, pixelRatio: 3 },
  ],
  [
    "a collapsed box a CSS pixel each way",
    { width: 0, height: 0 },
    1,
    null,
    { width: 1, height: 1, pixelRatio: 1 },
  ],
  [
    "a collapsed box a CSS pixel each way, though the browser counted no pixels",
    { width: 0, height: 0 },
    1,
    { width: 0, height: 0 },
    { width: 1, height: 1, pixelRatio: 1 },
  ],
];

/**
 * Returns the canvas the host makes in an element, as the browser reports
 * its box and what it counted.
 */
async function madeByHost(
  element: Element,
  box: Box,
  counted: DevicePixelSize | null,
): Promise<MadeCanvas> {
  const game = await startGame();
  games.push(game);
  const scaler = new ViewportScaler(game, element);
  scaler.start();
  resize(element, box.width, box.height, counted ?? undefined);
  scaler.stop();
  const { width, height } = game.scale;
  return { width, height, pixelRatio: scaler.pixelRatio };
}

/**
 * Returns the canvas a board measures in an element, as the browser reports
 * its box and what it counted.
 */
function measuredByBoard(
  element: Element,
  box: Box,
  counted: DevicePixelSize | null,
): Promise<MadeCanvas> {
  const handed: Viewport[] = [];
  const stop = watchCanvasViewport(element, (viewport) => {
    handed.push(viewport);
  });
  resize(element, box.width, box.height, counted ?? undefined);
  stop?.();
  const measured = handed.at(-1);
  if (!measured) throw new Error("The board measured nothing");
  const { width, height, pixelRatio } = measured;
  return Promise.resolve({ width, height, pixelRatio });
}

describe.each([
  ["the host makes", madeByHost],
  ["a board measures", measuredByBoard],
])("the canvas %s", (_, made) => {
  watchResizes();

  it.each(CANVASES)(
    "for %s",
    async (__, box, devicePixelRatio, counted, canvas) => {
      displayAt(devicePixelRatio);
      const element = elementOf(box.width, box.height);

      await expect(made(element, box, counted)).resolves.toEqual(canvas);
    },
  );
});

describe("watchCanvasViewport", () => {
  watchResizes();

  /** Watches an element, gathering every canvas it is handed. */
  function watch(element: Element): {
    handed: Viewport[];
    stop: () => void;
  } {
    const handed: Viewport[] = [];
    const stop = watchCanvasViewport(element, (viewport) => {
      handed.push(viewport);
    });
    if (!stop) throw new Error("Nothing watches the element");
    return { handed, stop };
  }

  it("watches and measures nothing where the browser can't watch", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const handed: Viewport[] = [];

    const stop = watchCanvasViewport(elementOf(800, 600), (viewport) => {
      handed.push(viewport);
    });

    expect({ stop, handed }).toEqual({ stop: null, handed: [] });
  });

  it("hands over the canvas the element makes at once, before the browser reports its size", () => {
    displayAt(2);

    const { handed } = watch(elementOf(800, 600));

    expect(handed).toEqual<Viewport[]>([
      { width: 1600, height: 1200, pixelRatio: 2, insets: NO_INSETS },
    ]);
  });

  it("hands over at once the insets the element declares for the canvas", () => {
    const element = elementOf(800, 600);
    element.style.setProperty(CANVAS_INSET_PROPERTIES.top, "120px");

    const { handed } = watch(element);

    expect(handed.map(({ insets }) => insets)).toEqual([
      { ...NO_INSETS, top: 120 },
    ]);
  });

  it("measures at a device pixel to a CSS pixel in a document with no window", () => {
    displayAt(2);
    const element = document.implementation
      .createHTMLDocument()
      .createElement("div");
    layOut(element, 800, 600);

    const { handed } = watch(element);

    expect(handed.map(({ pixelRatio }) => pixelRatio)).toEqual([1]);
  });

  it("hands over the canvas the element makes each time its size changes", () => {
    const element = elementOf(800, 600);
    const { handed } = watch(element);

    resize(element, 1280, 720, { width: 1280, height: 720 });

    expect(handed.map(({ width, height }) => ({ width, height }))).toEqual([
      { width: 800, height: 600 },
      { width: 1280, height: 720 },
    ]);
  });

  it("hands over the canvas at the new ratio as the page is zoomed, its device pixels as they were", () => {
    const display = displayAt(1);
    const element = elementOf(800, 600);
    const { handed } = watch(element);
    resize(element, 800, 600, { width: 800, height: 600 });

    layOut(element, 400, 300);
    display.setPixelRatio(2);

    expect(handed.at(-1)).toEqual<Viewport>({
      width: 800,
      height: 600,
      pixelRatio: 2,
      insets: NO_INSETS,
    });
  });

  it("hands over nothing once stopped, neither a change of size nor of ratio", () => {
    const display = displayAt(1);
    const element = elementOf(800, 600);
    const { handed, stop } = watch(element);

    stop();
    resize(element, 1600, 1200, { width: 1600, height: 1200 });
    display.setPixelRatio(2);

    expect(handed).toHaveLength(1);
  });

  it("lets go of the element where the canvas it first hands over isn't taken", () => {
    const display = displayAt(1);

    expect(() =>
      watchCanvasViewport(elementOf(800, 600), () => {
        throw new Error("Refused");
      }),
    ).toThrow("Refused");
    expect({
      watched: FakeResizeObserver.made.map((made) => made.watched.size),
      listenedTo: display.listenedTo,
    }).toEqual({ watched: [0], listenedTo: [] });
  });
});
