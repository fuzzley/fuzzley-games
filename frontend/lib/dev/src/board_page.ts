// The inspections a layout check runs in the page of a board drawn with
// Phaser, the readers of the rectangles a board writes, which the check sends
// with each, and what a screenshot script reads of such a page, sent with
// `readRect()`. Each is sent as its source, so each uses nothing from outside
// itself but the readers. Beside them are the selectors the scripts wait on
// for a board's canvas, which only they use.
//
// A function the page runs calls the readers as names of its own module, as
// these do, or from a script Node runs, never through an import Vite
// rewrites: Vitest's module runner turns an imported `readRect(…)` into
// `(0, __vite_ssr_import_0__.readRect)(…)`, the source the page is then sent,
// which names nothing there. So such a function of `@fz/dev`'s is kept here.
//
// The file imports nothing, so a spec takes the readers from
// `@fz/dev/board-page` without loading Vite or Chrome.

/** Matches a board's `<fz-phaser-canvas>` once its scene has drawn. */
export const PHASER_CANVAS_READY = 'fz-phaser-canvas[data-state="ready"]';

/**
 * Matches a board's `<fz-phaser-canvas>` once its scene has drawn or failed
 * to, so a script can say which.
 */
export const PHASER_CANVAS_SETTLED =
  'fz-phaser-canvas[data-state]:not([data-state="loading"])';

/**
 * Describes a board drawn with Phaser, as the page shows it: an element that
 * holds `<fz-phaser-canvas>`, the empty board drawn in CSS until the scene
 * has drawn, the focus ring and the card over the board.
 */
export interface PhaserBoard {
  /** What the board is called in what the check says, such as "field". */
  readonly name: string;
  /**
   * A selector for the board's element, such as `app-board`, whose
   * `--pixel-ratio` is the ratio it laid the placeholder out at, which the
   * canvas renders at too.
   */
  readonly element: string;
  /**
   * The attribute of the board's element that says where the scene drew the
   * board on the canvas, as "x y width height" in CSS px, which
   * {@link readRect} reads, such as `data-field`.
   */
  readonly drawnAt: string;
  /**
   * The board's width, in its units, such as squares, or the custom property
   * of its element that holds it, such as `--across`, for a board whose
   * width follows its room.
   */
  readonly across: number | string;
  /**
   * The board's height, in its units, or the custom property of its element
   * that holds it, such as `--down`, for a board whose height follows its
   * room.
   */
  readonly down: number | string;
  /**
   * A selector, within the board's element, for the placeholder's board,
   * whose wall lies around where the scene draws.
   */
  readonly placeholder: string;
  /** A selector, within the board's element, for the focus ring. */
  readonly ring: string;
  /**
   * A selector, within the board's element, for the card the board shows as
   * the game opens.
   */
  readonly card: string;
  /**
   * The zones laid over the canvas beside the board, if it has them, such as
   * the controls it draws for a touch screen.
   */
  readonly deck?: PhaserDeck;
}

/**
 * Describes a deck: the zones laid over a board's canvas beside the board,
 * such as a touch screen's stick and buttons, or a wide room's panels.
 *
 * A layout check holds the deck to showing every zone it names, or, for a
 * deck shown all or none, every zone or none; so a game whose deck shows only
 * on a touch screen checks its layout with it shown, such as by a setting its
 * check's `before()` stores.
 */
export interface PhaserDeck {
  /**
   * The attribute of the board's element that lists the zones, such as
   * `data-deck`: each a name of one word and where the zone lies on the
   * canvas, as "x y width height" in CSS px, the zones parted by commas, as
   * "stick 0 600 180 200, buttons 180 600 180 200", which
   * {@link readNamedRects} reads.
   */
  readonly drawnAt: string;
  /** The zones the deck shows, by the names it lists them by. */
  readonly zones: readonly string[];
  /**
   * The least a zone may be across and down, in CSS px, such as a thumb
   * needs.
   */
  readonly least: number;
  /**
   * Whether the deck shows its zones all or none, as panels laid over the
   * canvas's spare room only where there is room for every one of them, so a
   * deck that lists no zone at all passes too.
   *
   * The check can't then tell a deck hidden for want of room from one never
   * shown, so the game's own inspection holds where it must show.
   */
  readonly allOrNone?: boolean;
}

