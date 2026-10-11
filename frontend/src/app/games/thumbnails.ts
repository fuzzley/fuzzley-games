/**
 * Each game's thumbnail is a drawing of its real starting layout (Klondike's
 * seven columns, a Minesweeper grid), described as shapes in a 160 × 100 box.
 * Felt and card backs are left to the palette; anything else carries its own
 * colour.
 */
export type Shape =
  | { kind: 'face'; x: number; y: number; w: number; h: number; rank: string; suit: string }
  | { kind: 'back'; x: number; y: number; w: number; h: number; rotate?: number }
  | { kind: 'slot'; x: number; y: number; w: number; h: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; ring?: boolean }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { kind: 'text'; x: number; y: number; size: number; text: string; fill: string; weight?: number; middle?: boolean }
  | { kind: 'path'; d: string; stroke: string; fill: string; width: number };

export interface Thumbnail {
  /** A fixed background, for games not played on a card table. */
  board?: string;
  shapes: Shape[];
}

export const RED_SUITS = new Set(['♥', '♦']);

const DECK = ['A♠', 'K♥', '7♣', 'Q♦', '3♠', '10♥', '5♦', 'J♣', '9♠', '2♥', '8♦', '4♣', '6♥', 'Q♠', '9♦', 'A♥', 'J♠', '3♦', 'K♣', '7♥', '5♠', '10♦', '8♣', '2♠', '6♦', '4♥', 'Q♣', 'K♠', 'A♦', '9♣'];

/** Draws with a deterministic run of cards, so a thumbnail never changes. */
class Sketch {
  readonly shapes: Shape[] = [];
  private next: number;

  constructor(seed: number) {
    this.next = seed;
  }

  card(): string {
    return DECK[this.next++ % DECK.length];
  }

  face(x: number, y: number, w: number, h: number, card = this.card()): this {
    this.shapes.push({ kind: 'face', x, y, w, h, rank: card.slice(0, -1), suit: card.slice(-1) });
    return this;
  }

  back(x: number, y: number, w: number, h: number, rotate?: number): this {
    this.shapes.push({ kind: 'back', x, y, w, h, rotate });
    return this;
  }

  slot(x: number, y: number, w: number, h: number): this {
    this.shapes.push({ kind: 'slot', x, y, w, h });
    return this;
  }

  /** A run of face-up cards, each `step` to the right of the last. */
  hand(x: number, y: number, count: number, w: number, h: number, step: number): this {
    for (let i = 0; i < count; i++) this.face(x + i * step, y, w, h);
    return this;
  }

  /** A run of face-down cards, each offset by `dx`, `dy`. */
  backs(x: number, y: number, count: number, w: number, h: number, dx: number, dy: number): this {
    for (let i = 0; i < count; i++) this.back(x + i * dx, y + i * dy, w, h);
    return this;
  }

  add(...shapes: Shape[]): this {
    this.shapes.push(...shapes);
    return this;
  }

  /** A small dark pill with a label, such as a score. */
  pill(text: string): this {
    return this.add(
      { kind: 'rect', x: 114, y: 4, w: 34, h: 12, rx: 6, fill: 'rgba(0,0,0,.35)' },
      { kind: 'text', x: 131, y: 12.5, size: 7, text, fill: '#fff', middle: true },
    );
  }
}

/** Hearts and Spades share a table: four hands and a trick in the middle. */
function trickTable(s: Sketch, trick: [string, string, string]): Sketch {
  return s
    .backs(56, 3, 7, 11, 15, 6, 0)
    .backs(4, 26, 5, 15, 11, 0, 6)
    .backs(141, 26, 5, 15, 11, 0, 6)
    .face(73, 24, 14, 19, trick[0])
    .face(60, 34, 14, 19, trick[1])
    .face(86, 34, 14, 19, trick[2])
    .hand(36, 72, 8, 16, 22, 11);
}

