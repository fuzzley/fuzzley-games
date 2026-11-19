// Prints how one area's player text measures up to the `player-text` skill:
// every line over the budget for its kind, every line that trips a mark from
// the read-back list, and how often the words people's rules lean on turn up.
//
//   node docs/text-style/inventory/report.mjs games/snake
//   node docs/text-style/inventory/report.mjs site lib/game-ui
//   node docs/text-style/inventory/report.mjs --all
//
// It lists the text afresh first (extract.mjs --strings-only), so it reads
// the working tree as it is. Categories are sorted by rule and the patterns
// are rough nets, so read what it flags and decide; it is not a gate.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONSTRUCTIONS,
  plain,
  sentencesOf,
  wordsIn,
} from "./constructions.mjs";

/** @import { Entry } from "./extract.mjs" */

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, "extract.mjs"), "--strings-only"], {
  stdio: ["ignore", "ignore", "inherit"],
});

/** @type {Entry[]} */
const entries = JSON.parse(readFileSync(join(here, "strings.json"), "utf8"));
const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const all = process.argv.includes("--all");
const areas = new Set(entries.map((entry) => entry.area));
for (const area of wanted) {
  if (!areas.has(area)) {
    console.error(
      `No area "${area}". The areas are: ${[...areas].join(", ")}.`,
    );
    process.exit(1);
  }
}
if (!all && wanted.length === 0) {
  console.error(
    `Name an area, or pass --all. The areas are: ${[...areas].join(", ")}.`,
  );
  process.exit(1);
}
const chosen = entries.filter((entry) => all || wanted.includes(entry.area));

/**
 * Returns where an entry sits, as a path and a line an editor can open.
 * @param {Entry} entry
 * @returns {string}
 */
const where = (entry) => `${entry.file}:${entry.line}`;

/**
 * Returns a text cut to fit one line of the report.
 * @param {string} text
 * @returns {string}
 */
const short = (text) => (text.length > 150 ? `${text.slice(0, 147)}…` : text);

/**
 * Returns the longest sentence in a text, in words.
 * @param {string} text
 * @returns {number}
 */
const longestSentence = (text) =>
  Math.max(0, ...sentencesOf(plain(text)).map(wordsIn));

/**
 * The budget for each category, as the skill's table gives it.
 *
 * A category here is wider than a kind there, so each test takes the roomiest
 * limit of the kinds it holds.
 * @type {Record<string, { limit: string, over: (entry: Entry, words: number) => boolean }>}
 */
const BUDGETS = {
  "how-to-play": {
    limit:
      "a sentence over 25 words, or a paragraph over 100 (50 for a detail section)",
    over: (entry, words) => words > 100 || longestSentence(entry.text) > 25,
  },
  reference: {
    limit: "over 20 words",
    over: (_entry, words) => words > 20,
  },
  description: {
    limit:
      "a card blurb over 14 words, a meta description over 155 characters, or a sentence over 25 words",
    over: (entry, words) =>
      (entry.context === "blurb:" && words > 14) ||
      (/meta description|og:description|JSON-LD description/.test(
        entry.context,
      ) &&
        entry.text.length > 155) ||
      longestSentence(entry.text) > 25,
  },
  "picture-text": {
    limit: "over 15 words",
    over: (_entry, words) => words > 15,
  },
  name: { limit: "over 3 words", over: (_entry, words) => words > 3 },
  label: {
    limit: "over 3 words, or a full stop at the end",
    over: (entry, words) => words > 3 || /\.$/.test(entry.text),
  },
  hint: {
    limit: "over 2 sentences, or a sentence over 14 words",
    over: (entry) =>
      sentencesOf(plain(entry.text)).length > 2 ||
      longestSentence(entry.text) > 14,
  },
  message: {
    limit: "a sentence over 12 words",
    over: (entry) => longestSentence(entry.text) > 12,
  },
  result: {
    limit: "a sentence over 12 words",
    over: (entry) => longestSentence(entry.text) > 12,
  },
  spoken: {
    limit: "a sentence over 12 words",
    over: (entry) => longestSentence(entry.text) > 12,
  },
};

/**
 * The read-back list's marks that the plan's patterns do not count.
 * @type {readonly { id: string, name: string, pattern: RegExp }[]}
 */
