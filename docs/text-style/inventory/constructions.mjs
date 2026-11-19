// The constructions the plan counts, and how text is cut into sentences and
// words to count them.
//
// measure.mjs and report.mjs both read these, so the two always count the
// same way.

/**
 * The constructions counted, each with the pattern that finds it.
 *
 * The first group marks the older voice and the second the newer one, as the
 * plan describes them. A pattern is a rough net: it is run the same way over
 * our text and the manuals, so the rates compare, but a single count can hold
 * a few lines a reader would not call that construction.
 * @type {readonly { id: string, name: string, pattern: RegExp, people?: boolean }[]}
 */
export const CONSTRUCTIONS = [
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
    // "Goes on a black 10" and "can go on a King" are how a card is placed.
    pattern:
      /\bgo(?:es|ing)? on\b(?! and on)(?! (?:a|an|the|any|its|it|top)\b)/gi,
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
export function plain(text) {
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
export function sentencesOf(text) {
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
export function wordsIn(text) {
  return text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
}
