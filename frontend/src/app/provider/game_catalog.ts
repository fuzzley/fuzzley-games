export type CategoryId = "solitaire" | "card-games" | "classics";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export interface Game {
  slug: string;
  name: string;
  category: CategoryId;
  blurb: string;
  players: string;
  /** Typical length of one game, e.g. "5 min". */
  time: string;
  /** ISO date the game went up on the site. */
  added: string;
  comingSoon?: boolean;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: "solitaire",
    name: "Solitaire",
    description: "Patience games for one player.",
  },
  {
    id: "card-games",
    name: "Card games",
    description: "Play against computer opponents.",
  },
  {
    id: "classics",
    name: "Classics",
    description: "Puzzles and board games beyond cards.",
  },
];

export const GAMES: readonly Game[] = [
  {
    slug: "klondike",
    name: "Klondike",
    category: "solitaire",
    blurb: "The classic. Build each suit up from the ace.",
    players: "Solo",
    time: "5 min",
    added: "2026-01-10",
  },
  {
    slug: "spider",
    name: "Spider",
    category: "solitaire",
    blurb: "Build runs from king to ace to clear the table.",
    players: "Solo",
    time: "15 min",
    added: "2026-01-24",
  },
  {
    slug: "freecell",
    name: "FreeCell",
    category: "solitaire",
    blurb: "Four free cells, and almost every deal can be won.",
    players: "Solo",
    time: "8 min",
    added: "2026-02-07",
  },
  {
    slug: "pyramid",
    name: "Pyramid",
    category: "solitaire",
    blurb: "Pair cards that add up to 13 to take the pyramid apart.",
    players: "Solo",
    time: "4 min",
    added: "2026-03-02",
  },
  {
    slug: "tripeaks",
    name: "TriPeaks",
    category: "solitaire",
    blurb: "Play one rank up or down to clear three peaks.",
    players: "Solo",
    time: "3 min",
    added: "2026-04-18",
  },
  {
    slug: "golf",
    name: "Golf",
    category: "solitaire",
    blurb: "Clear seven columns onto one pile, a rank at a time.",
    players: "Solo",
    time: "3 min",
    added: "2026-06-05",
  },
  {
    slug: "yukon",
    name: "Yukon",
    category: "solitaire",
    blurb: "Like Klondike, but you can move any face-up group.",
    players: "Solo",
    time: "8 min",
    added: "2026-10-02",
  },
  {
    slug: "hearts",
    name: "Hearts",
    category: "card-games",
    blurb: "Avoid hearts and the queen of spades, or take them all.",
    players: "4 players",
    time: "20 min",
    added: "2026-02-21",
  },
  {
    slug: "spades",
    name: "Spades",
    category: "card-games",
    blurb: "Bid your tricks with a partner, then make the contract.",
    players: "4 players",
    time: "25 min",
    added: "2026-03-16",
  },
  {
    slug: "crazy-eights",
    name: "Crazy Eights",
    category: "card-games",
    blurb: "Match the suit or the rank. Eights are wild.",
    players: "2–4 players",
    time: "5 min",
    added: "2026-04-04",
  },
  {
    slug: "gin-rummy",
    name: "Gin Rummy",
    category: "card-games",
    blurb: "Make sets and runs, then knock before your opponent does.",
    players: "2 players",
    time: "15 min",
    added: "2026-05-09",
  },
  {
    slug: "cribbage",
    name: "Cribbage",
    category: "card-games",
    blurb: "Count fifteens and runs, and peg your way to 121.",
    players: "2 players",
    time: "20 min",
    added: "2026-06-27",
  },
  {
    slug: "blackjack",
    name: "Blackjack",
    category: "card-games",
    blurb: "Get closer to 21 than the dealer without going over.",
    players: "Solo",
    time: "2 min",
    added: "2026-07-18",
  },
  {
    slug: "war",
    name: "War",
    category: "card-games",
    blurb: "Flip the top card. The higher card takes both.",
    players: "2 players",
    time: "5 min",
    added: "2026-08-08",
  },
  {
    slug: "go-fish",
    name: "Go Fish",
    category: "card-games",
    blurb: "Ask for ranks to collect sets of four.",
    players: "2–4 players",
    time: "5 min",
    added: "2026-08-29",
  },
  {
    slug: "minesweeper",
    name: "Minesweeper",
    category: "classics",
    blurb: "Clear the field using the numbers. Don’t hit a mine.",
    players: "Solo",
    time: "5 min",
    added: "2026-09-12",
  },
  {
    slug: "sudoku",
    name: "Sudoku",
    category: "classics",
    blurb: "Fill the grid so every row, column and box has 1 to 9.",
    players: "Solo",
    time: "10 min",
    added: "2026-10-11",
    comingSoon: true,
  },
  {
    slug: "reversi",
    name: "Reversi",
    category: "classics",
    blurb: "Flank your opponent’s discs to flip them to your colour.",
    players: "2 players",
    time: "10 min",
    added: "2026-10-11",
    comingSoon: true,
  },
];

/** How long a game keeps its "New" badge. */
const NEW_FOR_DAYS = 30;

export function isNew(game: Game, now = new Date()): boolean {
  if (game.comingSoon) return false;
  const ageMs = now.getTime() - new Date(game.added).getTime();
  return ageMs >= 0 && ageMs < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

/** Every word in the query has to appear in the name, category or blurb. */
export function matchesQuery(game: Game, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [
    game.name,
    findCategory(game.category)?.name ?? "",
    game.blurb,
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export function findGame(slug: string): Game | undefined {
  return GAMES.find((game) => game.slug === slug);
}

export function findCategory(id: string): Category | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export function gamesIn(category: CategoryId): Game[] {
  return GAMES.filter((game) => game.category === category);
}
