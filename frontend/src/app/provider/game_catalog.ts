export type CategoryId = "solitaire" | "classics";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

/**
 * Names a game in one of the builds served under /play/, which
 * frontend/games.json pins.
 */
export interface PlayLocation {
  /** The build, by its name in games.json. */
  build: "solitaire";
  /** The game's id in that build, which picks it by hash route. */
  id: string;
}

export interface Game {
  slug: string;
  name: string;
  category: CategoryId;
  blurb: string;
  /** Other names to find it by, such as its rule variants. */
  aliases?: readonly string[];
  players: string;
  /** Typical length of one game, e.g. "5 min". */
  time: string;
  /** ISO date the game went up on the site. */
  added: string;
  /** Where the game is played. A game without one is coming soon. */
  play?: PlayLocation;
}

/** The day the site opened with its first games, which aren't badged as new. */
const LAUNCHED = "2026-10-17";

export const CATEGORIES: readonly Category[] = [
  {
    id: "solitaire",
    name: "Solitaire",
    description: "Patience games for one player.",
  },
  {
    id: "classics",
    name: "Classics",
    description: "Coming soon: puzzles and board games beyond cards.",
  },
];

/** Returns a game from the Solitaire Collection, served at /play/solitaire/. */
function solitaire(
  id: string,
  game: Pick<Game, "slug" | "name" | "blurb" | "aliases" | "time">,
): Game {
  return {
    ...game,
    category: "solitaire",
    players: "Solo",
    added: LAUNCHED,
    play: { build: "solitaire", id },
  };
}

