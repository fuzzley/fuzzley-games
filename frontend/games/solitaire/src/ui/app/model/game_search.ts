import { GameBrowserItem } from "./game_browser_item";
import {
  DIFFICULTY_LABELS,
  Difficulty,
  difficultyRange,
} from "./game_profile.model";

/**
 * Holds the facets the browser narrows its games by. A facet with nothing
 * chosen narrows nothing.
 */
export interface GameFilters {
  /** Shows the games that can be played at any of these difficulties. */
  readonly difficulties: readonly Difficulty[];
  /** Shows the games dealt from any of these numbers of decks. */
  readonly decks: readonly number[];
  /** Whether to show only the games with every card in view. */
  readonly allCardsVisible: boolean;
}

/** Filters that narrow nothing. */
export const NO_FILTERS: GameFilters = {
  difficulties: [],
  decks: [],
  allCardsVisible: false,
};

/** Describes a run of text, and whether the search matched it. */
export interface TextSegment {
  readonly text: string;
  readonly match: boolean;
}

/** Describes a game the search found, its name split around the matches. */
export interface GameSearchResult {
  readonly item: GameBrowserItem;
  readonly nameSegments: readonly TextSegment[];
}

/** Returns whether any facet narrows the games. */
export function hasFilters(filters: GameFilters): boolean {
  return (
    filters.difficulties.length > 0 ||
    filters.decks.length > 0 ||
    filters.allCardsVisible
  );
}

/**
 * Returns the games that pass the filters and match every word of the query,
 * best match first.
 *
 * A blank query matches every game, in the order given. Case, accents and
 * apostrophes are ignored, and a word of four letters or more still matches
 * a name with one letter wrong.
 */
export function searchGames(
  items: readonly GameBrowserItem[],
  query: string,
  filters: GameFilters,
): GameSearchResult[] {
  const passing = items.filter((item) => passesFilters(item, filters));
  const folded = fold(query).text;
  const words = folded.split(" ").filter(Boolean);
  if (words.length === 0) {
    return passing.map((item) => ({
      item,
      nameSegments: [{ text: item.name, match: false }],
    }));
  }

  return passing
    .map((item, order) => ({ item, order, score: score(item, folded, words) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ item }) => ({
      item,
      nameSegments: highlight(item.name, words),
    }));
}

/** Returns whether an item passes every facet of the filters. */
function passesFilters(item: GameBrowserItem, filters: GameFilters): boolean {
  const [easiest, hardest] = difficultyRange(item.difficulty);
  return (
    (filters.difficulties.length === 0 ||
      filters.difficulties.some((d) => d >= easiest && d <= hardest)) &&
    (filters.decks.length === 0 || filters.decks.includes(item.decks)) &&
    (!filters.allCardsVisible || item.allCardsVisible)
  );
}

/*
 * What each kind of match is worth. A word scores its best match, the item
 * sums its words, and matching the whole name tops that up.
 */
const EXACT_NAME = 200;
const NAME_PREFIX = 100;
const NAME_WORD = 60;
const NAME_WORD_PREFIX = 40;
const ALIAS = 35;
const NAME_INFIX = 20;
const RELATED = 15;
const TYPO = 10;
const DESCRIPTION = 5;

/**
 * Scores how well an item matches a query, or 0 if any word of the query
 * matches nothing.
 */
function score(
  item: GameBrowserItem,
  query: string,
  words: readonly string[],
): number {
  const name = fold(item.name).text;
  const nameWords = name.split(" ");
  const aliasWords = item.aliases.flatMap((alias) =>
    fold(alias).text.split(" "),
  );
  const relatedWords = wordsOf([item.parentName ?? "", item.family.name]);
  const descriptionWords = wordsOf([item.tagline, ...facetWords(item)]);

  let total = 0;
  for (const word of words) {
    const best = Math.max(
      nameWords.includes(word) ? NAME_WORD : 0,
      nameWords.some((w) => w.startsWith(word)) ? NAME_WORD_PREFIX : 0,
      aliasWords.some((w) => w.startsWith(word)) ? ALIAS : 0,
      name.includes(word) ? NAME_INFIX : 0,
      relatedWords.some((w) => w.startsWith(word)) ? RELATED : 0,
      [...nameWords, ...aliasWords].some((w) => isTypoOf(word, w)) ? TYPO : 0,
      descriptionWords.some((w) => w.startsWith(word)) ? DESCRIPTION : 0,
    );
    if (best === 0) return 0;
    total += best;
  }
  if (name === query) total += EXACT_NAME;
  else if (name.startsWith(query)) total += NAME_PREFIX;
  return total;
}