/** Says where a rectangle lies, in CSS px. */
interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Says where a board lies in the window, in CSS px, and the size of its unit. */
export interface BoardBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly unit: number;
}

/** Says what is wrong with a board, and where it lies once its element says. */
export interface BoardInspection {
  readonly problems: readonly string[];
  readonly box?: BoardBox;
}

/**
 * Returns what is wrong with a board drawn with Phaser: its canvas missing,
 * not ready or not drawn at its size times the pixel ratio; the board out of
 * its shape or out of the window; its placeholder or focus ring not where the
 * scene drew it; or its card missing or off it. It runs in the page.
 */
export function inspectPhaserBoard(board: PhaserBoard): BoardInspection {
  const { name } = board;
  const element = document.querySelector(board.element);
  const host = element?.querySelector("fz-phaser-canvas");
  const canvas = host?.querySelector("canvas");
  if (!element || !host || !canvas) {
    return { problems: [`Found no canvas in ${board.element}.`] };
  }
  const problems: string[] = [];
  const state = host.getAttribute("data-state");
  if (state !== "ready") problems.push(`The canvas is ${state}, not ready.`);

  const shown = canvas.getBoundingClientRect();
  const style = getComputedStyle(element);
  const ratio = parseFloat(style.getPropertyValue("--pixel-ratio"));
  if (!Number.isFinite(ratio)) {
    problems.push(`${board.element} gives no --pixel-ratio.`);
  } else if (
    Math.abs(canvas.width - shown.width * ratio) > 1 ||
    Math.abs(canvas.height - shown.height * ratio) > 1
  ) {
    problems.push(
      `The canvas draws ${canvas.width} × ${canvas.height} pixels for ${shown.width} × ${shown.height} CSS px at ${ratio}×.`,
    );
  }

  const drawnAt = readRect(element.getAttribute(board.drawnAt));
  if (!drawnAt) {
    problems.push(
      `${board.element} doesn't say where the ${name} lies (${board.drawnAt}).`,
    );
    return { problems };
  }
  const { x, y, width, height } = drawnAt;
  const unitsOf = (units: number | string): number =>
    typeof units === "number"
      ? units
      : parseFloat(style.getPropertyValue(units));
  const across = unitsOf(board.across);
  if (!Number.isFinite(across)) {
    problems.push(`${board.element} gives no ${String(board.across)}.`);
    return { problems };
  }
  const box: BoardBox = {
    left: shown.left + x,
    top: shown.top + y,
    width,
    height,
    unit: width / across,
  };
  const down = unitsOf(board.down);
  if (!Number.isFinite(down)) {
    problems.push(`${board.element} gives no ${String(board.down)}.`);
  } else if (Math.abs(height - box.unit * down) > 0.5) {
    problems.push(
      `The ${name} is ${width} by ${height} CSS px, not ${across} units by ${down}.`,
    );
  }
  if (
    box.left < 0 ||
    box.top < 0 ||
    box.left + width > innerWidth + 1 ||
    box.top + height > innerHeight + 1
  ) {
    problems.push(`The ${name} runs out of the window.`);
  }

  // The placeholder's board, inside its wall, lies where the scene's does,
  // but for the half pixel the scene may round to at the pixel ratio.
  const placeholder = element.querySelector(board.placeholder);
  if (placeholder) {
    const wall = parseFloat(getComputedStyle(placeholder).borderLeftWidth);
    const drawn = placeholder.getBoundingClientRect();
    const off = Math.max(
      Math.abs(drawn.left + wall - box.left),
      Math.abs(drawn.top + wall - box.top),
      Math.abs(drawn.width - 2 * wall - width),
      Math.abs(drawn.height - 2 * wall - height),
    );
    if (off > 1) {
      problems.push(
        `The placeholder drew the ${name} ${off.toFixed(1)} CSS px from where the scene did.`,
      );
    }
  } else {
    problems.push(`The placeholder's ${name} is missing.`);
  }

  const card = element.querySelector(board.card)?.getBoundingClientRect();
  if (!card) {
    problems.push(`The card over the ${name} is missing.`);
  } else if (
    card.left < box.left - 1 ||
    card.top < box.top - 1 ||
    card.right > box.left + width + 1 ||
    card.bottom > box.top + height + 1
  ) {
    problems.push(`The card over the ${name} runs off it.`);
  }

  const ring = element.querySelector(board.ring)?.getBoundingClientRect();
  if (
    !ring ||
    Math.max(
      Math.abs(ring.left - box.left),
      Math.abs(ring.top - box.top),
      Math.abs(ring.width - width),
      Math.abs(ring.height - height),
    ) > 0.5
  ) {
    problems.push(`The focus ring doesn't lie around the ${name}.`);
  }
  return { problems, box };
}