export const GAMES: readonly Game[] = [
  solitaire("klondike", {
    slug: "klondike",
    name: "Klondike",
    blurb: "The classic: turn the stock, build down in alternating colours.",
    aliases: ["Whitehead", "Thumb and Pouch", "Saratoga"],
    time: "5 min",
  }),
  solitaire("spider", {
    slug: "spider",
    name: "Spider",
    blurb: "Build King-to-Ace runs by suit across ten columns.",
    time: "15 min",
  }),
  solitaire("freecell", {
    slug: "freecell",
    name: "FreeCell",
    blurb: "Every card face-up, with four cells to park cards in.",
    time: "8 min",
  }),
  solitaire("pyramid", {
    slug: "pyramid",
    name: "Pyramid",
    blurb: "Pair free cards totalling thirteen to take the pyramid apart.",
    aliases: ["Relaxed Pyramid"],
    time: "4 min",
  }),
  solitaire("tripeaks", {
    slug: "tripeaks",
    name: "TriPeaks",
    blurb: "Clear three peaks onto the waste, a rank up or down at a time.",
    aliases: ["Three Peaks", "Tri Towers"],
    time: "3 min",
  }),
  solitaire("golf", {
    slug: "golf",
    name: "Golf",
    blurb: "Play cards a rank up or down onto one pile to clear seven columns.",
    aliases: ["Queens on Kings", "Putt Putt"],
    time: "3 min",
  }),
  solitaire("yukon", {
    slug: "yukon",
    name: "Yukon",
    blurb: "No stock: move any face-up card with everything on it.",
    aliases: ["Alaska", "Russian Solitaire", "Moosehide"],
    time: "8 min",
  }),
  solitaire("bakers", {
    slug: "bakers-game",
    name: "Baker’s Game",
    blurb: "FreeCell’s ancestor: columns build in a single suit.",
    time: "8 min",
  }),
  solitaire("challengefreecell", {
    slug: "challenge-freecell",
    name: "Challenge FreeCell",
    blurb: "FreeCell with every Ace and Two dealt to the bottom.",
    aliases: ["Super Challenge FreeCell"],
    time: "10 min",
  }),
  solitaire("eightoff", {
    slug: "eight-off",
    name: "Eight Off",
    blurb: "Eight cells, half of them filled, and same-suit columns.",
    time: "8 min",
  }),
  solitaire("scorpion", {
    slug: "scorpion",
    name: "Scorpion",
    blurb: "Drag any face-up card to build Spider’s same-suit runs.",
    aliases: ["Wasp", "Scorpion II"],
    time: "10 min",
  }),
  solitaire("simplesimon", {
    slug: "simple-simon",
    name: "Simple Simon",
    blurb: "Spider on an open board: every card face-up, no stock.",
    time: "10 min",
  }),
  solitaire("mrsmop", {
    slug: "mrs-mop",
    name: "Mrs. Mop",
    blurb: "Two decks dealt face-up across thirteen columns, no stock.",
    time: "20 min",
  }),
  solitaire("bakersdozen", {
    slug: "bakers-dozen",
    name: "Baker’s Dozen",
    blurb: "Thirteen open columns, Kings sunk, and spaces never refill.",
    time: "8 min",
  }),
  solitaire("seahaven", {
    slug: "seahaven-towers",
    name: "Seahaven Towers",
    blurb: "Ten columns and four cells, building in suit, Kings to spaces.",
    time: "8 min",
  }),
  solitaire("fortythieves", {
    slug: "forty-thieves",
    name: "Forty Thieves",
    blurb: "One card at a time, from a waste that never recycles.",
    aliases: ["Josephine", "Streets", "Rank and File", "Indian", "Number Ten"],
    time: "15 min",
  }),
  solitaire("maria", {
    slug: "maria",
    name: "Maria",
    blurb: "Forty Thieves on nine columns, in alternating colours.",
    time: "15 min",
  }),
  solitaire("limited", {
    slug: "limited",
    name: "Limited",
    blurb: "Forty Thieves spread over twelve shallow columns.",
    time: "15 min",
  }),
  solitaire("lucas", {
    slug: "lucas",
    name: "Lucas",
    blurb: "Thirteen columns of three, with the Aces already home.",
    time: "15 min",
  }),
  solitaire("montana", {
    slug: "montana",
    name: "Montana",
    blurb: "Move cards into the gaps to sort four rows of thirteen.",
    aliases: ["Gaps", "Addiction"],
    time: "10 min",
  }),
  solitaire("bluemoon", {
    slug: "blue-moon",
    name: "Blue Moon",
    blurb: "Montana with the Aces in play, fixed at the head of each row.",
    aliases: ["Red Moon"],
    time: "10 min",
  }),
  solitaire("doubleklondike", {
    slug: "double-klondike",
    name: "Double Klondike",
    blurb: "Klondike from two decks, on nine columns.",
    time: "15 min",
  }),
  solitaire("easthaven", {
    slug: "easthaven",
    name: "Easthaven",
    blurb: "Klondike’s building with Spider’s row-dealing stock.",
    time: "8 min",
  }),
  solitaire("spiderette", {
    slug: "spiderette",
    name: "Spiderette",
    blurb: "One-deck Spider on seven columns.",
    aliases: ["Will o’ the Wisp"],
    time: "8 min",
  }),
  solitaire("bisley", {
    slug: "bisley",
    name: "Bisley",
    blurb: "Build each suit up from its Ace and down from its King.",
    time: "8 min",
  }),
  solitaire("acesup", {
    slug: "aces-up",
    name: "Aces Up",
    blurb: "Discard every card a higher card of its suit outranks.",
    time: "3 min",
  }),
  solitaire("calculation", {
    slug: "calculation",
    name: "Calculation",
    blurb: "Build four foundations by ones, twos, threes and fours.",
    aliases: ["Broken Intervals", "Sir Tommy", "Old Patience"],
    time: "10 min",
  }),
  solitaire("flowergarden", {
    slug: "flower-garden",
    name: "Flower Garden",
    blurb: "Six beds and a sixteen-card bouquet, every bouquet card in play.",
    aliases: ["The Garden", "Bouquet"],
    time: "8 min",
  }),
  solitaire("bristol", {
    slug: "bristol",
    name: "Bristol",
    blurb: "Eight fans and three reserves the stock deals onto.",
    aliases: ["Belvedere"],
    time: "8 min",
  }),
  solitaire("nestor", {
    slug: "nestor",
    name: "Nestor",
    blurb: "Pair free cards of the same rank until the board is clear.",
    time: "4 min",
  }),
  solitaire("montecarlo", {
    slug: "monte-carlo",
    name: "Monte Carlo",
    blurb: "Pair touching cards in a five-by-five grid, then close it up.",
    aliases: ["Weddings", "Monte Carlo Thirteens"],
    time: "4 min",
  }),
  solitaire("labellelucie", {
    slug: "la-belle-lucie",
    name: "La Belle Lucie",
    blurb: "Eighteen fans built down in suit, with two redeals.",
    aliases: ["Fair Lucy", "Midnight Oil", "The Fan", "Shamrocks"],
    time: "8 min",
  }),
  solitaire("trefoil", {
    slug: "trefoil",
    name: "Trefoil",
    blurb: "La Belle Lucie with the Aces already on the foundations.",
    time: "8 min",
  }),
  solitaire("canfield", {
    slug: "canfield",
    name: "Canfield",
    blurb: "Work through a thirteen-card reserve onto foundations of any rank.",
    aliases: [
      "Demon",
      "Fascination",
      "Storehouse",
      "Thirteen Up",
      "Superior Canfield",
      "Rainbow",
    ],
    time: "6 min",
  }),
  solitaire("penguin", {
    slug: "penguin",
    name: "Penguin",
    blurb: "Seven columns in suit, a seven-cell flipper, and a dealt beak.",
    time: "8 min",
  }),
  solitaire("blackhole", {
    slug: "black-hole",
    name: "Black Hole",
    blurb: "Play every card into the hole, a rank up or down round the corner.",
    time: "4 min",
  }),
  solitaire("allinarow", {
    slug: "all-in-a-row",
    name: "All in a Row",
    blurb: "Thirteen columns of four, played onto one pile from any start.",
    time: "4 min",
  }),
  solitaire("grandfathersclock", {
    slug: "grandfathers-clock",
    name: "Grandfather’s Clock",
    blurb: "Build twelve foundations round a dial, each to its hour.",
    aliases: ["Clock"],
    time: "5 min",
  }),
  solitaire("beleagueredcastle", {
    slug: "beleaguered-castle",
    name: "Beleaguered Castle",
    blurb: "Eight open rows around the Aces, one card at a time.",
    aliases: ["Streets and Alleys", "Citadel"],
    time: "8 min",
  }),
  solitaire("fortress", {
    slug: "fortress",
    name: "Fortress",
    blurb: "Ten open rows built up or down in suit, Aces buried.",
    time: "8 min",
  }),
  solitaire("pokersquares", {
    slug: "poker-squares",
    name: "Poker Squares",
    blurb: "Place 25 cards in a grid to make ten poker hands.",
    aliases: ["Poker Solitaire"],
    time: "5 min",
  }),
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
  },
  {
    slug: "reversi",
    name: "Reversi",
    category: "classics",
    blurb: "Flank your opponent’s discs to flip them to your colour.",
    players: "2 players",
    time: "10 min",
    added: "2026-10-11",
  },
];

