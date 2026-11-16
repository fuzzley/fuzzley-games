// Sorts an inventory entry into a category by where it was found.
//
// It is a first sort by rule, good enough to count and to read by, not a
// judgement of each string. extract.mjs calls it for every entry.

/** @import { Entry } from "./extract.mjs" */

/**
 * The categories, in the order the listings show them.
 *
 * The first four are documentation, read before or beside play; the next six
 * are in-game text, read during it; the last two are the pages around the
 * games.
 */
export const CATEGORIES = [
  { id: "how-to-play", group: "documentation", name: "How to play and rules" },
  {
    id: "reference",
    group: "documentation",
    name: "Reference: what each thing, option and variant does",
  },
  {
    id: "description",
    group: "documentation",
    name: "Descriptions: blurbs, taglines, page metadata and write-ups",
  },
  {
    id: "picture-text",
    group: "documentation",
    name: "Picture text: alt text and captions",
  },
  {
    id: "name",
    group: "in-game",
    name: "Names: games, modes, levels and things",
  },
  {
    id: "label",
    group: "in-game",
    name: "Labels: buttons, menus, headings, readouts and settings",
  },
  {
    id: "hint",
    group: "in-game",
    name: "Hints: setting descriptions, tooltips and prompts",
  },
  {
    id: "message",
    group: "in-game",
    name: "Messages: notices, confirmations, explanations and errors",
  },
  {
    id: "result",
    group: "in-game",
    name: "Results: win, lose, clear and records",
  },
  {
    id: "spoken",
    group: "in-game",
    name: "Spoken text: labels and announcements for screen readers",
  },
  {
    id: "site",
    group: "site",
    name: "Site furniture: navigation, footers, search and 404",
  },
  { id: "profile", group: "site", name: "Profile and work history" },
];

const NOT_SHOWN_CONTEXT =
  /^(new (Error|RangeError|TypeError|InjectionToken|Set)\(\)|throw|wrong\(\)|warn\(\)|fail\(\)|error\(\)|normalize\(\)|class:|timeZone:|"@type":|"--place-at":|tuningLines.*|boardHostOptions\(\)|inject\(\)|key:|id:|selector:|operatingSystem:|applicationCategory:|priceCurrency:|gamePlatform:|shortcutKeys =|sparkCore =|why =)$/;

const NOT_SHOWN_FILE =
  /(\/debug\/|\/debug_|debug_menu|debug_panel|json_reader|\/certificates|bug_report)/;

/**
 * Returns how many words a text holds, a binding counting as one.
 * @param {string} text
 * @returns {number}
 */
function wordCount(text) {
  return text
    .replace(/\{\{?[^}]*\}?\}/g, "x")
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Returns whether a text reads as a label rather than a sentence: short,
 * with no full stop.
 * @param {string} text
 * @returns {boolean}
 */
function isLabel(text) {
  return wordCount(text) <= 5 && !/[.!?]$/.test(text);
}

/**
 * Returns the category of fuzzley.info's text.
 * @param {Entry} entry
 * @returns {string}
 */