/**
 * Returns what is wrong with the deck laid over a board's canvas beside the
 * board where it lies: a zone the deck names missing, unless the deck is
 * shown all or none and lists no zone; a zone unknown, unreadable or listed
 * twice; or one off the canvas, out of the window, over the board, another
 * zone or a control of the game bar, or smaller than the deck's least. It
 * runs in the page.
 */
export function inspectPhaserDeck(board: PhaserBoard, box: BoardBox): string[] {
  /** Returns whether two rectangles share more than half a pixel's width. */
  function overlaps(a: Rect, b: Rect): boolean {
    return (
      a.left < b.left + b.width - 0.5 &&
      b.left < a.left + a.width - 0.5 &&
      a.top < b.top + b.height - 0.5 &&
      b.top < a.top + a.height - 0.5
    );
  }

  const { deck } = board;
  const element = document.querySelector(board.element);
  const shown = element
    ?.querySelector("fz-phaser-canvas canvas")
    ?.getBoundingClientRect();
  // The board's own inspection says what is missing of the board.
  if (!deck || !element || !shown) return [];
  const listed = element.getAttribute(deck.drawnAt);
  if (listed === null) {
    return [
      `${board.element} doesn't say where its deck lies (${deck.drawnAt}).`,
    ];
  }

  const problems: string[] = [];
  /** Where each zone lies on the canvas, by its name. */
  const zones = new Map<string, Rect>();
  const entries = readNamedRects(listed);
  for (const { written, name: zone, rect } of entries) {
    if (!rect) {
      problems.push(`The deck's zone "${written}" doesn't say where it lies.`);
    } else if (!deck.zones.includes(zone)) {
      problems.push(`The deck shows a zone its board doesn't name: ${zone}.`);
    } else if (zones.has(zone)) {
      problems.push(`The deck lists its ${zone} zone twice.`);
    } else {
      const { x: left, y: top, width, height } = rect;
      zones.set(zone, { left, top, width, height });
    }
  }
  // A deck shown all or none may list nothing; one that lists anything,
  // even a zone it can't read, must show them all.
  if (!deck.allOrNone || entries.length > 0) {
    for (const zone of deck.zones) {
      if (!zones.has(zone)) problems.push(`The deck shows no ${zone} zone.`);
    }
  }

  const controls = [
    ...document.querySelectorAll("fz-game-bar button, fz-game-bar a"),
  ];
  for (const [zone, at] of zones) {
    if (
      at.left < -0.5 ||
      at.top < -0.5 ||
      at.left + at.width > shown.width + 0.5 ||
      at.top + at.height > shown.height + 0.5
    ) {
      problems.push(`The deck's ${zone} zone runs off the canvas.`);
    }
    const lies: Rect = {
      ...at,
      left: shown.left + at.left,
      top: shown.top + at.top,
    };
    if (
      lies.left < -0.5 ||
      lies.top < -0.5 ||
      lies.left + lies.width > innerWidth + 0.5 ||
      lies.top + lies.height > innerHeight + 0.5
    ) {
      problems.push(`The deck's ${zone} zone runs out of the window.`);
    }
    if (overlaps(lies, box)) {
      problems.push(`The deck's ${zone} zone lies over the ${board.name}.`);
    }
    for (const control of controls) {
      const taken = control.getBoundingClientRect();
      if (taken.width === 0 || taken.height === 0 || !overlaps(lies, taken)) {
        continue;
      }
      const label =
        control.getAttribute("aria-label") ?? control.textContent.trim();
      problems.push(`The deck's ${zone} zone lies over the bar's ${label}.`);
    }
    if (at.width < deck.least || at.height < deck.least) {
      problems.push(
        `The deck's ${zone} zone is ${at.width} by ${at.height} CSS px, less than ${deck.least} across or down.`,
      );
    }
  }
  const placed = [...zones];
  for (const [i, [zone, at]] of placed.entries()) {
    for (const [other, there] of placed.slice(i + 1)) {
      if (overlaps(at, there)) {
        problems.push(`The deck's ${zone} zone lies over its ${other} zone.`);
      }
    }
  }
  return problems;
}

