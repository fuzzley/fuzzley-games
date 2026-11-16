// Measures how the inventory's text is written: sentence length, punctuation
// and the constructions the plan names, by category and by game, beside the
// same measures of a few manuals people wrote for open-source games.
//
//   node docs/text-style/inventory/extract.mjs
//   node docs/text-style/inventory/measure.mjs
//
// It reads strings.json and writes measures.md beside it. The manuals are
// fetched as it runs, each at a fixed commit, and only their numbers are
// kept. It stops if one cannot be fetched, since the plan quotes their
// columns. With --offline it leaves them all out.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @import { Entry } from "./extract.mjs" */

const here = dirname(fileURLToPath(import.meta.url));
const prettier = createRequire(resolve(here, "../../../frontend/package.json"))(
  "prettier",
);

/** @type {Entry[]} */
const entries = JSON.parse(readFileSync(join(here, "strings.json"), "utf8"));

/**
 * The constructions counted, each with the pattern that finds it.
 *
 * The first group marks the older voice and the second the newer one, as the
 * plan describes them. A pattern is a rough net: it is run the same way over
 * our text and the manuals, so the rates compare, but a single count can hold
 * a few lines a reader would not call that construction.
 * @type {readonly { id: string, name: string, pattern: RegExp, people?: boolean }[]}
 */