function categorizeSite(entry) {
  const { file, source, context, text } = entry;
  if (source === "yaml" || /data\/profile\.ts$/.test(file)) return "profile";
  if (/README\.md$/.test(file))
    return /^- \*\*\[/.test(text) ? "description" : "profile";
  if (/content\/projects\//.test(file)) {
    if (context === "title:") return "name";
    if (context === "playLabel:") return "label";
    if (/^(stack|kind|status|repo|playUrl|tint|cover):/.test(context))
      return "not-shown";
    return "description";
  }
  if (/cv\.astro|experience\.ts/.test(file)) return "profile";
  if (/description|summary|tagline|lede/.test(context)) return "description";
  return "site";
}

/**
 * Returns the category of an entry, or "not-shown" for what no player or
 * visitor reads.
 * @param {Entry} entry
 * @returns {string}
 */
export function categorize(entry) {
  const { file, source, context, text } = entry;

  if (/^(<|export const |light-dark\()/.test(text)) return "not-shown";
  if (source === "ts-string" && NOT_SHOWN_CONTEXT.test(context))
    return "not-shown";
  if (NOT_SHOWN_FILE.test(file) || /debug menu/.test(text)) return "not-shown";
  if (source === "template-binding") return "not-shown";

  if (/\balt\b|altText|coverAlt|image:alt/.test(context)) return "picture-text";
  if (/^caption/.test(context)) return "picture-text";

  // Sudoku's hints explain a step; they are shown as well as said.
  if (
    /sudoku\/src\/rules\/describe\.ts$/.test(file) &&
    /^(placementWords|eliminationWords|conclusion|text =|title:)/.test(context)
  )
    return "message";

  // Screen readers' text, wherever it sits.
  if (/aria-(label|description|roledescription|valuetext)/.test(context))
    return "spoken";
  if (
    /\/describe\.ts$/.test(file) ||
    /^(describe|say|move)[A-Za-z]*(\[\])?\(\)/.test(context) ||
    /^(Asteroid Breaker|Brick Breaker|Brick Fuzz Pop|Minefield|Sudoku), /.test(
      text,
    ) ||
    (/board\.component\.html$/.test(file) && wordCount(text) > 30) ||
    /crew_line\.ts$/.test(file)
  )
    return "spoken";

  if (entry.repo === "fuzzley") return categorizeSite(entry);

  if (
    source === "page-meta" ||
    source === "page-noscript" ||
    source === "manifest"
  )
    return /<title>|og:title|JSON-LD name|name:|<h1>/.test(context)
      ? "name"
      : "description";
  if (source === "markdown") return "description";

  if (entry.area === "site") {
    if (/provider\/(games|categories)\.ts$/.test(file))
      return /^(name|aliases\[\]):$/.test(context) ? "name" : "description";
    return "site";
  }

  // Solitaire's rules pages and catalog.
  if (/game_documentation_data\.ts$/.test(file)) {
    if (context === "title:") return "name";
    if (context === "effect:") return "reference";
    return "how-to-play";
  }
  if (/game_profile_data\.ts$/.test(file))
    return /^(name|aliases\[\]):$/.test(context) ? "name" : "description";
  if (/game_catalog\.ts$|board_catalog\.ts$/.test(file)) {
    if (/^(name|aliases\[\]|pilesName|term|sideName):$/.test(context))
      return "name";
    if (/^(tagline|blurb):$/.test(context)) return "description";
    if (context === "description:") return "hint";
    return isLabel(text) ? "label" : "hint";
  }

  // By the folder a game keeps its text in.
  if (/\/help\/|\/help_|game_help_modal|help_catalog|help_dialog/.test(file))
    return context === "about:" ? "reference" : "how-to-play";
  if (/^(about|effect):$/.test(context)) return "reference";
  if (/\/catalog\//.test(file) && context === "name:") return "name";
  if (
    /\/result\/|victory_overlay|end_words|\/stars\/|\/tally\.ts|\/bests\.ts/.test(
      file,
    )
  )
    return "result";
  if (/cleared|New best/.test(text) && isLabel(text)) return "result";
  if (/^title:$/.test(context) && /\?$/.test(text)) return "message";
  if (/^(message|asks|body|lost|restored):$/.test(context)) return "message";
  if (/^(name|aliases\[\]|modeName):$/.test(context)) return "name";
  if (/<[a-z-]+ \[?title\]?>|^title:$/.test(context)) return "hint";
  if (/^(description|hint|detail|says|kicker|line):$/.test(context))
    return "hint";
  if (/sector_card\.ts$/.test(file) && !isLabel(text)) return "hint";
  if (
    /^(Tap|Press|Swipe|Steer|Arrows|Click|Drag|Choose|or just)\b/.test(text) &&
    !isLabel(text)
  )
    return "hint";
  if (/\/panels\//.test(file)) return "label";
  if (
    /\/settings\/|settings_drawer|option_group|\/sectors\/|\/levels\//.test(
      file,
    )
  )
    return isLabel(text) ? "label" : "hint";
  return isLabel(text) ? "label" : "message";
}
