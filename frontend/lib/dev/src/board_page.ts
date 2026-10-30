// The inspection a layout check runs in the page of a board drawn with
// Phaser, sent as its source, so it uses nothing from outside itself.

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
  /** The board's height, in its units. */
  readonly down: number;
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
  if (Math.abs(height - box.unit * board.down) > 0.5) {
    problems.push(
      `The ${name} is ${width} by ${height} CSS px, not ${board.across} units by ${board.down}.`,
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
