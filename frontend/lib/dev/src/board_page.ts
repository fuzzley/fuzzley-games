// The inspections a layout check runs in the page of a board drawn with
// Phaser, each sent as its source, so each uses nothing from outside itself.

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
   * board on the canvas, as "x y width height" in CSS px, such as
   * `data-field`.
   */
  readonly drawnAt: string;
  /** The board's width, in its units, such as squares. */
  readonly across: number;
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
   * The controls the canvas draws beside the board for a touch screen, if it
   * has them.
   */
  readonly deck?: PhaserDeck;
}

/**
 * Describes a deck: the zones a canvas draws beside its board for a touch
 * screen's thumbs, such as a stick's and its buttons'.
 *
 * A layout check holds the deck to showing every zone it names, so a game
 * with a deck checks its layout with the deck shown, such as by a setting
 * its check's `before()` stores.
 */
export interface PhaserDeck {
  /**
   * The attribute of the board's element that lists the zones, such as
   * `data-deck`: each a name of one word and where the zone lies on the
   * canvas, as "x y width height" in CSS px, the zones parted by commas, as
   * "stick 0 600 180 200, buttons 180 600 180 200".
   */
  readonly drawnAt: string;
  /** The zones the deck shows, by the names it lists them by. */
  readonly zones: readonly string[];
  /** The least a zone may be across and down, in CSS px, for a thumb. */
  readonly least: number;
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
  const ratio = parseFloat(
    getComputedStyle(element).getPropertyValue("--pixel-ratio"),
  );
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

  const drawnAt = (element.getAttribute(board.drawnAt) ?? "")
    .split(" ")
    .map(Number);
  const [x = NaN, y = NaN, width = NaN, height = NaN] = drawnAt;
  if (drawnAt.length !== 4 || drawnAt.some((n) => !Number.isFinite(n))) {
    problems.push(
      `${board.element} doesn't say where the ${name} lies (${board.drawnAt}).`,
    );
    return { problems };
  }
  const box: BoardBox = {
    left: shown.left + x,
    top: shown.top + y,
    width,
    height,
    unit: width / board.across,
  };
  const down =
    typeof board.down === "number"
      ? board.down
      : parseFloat(getComputedStyle(element).getPropertyValue(board.down));
  if (!Number.isFinite(down)) {
    problems.push(`${board.element} gives no ${String(board.down)}.`);
  } else if (Math.abs(height - box.unit * down) > 0.5) {
    problems.push(
      `The ${name} is ${width} by ${height} CSS px, not ${board.across} units by ${down}.`,
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
 * Returns what is wrong with the deck a board's canvas draws beside the board
 * where it lies: a zone the deck names missing, unknown, unreadable or listed
 * twice, or one off the canvas, out of the window, over the board, another
 * zone or a control of the game bar, or smaller than the deck's least. It runs
 * in the page.
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
  for (const written of listed.split(",").map((zone) => zone.trim())) {
    if (written === "") continue;
    const [zone = "", ...at] = written.split(/\s+/);
    const [left = NaN, top = NaN, width = NaN, height = NaN] = at.map(Number);
    if (at.length !== 4 || ![left, top, width, height].every(Number.isFinite)) {
      problems.push(`The deck's zone "${written}" doesn't say where it lies.`);
    } else if (!deck.zones.includes(zone)) {
      problems.push(`The deck shows a zone its board doesn't name: ${zone}.`);
    } else if (zones.has(zone)) {
      problems.push(`The deck lists its ${zone} zone twice.`);
    } else {
      zones.set(zone, { left, top, width, height });
    }
  }
  for (const zone of deck.zones) {
    if (!zones.has(zone)) problems.push(`The deck shows no ${zone} zone.`);
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