const MORE_MARKS = [
  {
    id: "british",
    name: "British spelling",
    pattern:
      /\b(?:colou?red|colours?|grey|towards|centre[ds]?|cancelled|cancelling|whilst|amongst|favourites?|behaviour|neighbours?|travell(?:ed|ing)|metres?|licence)\b/gi,
  },
  {
    id: "title-case",
    name: "A Title Case label of two words or more",
    pattern:
      /^[A-Z][a-z’']+(?: (?:&|of|a|the|in|and|to))* [A-Z][a-z’']+(?: (?:[A-Z][a-z’']+|&|of|a|the|in|and|to))*$/g,
  },
  {
    id: "house-word",
    name: "A house word the word list replaces",
    pattern:
      /\b(?:in tow|puts? away|put away|calls? (?:a |the )?\w+ off|earths?\b|the bed\b|the deck\b|the bench\b|Ready card|(?:turns (?:off|back)|turn back)\b(?! (?:the |all )?(?:sound|music))|pays? double)/gi,
  },
];

/** The marks a line is flagged for: the plan's, less the words to use more. */
const MARKS = [
  ...CONSTRUCTIONS.filter(
    (construction) => !construction.people || construction.id === "number-word",
  ),
  ...MORE_MARKS,
];

/** Categories whose Title Case is a name's own, so it is not flagged. */
const TITLE_CASE_NAMES = new Set(["name", "site", "profile", "description"]);

/** Categories read as prose, where the words people's rules lean on belong. */
const PROSE = new Set(["how-to-play", "reference", "hint", "message"]);

const lines = [];
const totalWords = chosen.reduce(
  (sum, entry) => sum + wordsIn(plain(entry.text)),
  0,
);
lines.push(
  `${all ? "Every area" : wanted.join(", ")}: ${chosen.length} entries, ${totalWords} words`,
  "",
);

lines.push("== Over budget", "");
let overCount = 0;
for (const [category, budget] of Object.entries(BUDGETS)) {
  const over = chosen.filter(
    (entry) =>
      entry.category === category &&
      budget.over(entry, wordsIn(plain(entry.text))),
  );
  if (over.length === 0) continue;
  overCount += over.length;
  lines.push(`${category} (${budget.limit}): ${over.length}`);
  for (const entry of over)
    lines.push(
      `  ${where(entry)}  [${wordsIn(plain(entry.text))} words] ${short(entry.text)}`,
    );
  lines.push("");
}
if (overCount === 0) lines.push("Nothing.", "");

lines.push("== Marks from the read-back list", "");
let markCount = 0;
for (const mark of MARKS) {
  const hits = [];
  for (const entry of chosen) {
    if (mark.id === "title-case" && TITLE_CASE_NAMES.has(entry.category ?? ""))
      continue;
    // The keys read to a screen reader are a list of "Key: action." items.
    if (mark.id === "colon" && entry.category === "spoken") continue;
    let found = plain(entry.text).match(mark.pattern);
    // A deck is a real thing in a card game, and so is a pile's label.
    if (found && mark.id === "house-word" && entry.area === "games/solitaire")
      found = found.filter((word) => !/^the deck$/i.test(word));
    if (found?.length === 0) found = null;
    if (found) hits.push({ entry, found });
  }
  if (hits.length === 0) continue;
  const count = hits.reduce((sum, hit) => sum + hit.found.length, 0);
  markCount += count;
  lines.push(
    `${mark.id === "label-colon" ? "A lead-in and a colon (fine as a pile's label, not as a rule's title)" : mark.name}: ${count}`,
  );
  for (const { entry, found } of hits)
    lines.push(
      `  ${where(entry)}  «${[...new Set(found)].join("» «")}»  ${short(entry.text)}`,
    );
  lines.push("");
}
if (markCount === 0) lines.push("None.", "");

const prose = chosen.filter((entry) => PROSE.has(entry.category ?? ""));
const proseText = prose.map((entry) => plain(entry.text));
const proseWords = proseText.reduce((sum, text) => sum + wordsIn(text), 0);
lines.push(
  "== The words people's rules lean on",
  "",
  `In help, catalogs, hints and messages: ${proseWords} words.`,
  "Manuals written by people have, per 1,000 words: if 8.1, when 3.4, can 10.0, you can 5.7, will 11.0, you/your 25.6.",
  "",
);
for (const id of ["if", "when", "can", "you-can", "will", "you"]) {
  const construction = CONSTRUCTIONS.find((each) => each.id === id);
  if (!construction) continue;
  const count = proseText.reduce(
    (sum, text) => sum + (text.match(construction.pattern)?.length ?? 0),
    0,
  );
  const rate = proseWords === 0 ? 0 : (count * 1000) / proseWords;
  lines.push(`  ${construction.name}: ${count} (${rate.toFixed(1)} per 1,000)`);
}
const sentences = proseText.flatMap(sentencesOf).map(wordsIn);
if (sentences.length > 0) {
  const mean =
    sentences.reduce((sum, length) => sum + length, 0) / sentences.length;
  lines.push(
    "",
    `  Sentences: ${sentences.length}, ${mean.toFixed(1)} words on average, ${sentences.filter((length) => length > 25).length} over 25 words.`,
  );
}

console.log(lines.join("\n"));