/** Returns the words a player might use to describe an item's facets. */
function facetWords(item: GameBrowserItem): string[] {
  const [easiest, hardest] = difficultyRange(item.difficulty);
  const difficulties = Object.values(Difficulty)
    .filter((d) => d >= easiest && d <= hardest)
    .map((d) => DIFFICULTY_LABELS[d]);
  const decks = item.decks === 2 ? "two decks" : "one deck";
  const visible = item.allCardsVisible ? "open face up" : "";
  return [...difficulties, decks, visible];
}

/** Returns the folded words of some texts. */
function wordsOf(texts: readonly string[]): string[] {
  return texts.flatMap((text) => fold(text).text.split(" ")).filter(Boolean);
}

/**
 * Returns whether a query word is a candidate word with a letter or two
 * wrong: one for a word of four letters or more, two from eight.
 */
function isTypoOf(word: string, candidate: string): boolean {
  if (word.length < 4) return false;
  const allowed = word.length >= 8 ? 2 : 1;
  return editDistance(word, candidate, allowed) <= allowed;
}

/**
 * Returns the number of single-letter insertions, deletions, substitutions
 * and adjacent swaps between two words, or `limit + 1` once it passes the
 * limit.
 */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  // Three rows of the dynamic programming table: two back, one back, current.
  let twoBack: number[] = [];
  let oneBack = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      let best = Math.min(
        (oneBack[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (oneBack[j - 1] ?? 0) + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charAt(i - 1) === b.charAt(j - 2) &&
        a.charAt(i - 2) === b.charAt(j - 1)
      ) {
        best = Math.min(best, (twoBack[j - 2] ?? 0) + 1);
      }
      current.push(best);
      rowMin = Math.min(rowMin, best);
    }
    if (rowMin > limit) return limit + 1;
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack[b.length] ?? limit + 1;
}

/**
 * Splits a name into the runs the query's words matched and the runs they
 * did not, marking each word where it starts a word of the name or, failing
 * that, wherever it appears.
 */
function highlight(name: string, words: readonly string[]): TextSegment[] {
  const { text, source } = fold(name);
  const marked = new Array<boolean>(name.length).fill(false);
  for (const word of words) {
    const atWordStart = new RegExp(`(?:^| )${escapeRegExp(word)}`, "g");
    let found = [...text.matchAll(atWordStart)].map(
      (match) => match.index + (match[0].startsWith(" ") ? 1 : 0),
    );
    if (found.length === 0) {
      const anywhere = text.indexOf(word);
      found = anywhere === -1 ? [] : [anywhere];
    }
    for (const start of found) {
      const from = source[start] ?? 0;
      const to = source[start + word.length - 1] ?? from;
      marked.fill(true, from, to + 1);
    }
  }

  const segments: TextSegment[] = [];
  for (let i = 0; i < name.length; i++) {
    const match = marked[i] ?? false;
    const last = segments.at(-1);
    if (last?.match === match) {
      segments[segments.length - 1] = {
        text: last.text + name.charAt(i),
        match,
      };
    } else {
      segments.push({ text: name.charAt(i), match });
    }
  }
  return segments;
}

/** Escapes the characters a regular expression treats specially. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Holds folded text, and where each of its characters came from. */
interface Folded {
  /** Lowercase letters and digits, one space between words. */
  readonly text: string;
  /** The index in the original text of each character of {@link text}. */
  readonly source: readonly number[];
}

/**
 * Folds text for comparison: lowercase, accents stripped, apostrophes
 * dropped so "baker's" reads as "bakers", and anything else that is not a
 * letter or digit treated as a gap between words.
 */
function fold(original: string): Folded {
  let text = "";
  const source: number[] = [];
  let gap = false;
  for (let i = 0; i < original.length; i++) {
    const char = original.charAt(i);
    if (char === "'" || char === "’") continue;
    const base = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    if (!/^[a-z0-9]+$/.test(base)) {
      gap = true;
      continue;
    }
    if (gap && text.length > 0) {
      text += " ";
      source.push(i);
    }
    gap = false;
    for (const letter of base) {
      text += letter;
      source.push(i);
    }
  }
  return { text, source };
}
