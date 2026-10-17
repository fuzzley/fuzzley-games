/**
 * Each thumbnail drawn here is a game's real starting layout (a Minesweeper
 * grid, a Sudoku), described as shapes in a 160 × 100 box. Only games not yet
 * playable are drawn: a game the site hosts shows its build's own screenshot
 * instead (see `screenshotUrl`).
 */
export type Shape =
  | {
      kind: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      rx: number;
      fill: string;
    }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string }
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      width: number;
    }
  | {
      kind: "text";
      x: number;
      y: number;
      size: number;
      text: string;
      fill: string;
      weight?: number;
      middle?: boolean;
    }
  | { kind: "path"; d: string; stroke: string; fill: string; width: number };

export interface Thumbnail {
  /** A fixed background, for games not played on a card table. */
  board?: string;
  shapes: Shape[];
}

const DRAW: Record<string, () => Thumbnail> = {
  minesweeper() {
    const grid = [
      "0001xx1000",
      "0001221000",
      "1110001110",
      "xx10001x10",
      "x210001110",
      "1100000011",
      "00000000xx",
    ];
    const colours: Record<string, string> = {
      "1": "#1e5bd8",
      "2": "#2e7d32",
      "3": "#c62828",
    };
    const shapes: Shape[] = [];
    grid.forEach((row, r) =>
      [...row].forEach((cell, c) => {
        const x = 10 + c * 14;
        const y = 4 + r * 13;
        shapes.push({
          kind: "rect",
          x,
          y,
          w: 13,
          h: 12,
          rx: 1,
          fill: cell === "x" ? "#9aa4b0" : "#eef1f4",
        });
        if (colours[cell]) {
          shapes.push({
            kind: "text",
            x: x + 6.5,
            y: y + 9,
            size: 8,
            weight: 800,
            text: cell,
            fill: colours[cell],
            middle: true,
          });
        }
      }),
    );
    shapes.push({
      kind: "path",
      d: "M28 43 v7 M28 43 l5 2 -5 2",
      stroke: "#c62828",
      fill: "#c62828",
      width: 1.4,
    });
    return { board: "#c9cfd6", shapes };
  },
  sudoku() {
    const shapes: Shape[] = [
      { kind: "rect", x: 35, y: 5, w: 90, h: 90, rx: 0, fill: "#fff" },
    ];
    for (let i = 0; i <= 9; i++) {
      const width = i % 3 === 0 ? 0.9 : 0.3;
      shapes.push(
        {
          kind: "line",
          x1: 35 + i * 10,
          y1: 5,
          x2: 35 + i * 10,
          y2: 95,
          stroke: "#1b1f24",
          width,
        },
        {
          kind: "line",
          x1: 35,
          y1: 5 + i * 10,
          x2: 125,
          y2: 5 + i * 10,
          stroke: "#1b1f24",
          width,
        },
      );
    }
    const given = [
      [0, 0, 5],
      [1, 0, 3],
      [4, 0, 7],
      [0, 1, 6],
      [3, 1, 1],
      [4, 1, 9],
      [5, 1, 5],
      [1, 2, 9],
      [2, 2, 8],
      [7, 2, 6],
      [0, 3, 8],
      [4, 3, 6],
      [8, 3, 3],
      [0, 4, 4],
      [3, 4, 8],
      [5, 4, 3],
      [8, 4, 1],
      [0, 5, 7],
      [4, 5, 2],
      [8, 5, 6],
      [1, 6, 6],
      [6, 6, 2],
      [7, 6, 8],
      [3, 7, 4],
      [4, 7, 1],
      [5, 7, 9],
      [8, 7, 5],
      [4, 8, 8],
      [7, 8, 7],
      [8, 8, 9],
    ];
    given.forEach(([c, r, n]) =>
      shapes.push({
        kind: "text",
        x: 40 + c * 10,
        y: 12.5 + r * 10,
        size: 7,
        text: String(n),
        fill: "#1b1f24",
        middle: true,
      }),
    );
    return { board: "#e9ecef", shapes };
  },
  reversi() {
    const shapes: Shape[] = [
      { kind: "rect", x: 38, y: 8, w: 84, h: 84, rx: 0, fill: "#2f8a5b" },
    ];
    for (let i = 0; i <= 8; i++) {
      shapes.push(
        {
          kind: "line",
          x1: 38 + i * 10.5,
          y1: 8,
          x2: 38 + i * 10.5,
          y2: 92,
          stroke: "#1f5c3c",
          width: 0.6,
        },
        {
          kind: "line",
          x1: 38,
          y1: 8 + i * 10.5,
          x2: 122,
          y2: 8 + i * 10.5,
          stroke: "#1f5c3c",
          width: 0.6,
        },
      );
    }
    const discs: [number, number, boolean][] = [
      [3, 3, true],
      [4, 4, true],
      [3, 4, false],
      [4, 3, false],
      [2, 3, false],
      [5, 4, true],
      [4, 5, false],
      [2, 2, true],
      [5, 2, false],
    ];
    discs.forEach(([c, r, white]) =>
      shapes.push({
        kind: "circle",
        cx: 43.25 + c * 10.5,
        cy: 13.25 + r * 10.5,
        r: 4.3,
        fill: white ? "#f4f4f4" : "#1b1f24",
      }),
    );
    return { board: "#1f6b45", shapes };
  },
};

const cache = new Map<string, Thumbnail>();

/** The thumbnail for a game; an empty felt table if none is drawn. */
export function thumbnailFor(slug: string): Thumbnail {
  let thumbnail = cache.get(slug);
  if (!thumbnail) {
    thumbnail = DRAW[slug]?.() ?? { shapes: [] };
    cache.set(slug, thumbnail);
  }
  return thumbnail;
}

export function hasThumbnail(slug: string): boolean {
  return slug in DRAW;
}