/**
 * Says where a rectangle lies on a board's canvas, in CSS px from its top
 * left, as the board's element writes it.
 *
 * It has the shape of `@fz/phaser/layout`'s `CssRect`, which a board writes
 * it from, declared again here since this file imports nothing.
 */
export interface CanvasRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Says what an entry of a list of named rectangles gives. */
export interface NamedRect {
  /** The entry as the list wrote it, but for the spaces around it. */
  readonly written: string;
  /** The entry's name, its first word. */
  readonly name: string;
  /** The rectangle the entry gives, or null where it gives none. */
  readonly rect: CanvasRect | null;
}

/**
 * Returns the rectangle an element's attribute gives as "x y width height",
 * four numbers parted by spaces, or null for a missing attribute or one that
 * gives no such rectangle. It runs in the page too, sent as its source, so it
 * uses nothing from outside itself.
 */
export function readRect(written: string | null): CanvasRect | null {
  const numbers = (written ?? "").trim().split(/\s+/).map(Number);
  const [x = NaN, y = NaN, width = NaN, height = NaN] = numbers;
  return numbers.length === 4 && numbers.every(Number.isFinite)
    ? { x, y, width, height }
    : null;
}

/**
 * Returns the entries of an element's attribute that lists named rectangles,
 * parted by commas, as "stick 0 600 180 200, buttons 180 600 180 200": each
 * a name of one word and a rectangle as {@link readRect} reads one, an empty
 * entry left out. It runs in the page too, sent as its source, so it uses
 * nothing from outside itself but {@link readRect}.
 */
export function readNamedRects(listed: string): NamedRect[] {
  return listed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((written) => {
      const [name = "", ...at] = written.split(/\s+/);
      return { written, name, rect: readRect(at.join(" ")) };
    });
}

/** Says what the page of a game drawn with Phaser shows, as a screenshot checks it. */
export interface PhaserPageState {
  /** What its `<fz-phaser-canvas>` says of the scene, such as "ready". */
  readonly state: string;
  /** What the board says of the game, its `data-outcome`, such as "paused". */
  readonly outcome: string;
  /** What the game bar's score reads. */
  readonly score: string;
  /**
   * Where the scene drew the board on the page, in CSS px, as sharp's
   * `Region` takes it; none without a canvas, or where the board doesn't say
   * where it lies.
   */
  readonly board: Rect | null;
}

/**
 * Returns what the page of a game drawn with Phaser shows, once its scene
 * has drawn or failed to, and 800 ms have passed: long enough for the
 * placeholder's fade, and for what a scene pops in as it starts, such as
 * Snake's apple. It says the canvas's state, the board's outcome, the score,
 * and where the scene drew the board, as its element's `drawnAt` attribute
 * says, read with {@link readRect}. It runs in the page, sent with
 * `readRect()`.
 */
export async function describePhaserPage(
  board: Pick<PhaserBoard, "element" | "drawnAt">,
): Promise<PhaserPageState> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const element = document.querySelector(board.element);
  const canvas = document
    .querySelector("fz-phaser-canvas canvas")
    ?.getBoundingClientRect();
  const drawn = readRect(element?.getAttribute(board.drawnAt) ?? null);
  const score = [...document.querySelectorAll("dt")].find(
    (term) => term.textContent.trim() === "Score",
  );
  return {
    state:
      document.querySelector("fz-phaser-canvas")?.getAttribute("data-state") ??
      "",
    outcome: element?.getAttribute("data-outcome") ?? "",
    score: score?.nextElementSibling?.textContent.trim() ?? "",
    board:
      canvas && drawn
        ? {
            left: canvas.left + drawn.x,
            top: canvas.top + drawn.y,
            width: drawn.width,
            height: drawn.height,
          }
        : null,
  };
}
