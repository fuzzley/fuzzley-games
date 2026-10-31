// @vitest-environment jsdom
import { type PhaserBoard, inspectPhaserBoard } from "./board_page.ts";

/** A rectangle on the page, in CSS px. */
interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Describes a board's page, as jsdom, which lays nothing out, is handed it. */
interface BoardPage {
  readonly window: { readonly width: number; readonly height: number };
  readonly state: string;
  readonly ratio: string | null;
  readonly backing: { readonly width: number; readonly height: number };
  readonly canvas: Rect;
  readonly drawnAt: string | null;
  readonly placeholder: Rect | null;
  readonly ring: Rect | null;
  readonly card: Rect | null;
}

/** The field, as Brick Breaker describes it. */
const FIELD: PhaserBoard = {
  name: "field",
  element: "app-board",
  drawnAt: "data-field",
  across: 26,
  down: 30,
  placeholder: ".placeholder .field",
  ring: ".ring",
  card: ".card",
};

/** The placeholder's wall, in CSS px. */
const WALL = 2;

/** The placeholder's field, its wall of 2 px around where the scene drew. */
const PLACEHOLDER: Rect = { left: 118, top: 73, width: 264, height: 304 };

/** The focus ring, around where the scene drew. */
const RING: Rect = { left: 120, top: 75, width: 260, height: 300 };

/** The card, on the field. */
const CARD: Rect = { left: 150, top: 150, width: 200, height: 80 };

/**
 * A field drawn as it should be: 26 units of 10 CSS px by 30, 20 px across
 * and 25 down a canvas at 2×, so at 120 and 75 in the window, inside the
 * placeholder's wall and the ring, its card on it.
 */
const FITTING: BoardPage = {
  window: { width: 1024, height: 768 },
  state: "ready",
  ratio: "2",
  backing: { width: 800, height: 700 },
  canvas: { left: 100, top: 50, width: 400, height: 350 },
  drawnAt: "20 25 260 300",
  placeholder: PLACEHOLDER,
  ring: RING,
  card: CARD,
};

/** Returns a board's page with everything on it moved by a distance. */
function shifted(page: BoardPage, x: number, y: number): BoardPage {
  const move = (rect: Rect): Rect => ({
    ...rect,
    left: rect.left + x,
    top: rect.top + y,
  });
  return {
    ...page,
    canvas: move(page.canvas),
    placeholder: page.placeholder && move(page.placeholder),
    ring: page.ring && move(page.ring),
    card: page.card && move(page.card),
  };
}

/** Lays a board's page out in the document and its window, as a browser would. */
function lay(page: BoardPage): void {
  vi.stubGlobal("innerWidth", page.window.width);
  vi.stubGlobal("innerHeight", page.window.height);
  document.body.innerHTML = `
    <app-board>
      <fz-phaser-canvas>
        <canvas></canvas>
        <div class="placeholder"><div class="field"></div></div>
      </fz-phaser-canvas>
      <div class="ring"></div>
      <div class="card"></div>
    </app-board>`;
  const board = element("app-board");
  if (page.ratio !== null) board.style.setProperty("--pixel-ratio", page.ratio);
  if (page.drawnAt !== null) board.setAttribute("data-field", page.drawnAt);
  element("fz-phaser-canvas").setAttribute("data-state", page.state);
  const canvas = element("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("No canvas.");
  canvas.width = page.backing.width;
  canvas.height = page.backing.height;
  place(canvas, page.canvas);
  const placeholder = element(".field");
  placeholder.style.borderLeft = `${String(WALL)}px solid`;
  place(placeholder, page.placeholder);
  place(element(".ring"), page.ring);
  place(element(".card"), page.card);
}

/** Returns the element a selector finds in the document. */
function element(selector: string): HTMLElement {
  const found = document.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`No ${selector}.`);
  return found;
}

/** Puts an element at a rectangle on the page, or takes it off it. */
function place(target: HTMLElement, rect: Rect | null): void {
  if (rect === null) {
    target.remove();
    return;
  }
  const { left, top, width, height } = rect;
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue(
    new DOMRect(left, top, width, height),
  );
}