const DRAW: Record<string, (s: Sketch) => Sketch | Thumbnail> = {
  klondike(s) {
    s.back(8, 6, 16, 22).face(27, 6, 16, 22);
    for (let i = 0; i < 4; i++) s.slot(71 + i * 21, 6, 16, 22);
    for (let c = 0; c < 7; c++) s.backs(8 + c * 21, 33, c, 16, 22, 0, 3).face(8 + c * 21, 33 + c * 3, 16, 22);
    return s;
  },
  spider(s) {
    for (let c = 0; c < 10; c++) {
      const hidden = c < 4 ? 5 : 4;
      s.backs(6 + c * 15, 6, hidden, 13, 18, 0, 3).face(6 + c * 15, 6 + hidden * 3, 13, 18);
    }
    return s.backs(130, 72, 4, 13, 18, 1.5, 0);
  },
  freecell(s) {
    for (let i = 0; i < 4; i++) {
      if (i === 1) s.face(6 + i * 18, 5, 15, 21);
      else s.slot(6 + i * 18, 5, 15, 21);
    }
    ['A♠', 'A♥', '2♦'].forEach((card, i) => s.face(84 + i * 18, 5, 15, 21, card));
    s.slot(138, 5, 15, 21);
    for (let c = 0; c < 8; c++) {
      for (let r = 0; r < (c < 4 ? 7 : 6); r++) s.face(7 + c * 19, 32 + r * 6, 15, 21);
    }
    return s;
  },
  pyramid(s) {
    for (let r = 0; r < 7; r++) {
      for (let i = 0; i <= r; i++) s.face(80 - (r + 1) * 7.5 + i * 15, 4 + r * 9.5, 14, 19);
    }
    return s.back(8, 74, 14, 19).face(25, 74, 14, 19);
  },
  tripeaks(s) {
    for (let k = 0; k < 3; k++) s.back(31 + 42 * k, 4, 13, 18);
    for (let k = 0; k < 3; k++) s.back(24 + 42 * k, 13, 13, 18).back(38 + 42 * k, 13, 13, 18);
    for (let j = 0; j < 9; j++) s.back(17 + 14 * j, 22, 13, 18);
    for (let i = 0; i < 10; i++) s.face(10 + 14 * i, 31, 13, 18);
    return s.backs(58, 70, 3, 14, 20, 1.5, 0).face(84, 70, 14, 20);
  },
  golf(s) {
    for (let c = 0; c < 7; c++) for (let r = 0; r < 5; r++) s.face(8 + c * 21, 5 + r * 7, 16, 22);
    return s.backs(54, 70, 3, 16, 22, 1.5, 0).face(80, 70, 16, 22);
  },
  yukon(s) {
    for (let c = 0; c < 7; c++) {
      s.backs(8 + c * 21, 6, c, 16, 22, 0, 3);
      for (let r = 0; r < (c === 0 ? 1 : 5); r++) s.face(8 + c * 21, 6 + c * 3 + r * 6, 16, 22);
    }
    return s;
  },
  hearts: (s) => trickTable(s, ['Q♠', '9♥', 'K♥']).pill('13 pts'),
  spades: (s) => trickTable(s, ['A♠', '4♠', 'K♦']).pill('Bid 4'),
  'crazy-eights': (s) =>
    s.backs(46, 4, 6, 12, 16, 7, 0).backs(50, 36, 3, 16, 22, 1.2, -1).face(80, 35, 16, 22, '8♣').hand(30, 70, 7, 16, 22, 15),
  'gin-rummy': (s) =>
    s
      .backs(28, 4, 10, 12, 16, 10, 0)
      .backs(56, 36, 3, 16, 22, 1.2, -1)
      .face(82, 35, 16, 22, '7♦')
      .hand(18, 70, 3, 16, 22, 9)
      .hand(52, 70, 4, 16, 22, 9)
      .hand(98, 70, 3, 16, 22, 9),
  cribbage(s) {
    s.add({ kind: 'rect', x: 10, y: 8, w: 140, h: 34, rx: 6, fill: '#c99b62' });
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 30; i++) {
        s.add({ kind: 'circle', cx: 18 + i * 4.4 + Math.floor(i / 5) * 1.6, cy: 16 + row * 9, r: 1.1, fill: '#6b4a25' });
      }
    }
    s.add({ kind: 'circle', cx: 62, cy: 16, r: 2.4, fill: '#c62828' }, { kind: 'circle', cx: 96, cy: 25, r: 2.4, fill: '#1e5bd8' });
    return s.hand(30, 58, 4, 18, 25, 14).backs(104, 58, 4, 18, 25, 2, 0);
  },
  blackjack(s) {
    s.face(62, 8, 16, 22, 'K♣').back(81, 8, 16, 22).face(64, 60, 16, 22, '9♥').face(74, 64, 16, 22, 'A♠');
    s.add(
      { kind: 'circle', cx: 30, cy: 76, r: 5.5, fill: '#c62828', ring: true },
      { kind: 'circle', cx: 34, cy: 72, r: 5.5, fill: '#c62828', ring: true },
      { kind: 'circle', cx: 42, cy: 80, r: 5.5, fill: '#1e5bd8', ring: true },
      { kind: 'text', x: 80, y: 52, size: 7, text: '20', fill: 'rgba(255,255,255,.75)', middle: true },
    );
    return s;
  },
  war: (s) => s.backs(14, 34, 5, 18, 25, 1.4, -1).face(54, 38, 18, 25, 'J♦').face(88, 38, 18, 25, '9♠').backs(124, 34, 5, 18, 25, -1.4, -1),
  'go-fish'(s) {
    const pond: [number, number, number][] = [[48, 22, -14], [64, 18, 9], [80, 26, -4], [94, 20, 16], [70, 34, 22], [56, 36, -8], [88, 38, 4]];
    pond.forEach(([x, y, r]) => s.back(x, y, 14, 19, r));
    ['5♣', '5♥', '5♠', '5♦'].forEach((card, i) => s.face(8 + i * 5, 6 + i * 2, 13, 18, card));
    return s.hand(40, 70, 6, 16, 22, 14);
  },
  minesweeper() {
    const grid = ['0001xx1000', '0001221000', '1110001110', 'xx10001x10', 'x210001110', '1100000011', '00000000xx'];
    const colours: Record<string, string> = { '1': '#1e5bd8', '2': '#2e7d32', '3': '#c62828' };
    const shapes: Shape[] = [];
    grid.forEach((row, r) =>
      [...row].forEach((cell, c) => {
        const x = 10 + c * 14;
        const y = 4 + r * 13;
        shapes.push({ kind: 'rect', x, y, w: 13, h: 12, rx: 1, fill: cell === 'x' ? '#9aa4b0' : '#eef1f4' });
        if (colours[cell]) {
          shapes.push({ kind: 'text', x: x + 6.5, y: y + 9, size: 8, weight: 800, text: cell, fill: colours[cell], middle: true });
        }
      }),
    );
    shapes.push({ kind: 'path', d: 'M28 43 v7 M28 43 l5 2 -5 2', stroke: '#c62828', fill: '#c62828', width: 1.4 });
    return { board: '#c9cfd6', shapes };
  },
  sudoku() {
    const shapes: Shape[] = [{ kind: 'rect', x: 35, y: 5, w: 90, h: 90, rx: 0, fill: '#fff' }];
    for (let i = 0; i <= 9; i++) {
      const width = i % 3 === 0 ? 0.9 : 0.3;
      shapes.push(
        { kind: 'line', x1: 35 + i * 10, y1: 5, x2: 35 + i * 10, y2: 95, stroke: '#1b1f24', width },
        { kind: 'line', x1: 35, y1: 5 + i * 10, x2: 125, y2: 5 + i * 10, stroke: '#1b1f24', width },
      );
    }
    const given = [[0, 0, 5], [1, 0, 3], [4, 0, 7], [0, 1, 6], [3, 1, 1], [4, 1, 9], [5, 1, 5], [1, 2, 9], [2, 2, 8], [7, 2, 6], [0, 3, 8], [4, 3, 6], [8, 3, 3], [0, 4, 4], [3, 4, 8], [5, 4, 3], [8, 4, 1], [0, 5, 7], [4, 5, 2], [8, 5, 6], [1, 6, 6], [6, 6, 2], [7, 6, 8], [3, 7, 4], [4, 7, 1], [5, 7, 9], [8, 7, 5], [4, 8, 8], [7, 8, 7], [8, 8, 9]];
    given.forEach(([c, r, n]) => shapes.push({ kind: 'text', x: 40 + c * 10, y: 12.5 + r * 10, size: 7, text: String(n), fill: '#1b1f24', middle: true }));
    return { board: '#e9ecef', shapes };
  },
  reversi() {
    const shapes: Shape[] = [{ kind: 'rect', x: 38, y: 8, w: 84, h: 84, rx: 0, fill: '#2f8a5b' }];
    for (let i = 0; i <= 8; i++) {
      shapes.push(
        { kind: 'line', x1: 38 + i * 10.5, y1: 8, x2: 38 + i * 10.5, y2: 92, stroke: '#1f5c3c', width: 0.6 },
        { kind: 'line', x1: 38, y1: 8 + i * 10.5, x2: 122, y2: 8 + i * 10.5, stroke: '#1f5c3c', width: 0.6 },
      );
    }
    const discs: [number, number, boolean][] = [[3, 3, true], [4, 4, true], [3, 4, false], [4, 3, false], [2, 3, false], [5, 4, true], [4, 5, false], [2, 2, true], [5, 2, false]];
    discs.forEach(([c, r, white]) =>
      shapes.push({ kind: 'circle', cx: 43.25 + c * 10.5, cy: 13.25 + r * 10.5, r: 4.3, fill: white ? '#f4f4f4' : '#1b1f24' }),
    );
    return { board: '#1f6b45', shapes };
  },
};

const cache = new Map<string, Thumbnail>();

/** The thumbnail for a game; an empty felt table if none is drawn yet. */
export function thumbnailFor(slug: string): Thumbnail {
  let thumbnail = cache.get(slug);
  if (!thumbnail) {
    const drawn = DRAW[slug]?.(new Sketch(slug.length * 3));
    thumbnail = drawn instanceof Sketch ? { shapes: drawn.shapes } : (drawn ?? { shapes: [] });
    cache.set(slug, thumbnail);
  }
  return thumbnail;
}

export function hasThumbnail(slug: string): boolean {
  return slug in DRAW;
}