/** How long a game keeps its "New" badge. */
const NEW_FOR_DAYS = 30;

/** Returns whether a game went up recently, after the site opened. */
export function isNew(game: Game, now = new Date()): boolean {
  if (!game.play || game.added <= LAUNCHED) return false;
  const ageMs = now.getTime() - new Date(game.added).getTime();
  return ageMs >= 0 && ageMs < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Every word in the query has to appear in the name, category, blurb or an
 * alias. Apostrophes don't count, so "bakers" finds Baker’s Game.
 */
export function matchesQuery(game: Game, query: string): boolean {
  const fold = (text: string) => text.toLowerCase().replace(/['’]/g, "");
  const words = fold(query).split(/\s+/).filter(Boolean);
  const haystack = fold(
    [
      game.name,
      findCategory(game.category)?.name ?? "",
      game.blurb,
      ...(game.aliases ?? []),
    ].join(" "),
  );
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

/** Returns the address a game is played at. */
export function playUrl(play: PlayLocation): string {
  return `/play/${play.build}/#/${play.id}`;
}

/**
 * Returns a screenshot of a new deal, as the build ships it: `thumb` is the
 * board alone, `preview` the whole screen.
 */
export function screenshotUrl(
  play: PlayLocation,
  kind: "thumb" | "preview",
): string {
  return `/play/${play.build}/docs/screenshots/${play.id}/${kind}.webp`;
}