describe("inspectPhaserBoard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("finds nothing wrong with a board where the scene drew it, and says where it lies", () => {
    lay(FITTING);

    const inspection = inspectPhaserBoard(FIELD);

    expect(inspection).toEqual({
      problems: [],
      box: { left: 120, top: 75, width: 260, height: 300, unit: 10 },
    });
  });

  it.each<[string, BoardPage]>([
    [
      "a canvas a device pixel off its size at the ratio",
      { ...FITTING, backing: { width: 801, height: 701 } },
    ],
    [
      "a board half a pixel off its shape",
      { ...FITTING, drawnAt: "20 25 260 300.5" },
    ],
    [
      "a board at the window's top left",
      { ...shifted(FITTING, -120, -75), window: { width: 259, height: 299 } },
    ],
    [
      "a board a pixel past the window's bottom right",
      { ...FITTING, window: { width: 379, height: 374 } },
    ],
    [
      "a placeholder a pixel off on every side",
      {
        ...FITTING,
        placeholder: { left: 117, top: 72, width: 265, height: 305 },
      },
    ],
    [
      "a ring half a pixel off on every side",
      {
        ...FITTING,
        ring: { left: 120.5, top: 75.5, width: 260.5, height: 300.5 },
      },
    ],
    [
      "a card a pixel past the board on every side",
      { ...FITTING, card: { left: 119, top: 74, width: 262, height: 302 } },
    ],
  ])("allows %s", (_, page) => {
    lay(page);

    expect(inspectPhaserBoard(FIELD).problems).toEqual([]);
  });

  it.each<[string, BoardPage, string]>([
    [
      "a canvas not ready",
      { ...FITTING, state: "loading" },
      "The canvas is loading, not ready.",
    ],
    [
      "a canvas too wide for the ratio",
      { ...FITTING, backing: { width: 802, height: 700 } },
      "The canvas draws 802 × 700 pixels for 400 × 350 CSS px at 2×.",
    ],
    [
      "a canvas too tall for the ratio",
      { ...FITTING, backing: { width: 800, height: 702 } },
      "The canvas draws 800 × 702 pixels for 400 × 350 CSS px at 2×.",
    ],
    [
      "a board that gives no pixel ratio",
      { ...FITTING, ratio: null },
      "app-board gives no --pixel-ratio.",
    ],
    [
      "a board out of its shape",
      {
        ...FITTING,
        drawnAt: "20 25 260 300.6",
        ring: { ...RING, height: 300.6 },
      },
      "The field is 260 by 300.6 CSS px, not 26 units by 30.",
    ],
    [
      "a board out of the window's left",
      shifted(FITTING, -121, 0),
      "The field runs out of the window.",
    ],
    [
      "a board out of the window's top",
      shifted(FITTING, 0, -76),
      "The field runs out of the window.",
    ],
    [
      "a board out of the window's right",
      { ...FITTING, window: { width: 378, height: 768 } },
      "The field runs out of the window.",
    ],
    [
      "a board out of the window's bottom",
      { ...FITTING, window: { width: 1024, height: 373 } },
      "The field runs out of the window.",
    ],
    [
      "a placeholder off on its left",
      { ...FITTING, placeholder: { ...PLACEHOLDER, left: 116.9 } },
      "The placeholder drew the field 1.1 CSS px from where the scene did.",
    ],
    [
      "a placeholder off on its top",
      { ...FITTING, placeholder: { ...PLACEHOLDER, top: 71.9 } },
      "The placeholder drew the field 1.1 CSS px from where the scene did.",
    ],
    [
      "a placeholder too wide",
      { ...FITTING, placeholder: { ...PLACEHOLDER, width: 265.1 } },
      "The placeholder drew the field 1.1 CSS px from where the scene did.",
    ],
    [
      "a placeholder too tall",
      { ...FITTING, placeholder: { ...PLACEHOLDER, height: 305.1 } },
      "The placeholder drew the field 1.1 CSS px from where the scene did.",
    ],
    [
      "a placeholder missing",
      { ...FITTING, placeholder: null },
      "The placeholder's field is missing.",
    ],
    [
      "a card off the board's left",
      { ...FITTING, card: { ...CARD, left: 118 } },
      "The card over the field runs off it.",
    ],
    [
      "a card off the board's top",
      { ...FITTING, card: { ...CARD, top: 73 } },
      "The card over the field runs off it.",
    ],
    [
      "a card off the board's right",
      { ...FITTING, card: { ...CARD, width: 232 } },
      "The card over the field runs off it.",
    ],
    [
      "a card off the board's bottom",
      { ...FITTING, card: { ...CARD, height: 227 } },
      "The card over the field runs off it.",
    ],
    [
      "a card missing",
      { ...FITTING, card: null },
      "The card over the field is missing.",
    ],
    [
      "a ring off on its left",
      { ...FITTING, ring: { ...RING, left: 120.6 } },
      "The focus ring doesn't lie around the field.",
    ],
    [
      "a ring off on its top",
      { ...FITTING, ring: { ...RING, top: 75.6 } },
      "The focus ring doesn't lie around the field.",
    ],
    [
      "a ring too wide",
      { ...FITTING, ring: { ...RING, width: 260.6 } },
      "The focus ring doesn't lie around the field.",
    ],
    [
      "a ring too tall",
      { ...FITTING, ring: { ...RING, height: 300.6 } },
      "The focus ring doesn't lie around the field.",
    ],
    [
      "a ring missing",
      { ...FITTING, ring: null },
      "The focus ring doesn't lie around the field.",
    ],
  ])("reports %s", (_, page, problem) => {
    lay(page);

    expect(inspectPhaserBoard(FIELD).problems).toEqual([problem]);
  });

  it("reports a board out of the shape its description gives", () => {
    lay(FITTING);

    const { problems } = inspectPhaserBoard({ ...FIELD, down: 29 });

    expect(problems).toEqual([
      "The field is 260 by 300 CSS px, not 26 units by 29.",
    ]);
  });

  it("reads a board's height from a custom property of its element", () => {
    lay(FITTING);
    element("app-board").style.setProperty("--down", "29");

    const { problems } = inspectPhaserBoard({ ...FIELD, down: "--down" });

    expect(problems).toEqual([
      "The field is 260 by 300 CSS px, not 26 units by 29.",
    ]);
  });

  it("reports a board whose element gives no height where its description says", () => {
    lay(FITTING);

    const { problems } = inspectPhaserBoard({ ...FIELD, down: "--down" });

    expect(problems).toEqual(["app-board gives no --down."]);
  });

  it.each([
    ["says nothing", null],
    ["gives three numbers", "20 25 260"],
    ["gives what isn't a number", "20 25 260 tall"],
  ])(
    "reports a board whose element %s of where it lies, and hands back no box",
    (_, drawnAt) => {
      lay({ ...FITTING, drawnAt });

      expect(inspectPhaserBoard(FIELD)).toEqual({
        problems: ["app-board doesn't say where the field lies (data-field)."],
      });
    },
  );

  it("reports a board with no canvas, and nothing more", () => {
    lay(FITTING);

    expect(inspectPhaserBoard({ ...FIELD, element: "app-bar" })).toEqual({
      problems: ["Found no canvas in app-bar."],
    });
  });
});