const CONSTRUCTIONS = [
  {
    id: "caps",
    name: "A word in capitals for stress (UP, SAME SUIT)",
    pattern:
      /\b[A-Z]{2,}(?: [A-Z]{2,})*\b(?<!\b(?:OK|ID|URL|WPF|IVR|HTML|PHP|LLM|UI|CV|IT|NET|SCORE|TIME|MOVES|II|NFD))/g,
  },
  {
    id: "label-colon",
    name: "A Title Case lead-in and a colon (Stock Recycle: …)",
    pattern:
      /^(?:[A-Z][A-Za-z’'-]*)(?: (?:[A-Z&][A-Za-z’'-]*|of|a|the|in|and|to))*: \S/g,
  },
  {
    id: "stock-words",
    name: "Stock words (initially, respectively, automatically, successfully, e.g., configurable, valid, simply)",
    pattern:
      /\b(initially|respectively|automatically|successfully|configurable|valid|simply|immediately|directly accessible|highly|fast-paced|signature|strategic|challenge|ensure[sd]?|allow(s|ing)? you to|in order to|e\.g\.,?|i\.e\.,?)\b/gi,
  },
  {
    id: "are-you-sure",
    name: "Are you sure / Congratulations / will be lost",
    pattern:
      /\b(Are you sure|Congratulations|current progress will be lost)\b/g,
  },
  { id: "em-dash", name: "Em dash", pattern: /—/g },
  { id: "semicolon", name: "Semicolon", pattern: /;/g },
  {
    id: "colon",
    name: "Colon inside a sentence",
    pattern: /(?<=[a-z0-9)}]): (?=[a-z{])/g,
  },
  {
    id: "as-clause",
    name: "“as” for when or how (as it breaks, as a rock does)",
    pattern:
      /\bas (?:it|its|the|a|an|they|each|you|one|every|static|the charge)\b(?! (?:much|many|long|far|often|soon|well|if|though))/gi,
  },
  {
    id: "does-as",
    name: "“as … does” and “do as … do”",
    pattern:
      /\b(?:as [^.;:]{1,40}? (?:does|do|did|is|are|was)\b(?=[.,;:]| unless)|do(?:es)? as\b)/gi,
  },
  {
    id: "thing-possessive",
    name: "A thing’s possessive (the floor’s row, the level’s boon)",
    pattern:
      /\b(?:the|a|an|its|each|every|that|this) (?:[a-z-]+ ){0,2}[a-z-]+[’']s (?!own\b)[a-z]/g,
  },
  {
    id: "wh-ever",
    name: "whichever, whatever, wherever, however (as a pronoun)",
    pattern: /\b(?:whichever|whatever|wherever)\b/gi,
  },
  {
    id: "go-on",
    name: "“go on” for resume or continue",
    pattern: /\bgo(?:es|ing)? on\b(?! and on)/gi,
  },
  {
    id: "by-itself",
    name: "“by itself”, “of its own”, “alone” after a noun",
    pattern: /\b(?:by itself|of its own|of your own|alone\b(?=[.,;:]))/gi,
  },
  {
    id: "personified",
    name: "A thing given a person’s verb (holds, wears, waits, stands, lets, says, asks, keeps, pays, sheds, earths, vents)",
    // Not after "you", "and", "to" and the like, where the verb is the player's.
    pattern:
      /\b(?!(?:you|we|i|they|who|and|or|to|then|can|will|must|not|do|please)\b)[a-z’']+ (?:holds?|wears?|waits?|stands?|lets?|says?|asks?|keeps?|pays?|sheds?|earths?|vents?)\b/gi,
  },
  {
    id: "absolute",
    name: "A trailing phrase with no verb (…, paused. …, physics included.)",
    pattern:
      /, (?:[a-z’']+ ){0,3}(?:included|paused|unhurt|alone|charged|among them)[.,;]/gi,
  },
  {
    id: "finger-keys",
    name: "A key named by the finger that rests on it",
    pattern: /\bfinger(?:’s|'s)? (?:home )?key|home keys?\b/gi,
  },
  {
    id: "triple",
    name: "Three things in a row (a, b and c)",
    // Each of one to three words, none of them "and" or "or", and not the
    // tail of a longer list.
    pattern:
      /(?<!, (?:[\w’'-]+ ){0,2})\b(?!(?:and|or)\b)[\w’'-]+(?: (?!(?:and|or)\b)[\w’'-]+){0,2}, (?!(?:and|or)\b)[\w’'-]+(?: (?!(?:and|or)\b)[\w’'-]+){0,2},? (?:and|or) [\w’'-]+/g,
  },
  // The words people's rules lean on, counted to see whether ours use them.
  { id: "if", name: "if", pattern: /\bif\b/gi, people: true },
  { id: "when", name: "when", pattern: /\bwhen\b/gi, people: true },
  { id: "can", name: "can", pattern: /\bcan\b/gi, people: true },
  { id: "you-can", name: "you can", pattern: /\byou can\b/gi, people: true },
  {
    id: "will",
    name: "will, for what the game does next",
    pattern: /\bwill\b/gi,
    people: true,
  },
  { id: "must", name: "must", pattern: /\bmust\b/gi, people: true },
  { id: "you", name: "you, your", pattern: /\byou(?:r|rs)?\b/gi, people: true },
  {
    id: "contraction",
    name: "A contraction (don’t, you’ll, it’s)",
    pattern:
      /\b\w+(?:n[’']t|[’']ll|[’']re|[’']ve)\b|\b(?:it|that|there|here|what)[’']s\b/gi,
    people: true,
  },
  { id: "exclamation", name: "Exclamation mark", pattern: /!/g, people: true },
  { id: "bracket", name: "Brackets", pattern: /\(/g, people: true },
  {
    id: "numeral",
    name: "A count in figures",
    pattern: /(?<![\w.])\d+(?![\w.])/g,
    people: true,
  },
  {
    id: "number-word",
    name: "A count in words (two to fifty)",
    pattern:
      /\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|sixteen|seventeen|eighteen|twenty|thirty|forty|fifty)\b/gi,
    people: true,
  },
];

/**
 * Returns text with its bindings made single words and its marks dropped.
 * @param {string} text
 * @returns {string}
 */
function plain(text) {
  return text
    .replace(/\{\{[^}]*\}\}/g, "N")
    .replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "N")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]{1,12})\]/g, "$1")
    .replace(/\\([_<>|])/g, "$1");
}

/**
 * Returns a text's sentences.
 * @param {string} text
 * @returns {string[]}
 */
function sentencesOf(text) {
  return text
    .split(/(?<=[.!?])["”)]?\s+(?=[A-Z“"(\d])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[A-Za-z]/.test(sentence));
}

/**
 * Returns how many words a text holds.
 * @param {string} text
 * @returns {number}
 */
function wordsIn(text) {
  return text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

/**
 * Returns roughly how many syllables a word holds.
 * @param {string} word
 * @returns {number}
 */
function syllables(word) {
  const letters = word.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length <= 3) return letters === "" ? 0 : 1;
  const groups = letters
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/**
 * @typedef {object} Measures
 * @property {number} texts
 * @property {number} words
 * @property {number} sentences
 * @property {number} mean Words a sentence, on average.
 * @property {number} median
 * @property {number} p90
 * @property {number} longest
 * @property {number} over25 The share of sentences of 25 words or more.
 * @property {number} commas Commas a sentence.
 * @property {number} grade The Flesch-Kincaid grade, roughly.
 * @property {Record<string, number>} per1000 Each construction, per
 *   thousand words.
 * @property {Record<string, number>} counts
 */

/**
 * Returns the measures of some texts read as prose.
 * @param {readonly string[]} texts
 * @returns {Measures}
 */
function measure(texts) {
  const cleaned = texts.map(plain);
  const sentences = cleaned.flatMap(sentencesOf);
  const lengths = sentences.map(wordsIn).sort((a, b) => a - b);
  const words = lengths.reduce((sum, length) => sum + length, 0);
  const all = cleaned.join("\n");
  const syllableCount = all
    .split(/\s+/)
    .reduce((sum, word) => sum + syllables(word), 0);
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {Record<string, number>} */
  const per1000 = {};
  for (const { id, pattern } of CONSTRUCTIONS) {
    counts[id] = cleaned.reduce(
      (sum, text) => sum + (text.match(pattern)?.length ?? 0),
      0,
    );
    per1000[id] = words === 0 ? 0 : (counts[id] * 1000) / words;
  }
  /**
   * @param {number} share
   * @returns {number}
   */
  const at = (share) =>
    lengths[Math.min(lengths.length - 1, Math.floor(lengths.length * share))] ??
    0;
  return {
    texts: texts.length,
    words,
    sentences: sentences.length,
    mean: sentences.length === 0 ? 0 : words / sentences.length,
    median: at(0.5),
    p90: at(0.9),
    longest: lengths.at(-1) ?? 0,
    over25:
      sentences.length === 0
        ? 0
        : lengths.filter((length) => length >= 25).length / sentences.length,
    commas:
      sentences.length === 0
        ? 0
        : (all.match(/,/g)?.length ?? 0) / sentences.length,
    grade:
      sentences.length === 0 || words === 0
        ? 0
        : 0.39 * (words / sentences.length) +
          11.8 * (syllableCount / words) -
          15.59,
    per1000,
    counts,
  };
}

/**
 * Returns a number to one decimal place, or a dash for none.
 * @param {number} value
 * @returns {string}
 */
const one = (value) => (value === 0 ? "–" : value.toFixed(1));

/**
 * Returns whether an entry is prose to measure: a sentence, not a label.
 * @param {Entry} entry
 * @returns {boolean}
 */
const isSentence = (entry) =>
  /[.!?]$/.test(entry.text) || wordsIn(plain(entry.text)) >= 8;

// ---------------------------------------------------------------------------
// Manuals people wrote, for comparison

/**
 * Manuals under free licences, by people, for games like these.
 *
 * Each is read at a fixed commit, and only its measures are kept.
 * @type {readonly { name: string, url: string }[]}
 */
const MANUALS = [
  {
    name: "AisleRiot: Klondike (GNOME, 2001)",
    url: "https://raw.githubusercontent.com/GNOME/aisleriot/51e1d770ceddfa7ee0fd775f7d59bbe4858ab87a/help/C/klondike.xml",
  },
  {
    name: "AisleRiot: FreeCell",
    url: "https://raw.githubusercontent.com/GNOME/aisleriot/51e1d770ceddfa7ee0fd775f7d59bbe4858ab87a/help/C/freecell.xml",
  },
  {
    name: "AisleRiot: Spider",
    url: "https://raw.githubusercontent.com/GNOME/aisleriot/51e1d770ceddfa7ee0fd775f7d59bbe4858ab87a/help/C/spider.xml",
  },
  {
    name: "AisleRiot: Golf",
    url: "https://raw.githubusercontent.com/GNOME/aisleriot/51e1d770ceddfa7ee0fd775f7d59bbe4858ab87a/help/C/golf.xml",
  },
  {
    name: "KBreakOut handbook (KDE)",
    url: "https://invent.kde.org/games/kbreakout/-/raw/11edcd51baadcdce9a5ecc64099d06a1fff7da5b/doc/index.docbook",
  },
  {
    name: "KMines handbook (KDE)",
    url: "https://invent.kde.org/games/kmines/-/raw/fd7d4e418667c1be3851053ffdb9e060307bf51a/doc/index.docbook",
  },
  {
    name: "KSudoku handbook (KDE)",
    url: "https://invent.kde.org/games/ksudoku/-/raw/364bbfd86fe52a56aeea88468f6b03344015c7a2/doc/index.docbook",
  },
  {
    name: "KSnakeDuel handbook (KDE)",
    url: "https://invent.kde.org/games/ksnakeduel/-/raw/c7b02798a616fde7d1a9513edd44a0a2bdc8eea7/doc/index.docbook",
  },
  {
    name: "Simon Tatham’s Puzzles manual (Mines, Solo and the rest)",
    url: "https://raw.githubusercontent.com/ghewgill/puzzles/01c3e382d9c7013f0bb4eb9f1ff2d19bb05d4241/puzzles.but",
  },
];

/**
 * Returns a manual's paragraphs as plain text.
 * @param {string} source DocBook, Mallard or Halibut.
 * @returns {string[]}
 */
function paragraphsOf(source) {
  if (/^\\(?:title|cfg|C)\{/m.test(source)) {
    // Halibut: paragraphs are blank-line separated, commands in backslashes.
    return source
      .split(/\n\s*\n/)
      .filter(
        (block) =>
          !/^\\(?:cfg|define|title|versionid|copyright|IM|c |H|C|A|S|U)\b/.test(
            block.trim(),
          ),
      )
      .map((block) =>
        block
          .replace(/\\(?:dt|dd|b|lcont|rcont)\b/g, " ")
          .replace(/\\[A-Za-z]+\{([^{}]*)\}/g, "$1")
          .replace(/\\[A-Za-z]+\{([^{}]*)\}/g, "$1")
          .replace(/\\[A-Za-z]+\b|[{}]/g, " ")
          .replace(/\\-/g, "-")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((block) => wordsIn(block) >= 5);
  }
  const body = source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<(bookinfo|sect1info|legalnotice|authorgroup|copyright|chapter id="credits"|appendix)[\s\S]*?<\/\1>/g,
      " ",
    );
  return [...body.matchAll(/<(para|p|entry)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((match) =>
      match[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/&([a-z]+);/gi, (_, name) =>
          name === "amp" ? "&" : name === "nbsp" ? " " : name,
        )
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((block) => wordsIn(block) >= 5);
}

/** @type {{ name: string, measures: Measures }[]} */
const manuals = [];
if (!process.argv.includes("--offline")) {
  for (const manual of MANUALS) {
    try {
      const response = await fetch(manual.url);
      if (!response.ok) throw new Error(String(response.status));
      const paragraphs = paragraphsOf(await response.text());
      manuals.push({ name: manual.name, measures: measure(paragraphs) });
    } catch (error) {
      console.error(
        `Could not fetch ${manual.name} (${String(error)}). Run again, or pass --offline to leave the manuals out.`,
      );
      process.exit(1);
    }
  }
}

// ---------------------------------------------------------------------------
// The report

/** @type {string[]} */
const out = [
  "# Text inventory: measures",
  "",
  "Written by `measure.mjs`; do not edit by hand. Sentences are measured only",
  "in entries that read as prose (a full stop, or eight words or more); a",
  "value put in, such as `{{ score }}`, counts as one word. The grade is the",
  "Flesch-Kincaid grade, worked out roughly.",
  "",
];

/**
 * Adds a table of measures, one row a group.
 * @param {string} title
 * @param {readonly { name: string, measures: Measures }[]} rows
 * @returns {void}
 */
function sentenceTable(title, rows) {
  out.push(
    `## ${title}`,
    "",
    "| | Words | Sentences | Mean | Median | 9 in 10 under | Longest | 25 words or more | Commas a sentence | Semicolons per 1,000 words | Colons per 1,000 | Em dashes per 1,000 | Grade |",
    "| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |",
  );
  for (const { name, measures: m } of rows) {
    if (m.sentences === 0) continue;
    out.push(
      `| ${name} | ${m.words} | ${m.sentences} | ${one(m.mean)} | ${m.median} | ${m.p90} | ${m.longest} | ${Math.round(m.over25 * 100)}% | ${one(m.commas)} | ${one(m.per1000.semicolon ?? 0)} | ${one(m.per1000.colon ?? 0)} | ${one(m.per1000["em-dash"] ?? 0)} | ${one(m.grade)} |`,
    );
  }
  out.push("");
}

/**
 * Returns the prose of the entries a test picks.
 * @param {(entry: Entry) => boolean} test
 * @returns {string[]}
 */
const prose = (test) =>
  entries
    .filter((entry) => test(entry) && isSentence(entry))
    .map((e) => e.text);

const GAMES = [
  ["Solitaire Collection", "games/solitaire"],
  ["Minesweeper", "games/minesweeper"],
  ["Sudoku", "games/sudoku"],
  ["Snake", "games/snake"],
  ["Brick Breaker", "games/brick-breaker"],
  ["Asteroid Breaker", "games/asteroid-breaker"],
  ["Brick Fuzz Pop", "games/brick-fuzz-pop"],
];

sentenceTable(
  "How to play, by game",
  GAMES.map(([name, area]) => ({
    name,
    measures: measure(
      prose((e) => e.area === area && e.category === "how-to-play"),
    ),
  })),
);

sentenceTable(
  "Every category, all games and both sites",
  [
    "how-to-play",
    "reference",
    "description",
    "picture-text",
    "hint",
    "message",
    "spoken",
    "site",
    "profile",
  ].map((category) => ({
    name: category,
    measures: measure(prose((e) => e.category === category)),
  })),
);

if (manuals.length > 0) {
  sentenceTable("Manuals people wrote, for comparison", [
    ...manuals,
    {
      name: "**All of them**",
      measures: (() => {
        const words = manuals.reduce((sum, m) => sum + m.measures.words, 0);
        const sentences = manuals.reduce(
          (sum, m) => sum + m.measures.sentences,
          0,
        );
        /**
         * @param {(m: Measures) => number} pick
         * @returns {number}
         */
        const weighted = (pick) =>
          manuals.reduce(
            (sum, m) => sum + pick(m.measures) * m.measures.sentences,
            0,
          ) / sentences;
        /** @type {Record<string, number>} */
        const per1000 = {};
        /** @type {Record<string, number>} */
        const counts = {};
        for (const { id } of CONSTRUCTIONS) {
          counts[id] = manuals.reduce(
            (sum, m) => sum + (m.measures.counts[id] ?? 0),
            0,
          );
          per1000[id] = (counts[id] * 1000) / words;
        }
        return {
          texts: 0,
          words,
          sentences,
          mean: words / sentences,
          median: Math.round(weighted((m) => m.median)),
          p90: Math.round(weighted((m) => m.p90)),
          longest: Math.max(...manuals.map((m) => m.measures.longest)),
          over25: weighted((m) => m.over25),
          commas: weighted((m) => m.commas),
          grade: weighted((m) => m.grade),
          per1000,
          counts,
        };
      })(),
    },
  ]);
}

// Constructions, per thousand words, by where they are.
const GROUPS = [
  {
    name: "Solitaire: rules and options",
    test: (/** @type {Entry} */ e) =>
      e.area === "games/solitaire" &&
      ["how-to-play", "reference", "hint"].includes(e.category ?? ""),
  },
  {
    name: "Solitaire: the rest",
    test: (/** @type {Entry} */ e) =>
      e.area === "games/solitaire" &&
      !["how-to-play", "reference", "hint", "name"].includes(e.category ?? ""),
  },
  {
    name: "Minesweeper, Sudoku, Snake",
    test: (/** @type {Entry} */ e) =>
      /games\/(minesweeper|sudoku|snake)/.test(e.area) && e.category !== "name",
  },
  {
    name: "Brick Breaker, Asteroid Breaker, Brick Fuzz Pop",
    test: (/** @type {Entry} */ e) =>
      /games\/(brick-breaker|asteroid-breaker|brick-fuzz-pop)/.test(e.area) &&
      e.category !== "name",
  },
  {
    name: "fuzzley.games site and shared libraries",
    test: (/** @type {Entry} */ e) =>
      (e.area === "site" || /^lib\//.test(e.area)) && e.category !== "name",
  },
  {
    name: "fuzzley.info",
    test: (/** @type {Entry} */ e) => e.repo === "fuzzley",
  },
];
const grouped = GROUPS.map((group) => ({
  name: group.name,
  measures: measure(entries.filter(group.test).map((e) => e.text)),
}));
const manualsTogether =
  manuals.length === 0
    ? []
    : [
        {
          name: "Manuals people wrote",
          measures: (() => {
            const words = manuals.reduce((sum, m) => sum + m.measures.words, 0);
            /** @type {Record<string, number>} */
            const per1000 = {};
            /** @type {Record<string, number>} */
            const counts = {};
            for (const { id } of CONSTRUCTIONS) {
              counts[id] = manuals.reduce(
                (sum, m) => sum + (m.measures.counts[id] ?? 0),
                0,
              );
              per1000[id] = (counts[id] * 1000) / words;
            }
            return { ...manuals[0].measures, words, per1000, counts };
          })(),
        },
      ];
const columns = [...grouped, ...manualsTogether];

out.push(
  "## Constructions, per thousand words",
  "",
  "Every entry counts here, labels included. The count is in brackets.",
  "",
  `| Construction | ${columns.map((c) => c.name).join(" | ")} |`,
  `| --- | ${columns.map(() => "--:").join(" | ")} |`,
  `| Words | ${columns.map((c) => c.measures.words).join(" | ")} |`,
);
/**
 * Adds a row for each construction a test picks.
 * @param {(construction: (typeof CONSTRUCTIONS)[number]) => boolean} test
 * @param {readonly { name: string, measures: Measures }[]} across
 * @returns {void}
 */
function constructionRows(test, across) {
  for (const construction of CONSTRUCTIONS.filter(test)) {
    const { id, name } = construction;
    out.push(
      `| ${name} | ${across
        .map((c) =>
          (c.measures.counts[id] ?? 0) === 0
            ? "–"
            : `${one(c.measures.per1000[id] ?? 0)} (${c.measures.counts[id]})`,
        )
        .join(" | ")} |`,
    );
  }
  out.push("");
}
constructionRows((construction) => !construction.people, columns);

// The words people's rules lean on, in help, catalogs and hints alone.
const helpColumns = [
  {
    name: "Solitaire",
    measures: measure(
      entries
        .filter(
          (e) =>
            e.area === "games/solitaire" &&
            ["how-to-play", "reference", "hint"].includes(e.category ?? ""),
        )
        .map((e) => e.text),
    ),
  },
  {
    name: "The six newer games",
    measures: measure(
      entries
        .filter(
          (e) =>
            /games\/(minesweeper|sudoku|snake|brick-breaker|asteroid-breaker|brick-fuzz-pop)/.test(
              e.area,
            ) &&
            ["how-to-play", "reference", "hint"].includes(e.category ?? ""),
        )
        .map((e) => e.text),
    ),
  },
  ...manualsTogether,
];
out.push(
  "## The words people’s rules lean on, per thousand words",
  "",
  "How to play, the catalogs and the hints under settings. The count is in",
  "brackets.",
  "",
  `| | ${helpColumns.map((c) => c.name).join(" | ")} |`,
  `| --- | ${helpColumns.map(() => "--:").join(" | ")} |`,
  `| Words | ${helpColumns.map((c) => c.measures.words).join(" | ")} |`,
);
constructionRows((construction) => construction.people === true, helpColumns);

// How labels are cased.
/**
 * Returns how a label is cased.
 * @param {string} text
 * @returns {string}
 */
function caseOf(text) {
  const words = plain(text)
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word));
  if (words.length < 2) return "one word";
  if (words.every((word) => word === word.toUpperCase())) return "ALL CAPS";
  const small = /^(a|an|and|as|at|by|for|from|in|of|on|or|the|to|with)$/;
  const rest = words.slice(1).filter((word) => !small.test(word));
  if (rest.length > 0 && rest.every((word) => /^[A-Z]/.test(word)))
    return "Title Case";
  return "Sentence case";
}
out.push(
  "## How labels and hints of two words or more are cased",
  "",
  "Names of games, variants and people are left out by category, not by",
  "reading each, so a Title Case count holds a few proper names.",
  "",
  "| | Sentence case | Title Case | ALL CAPS |",
  "| --- | --: | --: | --: |",
);
for (const [name, area] of [
  ...GAMES,
  ["Site and shared libraries", "site|lib"],
  ["fuzzley.info", "fuzzley.info"],
]) {
  /** @type {Record<string, number>} */
  const tally = {};
  for (const entry of entries) {
    if (!new RegExp(`^(${area})`).test(entry.area)) continue;
    if (!["label", "hint", "site", "result"].includes(entry.category ?? ""))
      continue;
    if (wordsIn(plain(entry.text)) > 6) continue;
    const cased = caseOf(entry.text);
    tally[cased] = (tally[cased] ?? 0) + 1;
  }
  out.push(
    `| ${name} | ${tally["Sentence case"] ?? "–"} | ${tally["Title Case"] ?? "–"} | ${tally["ALL CAPS"] ?? "–"} |`,
  );
}
out.push("");

// The same words in more than one place.
/** @type {Map<string, Entry[]>} */
const byText = new Map();
for (const entry of entries) {
  if (wordsIn(plain(entry.text)) < 6) continue;
  const list = byText.get(entry.text) ?? [];
  list.push(entry);
  byText.set(entry.text, list);
}
const repeated = [...byText.values()].filter((list) => list.length > 1);
out.push(
  "## The same sentence kept in more than one place",
  "",
  `${repeated.length} texts of six words or more are written out more than once, ${repeated.reduce((sum, list) => sum + list.length, 0)} entries in all. The most repeated:`,
  "",
);
for (const list of repeated.sort((a, b) => b.length - a.length).slice(0, 12)) {
  const first = list[0];
  if (!first) continue;
  out.push(
    `- ${list.length} times: “${first.text.slice(0, 110)}${first.text.length > 110 ? "…" : ""}” (${[...new Set(list.map((e) => e.file.replace(/^frontend\//, "")))].slice(0, 3).join(", ")})`,
  );
}
out.push("");

// Spellings that differ.
const SPELLINGS = [
  ["color", /\bcolors?\b/gi, "colour", /\bcolours?\b/gi],
  ["toward", /\btoward\b/gi, "towards", /\btowards\b/gi],
  ["face-up", /\bface-up\b/gi, "face up", /\bface up\b/gi],
  ["How to play", /How to play/g, "How to Play", /How to Play/g],
  ["Settings", /\bSettings\b/g, "Game Options", /Game [Oo]ptions/g],
];
out.push(
  "## Spellings and names that differ",
  "",
  "| One way | Count | The other | Count |",
  "| --- | --: | --- | --: |",
);
for (const [a, patternA, b, patternB] of SPELLINGS) {
  /**
   * @param {RegExp} pattern
   * @returns {number}
   */
  const count = (pattern) =>
    entries.reduce((sum, e) => sum + (e.text.match(pattern)?.length ?? 0), 0);
  out.push(
    `| ${String(a)} | ${count(/** @type {RegExp} */ (patternA))} | ${String(b)} | ${count(/** @type {RegExp} */ (patternB))} |`,
  );
}
out.push("");

writeFileSync(
  join(here, "measures.md"),
  await prettier.format(out.join("\n"), { parser: "markdown" }),
);
console.log(
  `Measured ${entries.length} entries and ${manuals.length} manuals.`,
);
