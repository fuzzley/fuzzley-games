// Lists every piece of text a player or visitor can read, in fuzzley-games
// and, when it is checked out beside it, fuzzley: template text and
// attributes, prose-like strings in TypeScript, page metadata, and the
// Markdown and YAML that pages are built from.
//
//   node docs/text-style/inventory/extract.mjs
//
// It writes strings.json (every entry) and counts.md beside itself, and one
// Markdown listing per area in by-area/. Categories are a first sort by rule
// (see categorize.mjs); the plan's counts come from them.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { categorize, CATEGORIES } from "./categorize.mjs";

/** @import { TmplAstNode } from "@angular/compiler" */
/** @import { Node } from "typescript" */

const here = dirname(fileURLToPath(import.meta.url));
const gamesRepo = resolve(here, "../../..");
const siteRepo = resolve(gamesRepo, "../fuzzley");
const require = createRequire(join(gamesRepo, "frontend/package.json"));
const ts = require("typescript");
const prettier = require("prettier");
const ng = await import(
  pathToFileURL(require.resolve("@angular/compiler")).href
);

/**
 * @typedef {object} Entry
 * @property {string} repo "fuzzley-games" or "fuzzley".
 * @property {string} area The workspace, such as "games/snake".
 * @property {string} file The file's path from its repository's root.
 * @property {number} line
 * @property {string} source How it was found, such as "template-text".
 * @property {string} context The element, attribute, property or call it
 *   sits in.
 * @property {string} text
 * @property {string} [category] What categorize() makes of it, set once
 *   every entry is read.
 */

/** @type {Entry[]} */
const entries = [];

/**
 * Returns text with its runs of white space made single spaces.
 * @param {string} text
 * @returns {string}
 */
function squash(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Returns whether a string reads as words for a person rather than as an
 * identifier, a path or a class list.
 * @param {string} text
 * @returns {boolean}
 */
function isProse(text) {
  const plain = text.replace(/\{[^}]*\}/g, " ").trim();
  if (!/[A-Za-z]{2,}/.test(plain)) return false;
  if (
    /^[\w./@-]+\.(ts|js|mjs|json|html|scss|css|svg|webp|png|ogg|mp3)$/.test(
      plain,
    )
  )
    return false;
  if (/^(https?:|\.\.?\/|\/|#|@)/.test(plain)) return false;
  if (/[A-Za-z’']\s+[A-Za-z0-9(“"]/.test(plain)) return true;
  return /^[A-Z][A-Za-z’']+[.!?…:]?$/.test(plain);
}

/**
 * Adds an entry, unless its text is empty.
 * @param {Omit<Entry, "text"> & { text: string }} entry
 * @returns {void}
 */
function add(entry) {
  const text = squash(entry.text);
  if (text === "") return;
  entries.push({ ...entry, text });
}

// ---------------------------------------------------------------------------
// Angular templates

const TEXT_ATTRIBUTES = new Set([
  "alt",
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
  "aria-placeholder",
  "placeholder",
  "title",
  "label",
  "heading",
  "caption",
  "legend",
  "summary",
  "content",
]);

const NEVER_TEXT_ATTRIBUTES =
  /^(class|id|type|role|name|for|href|src|rel|target|autocomplete|inputmode|scope|viewBox|d|fill|stroke|width|height|xmlns|style|slot|lang|charset|property|tabindex|dir|method|action|value|points|transform|x|y|r|cx|cy|rx|ry|x1|x2|y1|y2|preserveAspectRatio|aria-(hidden|live|atomic|haspopup|controls|labelledby|describedby|modal|orientation|current|expanded|pressed|checked|selected|disabled|keyshortcuts|relevant|busy)|data-.*|fz[A-Z].*|routerLink.*|ng.*)$/;

/**
 * Returns a text-bearing element's inner source as one readable line: tags
 * dropped, keys kept in square brackets and bold lead-ins in asterisks.
 * @param {string} inner
 * @returns {string}
 */
function readable(inner) {
  return squash(
    inner
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<kbd[^>]*>([\s\S]*?)<\/kbd>/g, "[$1]")
      .replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/g, "**$3**")
      .replace(/<br\s*\/?>/g, " / ")
      .replace(/<[^>]+>/g, " "),
  );
}

/**
 * Lists a template's text and its text-like attributes.
 * @param {string} source The template.
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @param {number} lineOffset The line the template starts on, less one.
 * @returns {void}
 */
function extractTemplate(source, where, lineOffset) {
  const parsed = ng.parseTemplate(source, where.file, {
    preserveWhitespaces: false,
  });
  if (parsed.errors?.length)
    console.warn(
      `${where.file}: the template did not parse cleanly, so text may be missing (${String(parsed.errors[0])})`,
    );

  /**
   * @param {TmplAstNode} node
   * @returns {number}
   */
  const lineOf = (node) => node.sourceSpan.start.line + 1 + lineOffset;

  /**
   * @param {TmplAstNode} node
   * @returns {boolean}
   */
  const isText = (node) =>
    (node instanceof ng.TmplAstText && node.value.trim() !== "") ||
    node instanceof ng.TmplAstBoundText;

  /**
   * @param {TmplAstNode} node
   * @param {boolean} textTaken Whether an ancestor's entry holds its text.
   * @returns {void}
   */
  function visit(node, textTaken) {
    if (
      node instanceof ng.TmplAstElement ||
      node instanceof ng.TmplAstTemplate
    ) {
      const tag = node.name ?? node.tagName ?? "ng-template";
      for (const attribute of node.attributes ?? []) {
        const { name, value } = attribute;
        if (NEVER_TEXT_ATTRIBUTES.test(name)) continue;
        if (TEXT_ATTRIBUTES.has(name) || isProse(value)) {
          add({
            ...where,
            line: lineOf(attribute),
            source: "template-attr",
            context: `<${tag} ${name}>`,
            text: value,
          });
        }
      }
      for (const input of node.inputs ?? []) {
        if (NEVER_TEXT_ATTRIBUTES.test(input.name)) continue;
        const expression = input.value?.source ?? "";
        const named = TEXT_ATTRIBUTES.has(input.name);
        const literals = [...expression.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
          .map((match) => match[1].replace(/\\'/g, "'"))
          .filter(isProse);
        if (named || literals.length > 0) {
          add({
            ...where,
            line: lineOf(input),
            source: "template-bound-attr",
            context: `<${tag} [${input.name}]>`,
            text: named ? `{{ ${squash(expression)} }}` : literals.join(" | "),
          });
        }
      }
      const children = node.children ?? [];
      let taken = textTaken;
      if (!textTaken && children.some(isText)) {
        const start = node.startSourceSpan.end.offset;
        const end = (node.endSourceSpan ?? node.sourceSpan).start.offset;
        const inner = readable(source.slice(start, end));
        if (!/[A-Za-z]{2,}/.test(inner)) {
          // A mark or a lone key: nothing to read.
        } else if (!/^\{\{[^}]*\}\}$/.test(inner)) {
          add({
            ...where,
            line: lineOf(node),
            source: "template-text",
            context: `<${tag}>`,
            text: inner,
          });
        } else {
          add({
            ...where,
            line: lineOf(node),
            source: "template-binding",
            context: `<${tag}>`,
            text: inner,
          });
        }
        taken = true;
      }
      for (const child of children) visit(child, taken);
      return;
    }
    if (isText(node) && !textTaken) {
      const text =
        node instanceof ng.TmplAstText
          ? node.value
          : node.sourceSpan.toString();
      add({
        ...where,
        line: lineOf(node),
        source: /^\s*\{\{[^}]*\}\}\s*$/.test(text)
          ? "template-binding"
          : "template-text",
        context: "(text)",
        text,
      });
      return;
    }
    for (const key of ["branches", "cases", "groups", "children"]) {
      for (const child of node[key] ?? []) visit(child, textTaken);
    }
    for (const key of ["empty", "placeholder", "loading", "error"]) {
      if (node[key]) visit(node[key], textTaken);
    }
  }

  for (const node of parsed.nodes) visit(node, false);
}

// ---------------------------------------------------------------------------
// TypeScript

/**
 * Returns where a string sits: the property, call, variable or function
 * that takes it.
 * @param {Node} node A string or template literal.
 * @returns {string}
 */
function contextOf(node) {
  let child = node;
  let parent = node.parent;
  let suffix = "";
  while (parent) {
    switch (parent.kind) {
      case ts.SyntaxKind.ParenthesizedExpression:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.BinaryExpression:
      case ts.SyntaxKind.TemplateSpan:
      case ts.SyntaxKind.TemplateExpression:
      case ts.SyntaxKind.AsExpression:
      case ts.SyntaxKind.SatisfiesExpression:
      case ts.SyntaxKind.NonNullExpression:
      case ts.SyntaxKind.SpreadElement:
      case ts.SyntaxKind.Block:
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.SwitchStatement:
      case ts.SyntaxKind.CaseBlock:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.DefaultClause:
      case ts.SyntaxKind.ReturnStatement:
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.ObjectLiteralExpression:
        break;
      case ts.SyntaxKind.ArrayLiteralExpression:
        suffix = "[]";
        break;
      case ts.SyntaxKind.PropertyAssignment:
        if (parent.name !== child) return `${parent.name.getText()}${suffix}:`;
        break;
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.NewExpression: {
        const callee = parent.expression.getText().split(".").pop();
        if (parent.kind === ts.SyntaxKind.NewExpression)
          return `new ${callee}()`;
        if (parent.expression !== child) return `${callee}()`;
        break;
      }
      case ts.SyntaxKind.VariableDeclaration:
      case ts.SyntaxKind.PropertyDeclaration:
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.GetAccessor:
      case ts.SyntaxKind.EnumMember:
        return `${parent.name?.getText() ?? "?"}${suffix}${
          parent.kind === ts.SyntaxKind.FunctionDeclaration ||
          parent.kind === ts.SyntaxKind.MethodDeclaration ||
          parent.kind === ts.SyntaxKind.GetAccessor
            ? "() returns"
            : " ="
        }`;
      case ts.SyntaxKind.ThrowStatement:
        return "throw";
      default:
        break;
    }
    child = parent;
    parent = parent.parent;
  }
  return "?";
}

/**
 * Returns whether a literal is code's own, never shown: a module name, a
 * type, a key, or one side of a comparison.
 * @param {Node} node
 * @returns {boolean}
 */
function isCodeOnly(node) {
  const parent = node.parent;
  switch (parent.kind) {
    case ts.SyntaxKind.ImportDeclaration:
    case ts.SyntaxKind.ExportDeclaration:
    case ts.SyntaxKind.ExternalModuleReference:
    case ts.SyntaxKind.LiteralType:
    case ts.SyntaxKind.ElementAccessExpression:
    case ts.SyntaxKind.CaseClause:
    case ts.SyntaxKind.TypeOfExpression:
      return true;
    case ts.SyntaxKind.PropertyAssignment:
      return parent.name === node;
    case ts.SyntaxKind.BinaryExpression:
      return [
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.InKeyword,
      ].includes(parent.operatorToken.kind);
    default:
      return false;
  }
}

/**
 * Lists a TypeScript file's prose-like strings, and its inline templates'.
 * @param {string} source
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @param {number} [lineOffset] Added to each line, for a script in a page.
 * @returns {void}
 */
function extractTypeScript(source, where, lineOffset = 0) {
  const file = ts.createSourceFile(
    where.file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  /**
   * @param {Node} node
   * @returns {number}
   */
  const lineOf = (node) =>
    file.getLineAndCharacterOfPosition(node.getStart()).line + 1 + lineOffset;

  /**
   * @param {Node} node
   * @returns {void}
   */
  function visit(node) {
    const isString =
      node.kind === ts.SyntaxKind.StringLiteral ||
      node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
    const isTemplate = node.kind === ts.SyntaxKind.TemplateExpression;
    if ((isString || isTemplate) && !isCodeOnly(node)) {
      const context = contextOf(node);
      if (context === "template:" && isString) {
        extractTemplate(node.text, where, lineOf(node) - 1);
        return;
      }
      const text = isString
        ? node.text
        : node.getText().slice(1, -1).replace(/\$\{/g, "{");
      if (isProse(text)) {
        add({
          ...where,
          line: lineOf(node),
          source: "ts-string",
          context,
          text,
        });
      }
      if (isString) return;
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
}

// ---------------------------------------------------------------------------
// Pages, Markdown, YAML and Astro

/**
 * Lists a page's title, descriptions and noscript text.
 * @param {string} source An index.html.
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @returns {void}
 */
function extractPage(source, where) {
  /**
   * @param {number} offset
   * @returns {number}
   */
  const lineAt = (offset) => source.slice(0, offset).split("\n").length;

  for (const match of source.matchAll(/<title>([\s\S]*?)<\/title>/g)) {
    add({
      ...where,
      line: lineAt(match.index),
      source: "page-meta",
      context: "<title>",
      text: match[1],
    });
  }
  for (const match of source.matchAll(/<meta\s+([\s\S]*?)\/?>/g)) {
    const name = /(?:name|property)="([^"]+)"/.exec(match[1])?.[1];
    const content = /content="([^"]*)"/.exec(match[1])?.[1];
    if (!name || content === undefined) continue;
    if (!/description|title|image:alt|site_name/.test(name)) continue;
    add({
      ...where,
      line: lineAt(match.index),
      source: "page-meta",
      context: `<meta ${name}>`,
      text: content,
    });
  }
  for (const match of source.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      const data = JSON.parse(match[1]);
      for (const key of ["name", "description", "genre"]) {
        if (data[key] === undefined) continue;
        add({
          ...where,
          line: lineAt(match.index),
          source: "page-meta",
          context: `JSON-LD ${key}`,
          text: [data[key]].flat().join(", "),
        });
      }
    } catch {
      // Not JSON this script can read; nothing to list.
    }
  }
  for (const match of source.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)) {
    for (const block of match[1].matchAll(/<(h1|p)>([\s\S]*?)<\/\1>/g)) {
      add({
        ...where,
        line: lineAt(match.index + match[1].indexOf(block[0])),
        source: "page-noscript",
        context: `<noscript> <${block[1]}>`,
        text: readable(block[2]),
      });
    }
  }
}

/**
 * Lists a Markdown file's paragraphs, headings and list items, down to a
 * heading that starts what only a developer reads.
 * @param {string} source
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @param {RegExp | null} stopAt A heading to stop before, or null for none.
 * @returns {void}
 */
function extractMarkdown(source, where, stopAt) {
  const lines = source.split("\n");
  let index = 0;
  if (lines[0] === "---") {
    index = 1;
    while (index < lines.length && lines[index] !== "---") {
      const match = /^(\s*-?\s*)([A-Za-z]+):\s*(.+)$/.exec(lines[index]);
      if (match && isProse(match[3].replace(/^"|"$/g, ""))) {
        add({
          ...where,
          line: index + 1,
          source: "front-matter",
          context: `${match[2]}:`,
          text: match[3].replace(/^"|"$/g, ""),
        });
      }
      index++;
    }
    index++;
  }
  let fenced = false;
  /** @type {{ line: number, text: string[] } | null} */
  let block = null;
  const flush = () => {
    if (block) {
      const text = block.text.join(" ");
      add({
        ...where,
        line: block.line,
        source: "markdown",
        context: /^#+ /.test(text)
          ? "heading"
          : /^[-*] /.test(text)
            ? "list item"
            : /^\|/.test(text)
              ? "table"
              : "paragraph",
        text,
      });
    }
    block = null;
  };
  for (; index < lines.length; index++) {
    const line = lines[index];
    if (/^```/.test(line)) {
      flush();
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (stopAt && stopAt.test(line)) break;
    if (line.trim() === "") {
      flush();
    } else if (/^(#+ |[-*] |\|)/.test(line)) {
      flush();
      block = { line: index + 1, text: [line.trim()] };
      if (/^#+ /.test(line)) flush();
    } else if (block) {
      block.text.push(line.trim());
    } else {
      block = { line: index + 1, text: [line.trim()] };
    }
  }
  flush();
}

/**
 * Lists a YAML file's prose values.
 * @param {string} source
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @returns {void}
 */
function extractYaml(source, where) {
  let key = "";
  source.split("\n").forEach((line, index) => {
    if (/^\s*#/.test(line)) return;
    const pair = /^\s*([A-Za-z]+):\s*(.*)$/.exec(line);
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (pair) {
      key = pair[1];
      const value = pair[2].replace(/^"|"$/g, "");
      if (isProse(value)) {
        add({
          ...where,
          line: index + 1,
          source: "yaml",
          context: `${key}:`,
          text: value,
        });
      }
    } else if (item && isProse(item[1])) {
      add({
        ...where,
        line: index + 1,
        source: "yaml",
        context: `${key}[]:`,
        text: item[1],
      });
    }
  });
}

/**
 * Lists an Astro file's text: its front matter's strings as TypeScript, and
 * its markup's text and text-like attributes.
 * @param {string} source
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @returns {void}
 */
function extractAstro(source, where) {
  const fence = /^---\n([\s\S]*?)\n---\n/.exec(source);
  const script = fence ? fence[1] : "";
  const markupStart = fence ? fence[0].length : 0;
  if (script !== "") extractTypeScript(script, where, 1);

  const markup = source
    .slice(markupStart)
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, (block) =>
      block.replace(/[^\n]/g, " "),
    )
    .replace(/<!--[\s\S]*?-->/g, (block) => block.replace(/[^\n]/g, " "));
  const firstLine = source.slice(0, markupStart).split("\n").length;

  /**
   * @param {number} offset
   * @returns {number}
   */
  const lineAt = (offset) =>
    firstLine + markup.slice(0, offset).split("\n").length - 1;

  for (const match of markup.matchAll(
    /\s([a-zA-Z:-]+)=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g,
  )) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (NEVER_TEXT_ATTRIBUTES.test(name)) continue;
    if (TEXT_ATTRIBUTES.has(name) || isProse(value)) {
      if (
        value.trim() === "" ||
        /^(noindex|width=|summary_|#|\d|\$\{build)/.test(value)
      )
        continue;
      add({
        ...where,
        line: lineAt(match.index),
        source: "template-attr",
        context: `${name}=`,
        text: value,
      });
    }
  }
  // Text between tags: whatever is left of a line run once tags are gone.
  for (const match of markup.matchAll(/>([^<>]+)</g)) {
    const text = squash(match[1]);
    if (text === "" || /^[{}()\s;,]*$/.test(text)) continue;
    const withoutCode = text.replace(/\{[^{}]*\}/g, "{…}");
    if (!isProse(withoutCode) && !/^[A-Z]/.test(withoutCode)) continue;
    if (/=>|\bconst |\breturn \(|\bmap\(/.test(text)) continue;
    add({
      ...where,
      line: lineAt(match.index + 1),
      source: "template-text",
      context: "(text)",
      text,
    });
  }
}

// ---------------------------------------------------------------------------
// What to read

/**
 * Returns a repository's tracked files under a folder.
 * @param {string} repo The repository's root.
 * @param {string} folder
 * @returns {string[]}
 */
function tracked(repo, folder) {
  return execFileSync("git", ["ls-files", folder], {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 1 << 26,
  })
    .split("\n")
    .filter(Boolean);
}

/**
 * Lists the names in a game's data file: its levels, sets, waves or sectors.
 * @param {string} source The file, as JSON with a field to a line.
 * @param {Pick<Entry, "repo" | "area" | "file">} where
 * @returns {void}
 */
function extractData(source, where) {
  source.split("\n").forEach((line, index) => {
    const found = /^\s*"name":\s*("(?:[^"\\]|\\.)*")/.exec(line);
    if (found)
      add({
        ...where,
        line: index + 1,
        source: "data",
        context: "name:",
        text: JSON.parse(found[1]),
      });
  });
}

const SKIPPED =
  /(\.spec\.ts|\.d\.ts|test-setup\.ts|\/testing\/|\/test\/|\/tools\/|\/node_modules\/|\.config\.(ts|js|mjs)$|\/AGENTS\.md$|\/CLAUDE\.md$|\/\.agents\/)/;

const frontend = join(gamesRepo, "frontend");
const workspaces = [
  "site",
  ...readdirSync(join(frontend, "games"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `games/${entry.name}`),
  "lib/ui",
  "lib/game-ui",
  "lib/phaser",
  "lib/style",
  "lib/core",
];

for (const area of workspaces) {
  for (const path of tracked(gamesRepo, `frontend/${area}`)) {
    if (SKIPPED.test(path)) continue;
    const where = { repo: "fuzzley-games", area, file: path };
    const read = () => readFileSync(join(gamesRepo, path), "utf8");
    if (/\/index\.html$/.test(path) && !/\/src\//.test(path)) {
      extractPage(read(), where);
    } else if (/\.html$/.test(path)) {
      extractTemplate(read(), where, 0);
    } else if (/\.ts$/.test(path)) {
      extractTypeScript(read(), where);
    } else if (/\/README\.md$/.test(path)) {
      extractMarkdown(read(), where, /^## (Development|License)/);
    } else if (/\/src\/rules\/.+\.json$/.test(path)) {
      extractData(read(), where);
    } else if (/\.webmanifest$/.test(path)) {
      const data = JSON.parse(read());
      for (const key of ["name", "short_name", "description"]) {
        if (typeof data[key] === "string")
          add({
            ...where,
            line: 1,
            source: "manifest",
            context: `${key}:`,
            text: data[key],
          });
      }
    }
  }
}
extractMarkdown(
  readFileSync(join(gamesRepo, "README.md"), "utf8"),
  { repo: "fuzzley-games", area: "repository", file: "README.md" },
  /^## (Development|Running|Building|License)/,
);

if (existsSync(siteRepo)) {
  for (const path of [...tracked(siteRepo, "frontend"), "README.md"]) {
    if (SKIPPED.test(path) || /\/public\/(analytics|env)\.js$/.test(path))
      continue;
    const where = { repo: "fuzzley", area: "fuzzley.info", file: path };
    const read = () => readFileSync(join(siteRepo, path), "utf8");
    if (/\.astro$/.test(path)) extractAstro(read(), where);
    else if (/\.ts$/.test(path)) extractTypeScript(read(), where);
    else if (/\.md$/.test(path))
      extractMarkdown(read(), where, /^## This repository/);
    else if (/\.ya?ml$/.test(path) && /\/content\//.test(path))
      extractYaml(read(), where);
    else if (/\.webmanifest$/.test(path)) {
      const data = JSON.parse(read());
      for (const key of ["name", "short_name", "description"]) {
        if (typeof data[key] === "string")
          add({
            ...where,
            line: 1,
            source: "manifest",
            context: `${key}:`,
            text: data[key],
          });
      }
    }
  }
} else {
  console.warn(
    `No checkout at ${siteRepo}: fuzzley.info's text is left out of the inventory.`,
  );
}

// ---------------------------------------------------------------------------
// Sort, categorize and write

for (const entry of entries) entry.category = categorize(entry);

const shown = entries.filter((entry) => entry.category !== "not-shown");
writeFileSync(
  join(here, "strings.json"),
  `${JSON.stringify(shown, null, 2)}\n`,
);

/**
 * Returns an area's file name among the listings.
 * @param {string} area
 * @returns {string}
 */
const slug = (area) => area.replace(/[/.]/g, "-");

const listings = join(here, "by-area");
rmSync(listings, { recursive: true, force: true });
mkdirSync(listings);

/** @type {Map<string, Entry[]>} */
const byArea = new Map();
for (const entry of shown) {
  const list = byArea.get(entry.area) ?? [];
  list.push(entry);
  byArea.set(entry.area, list);
}

/**
 * Returns a count of words, taking a binding as one.
 * @param {string} text
 * @returns {number}
 */
const words = (text) =>
  text
    .replace(/\{\{?[^}]*\}?\}/g, "x")
    .split(/\s+/)
    .filter(Boolean).length;

/** @type {string[]} */
const summary = [
  "# Text inventory: counts",
  "",
  "Written by `extract.mjs`; do not edit by hand. Entries and words by area",
  "and category. A binding such as `{{ score }}` counts as one word.",
  "",
  `| Area | ${CATEGORIES.map((category) => category.id).join(" | ")} | Entries | Words |`,
  `| --- | ${CATEGORIES.map(() => "--:").join(" | ")} | --: | --: |`,
];
/** @type {Record<string, number>} */
const totals = {};
let allEntries = 0;
let allWords = 0;

for (const [area, list] of byArea) {
  /** @type {string[]} */
  const out = [
    `# Text inventory: ${area}`,
    "",
    "Written by `extract.mjs`; do not edit by hand. Each entry gives its line,",
    "where it sits, and its text, with `{{ … }}` or `{…}` where a value is put",
    "in, keys in square brackets and bold lead-ins in asterisks.",
    "",
  ];
  /** @type {Record<string, number>} */
  const counts = {};
  let areaWords = 0;
  for (const category of CATEGORIES) {
    const inCategory = list.filter((entry) => entry.category === category.id);
    if (inCategory.length === 0) continue;
    counts[category.id] = inCategory.length;
    totals[category.id] = (totals[category.id] ?? 0) + inCategory.length;
    out.push(`## ${category.name}`, "");
    if (category.id === "profile") {
      // The owner's CV is counted, and stays in its own repository.
      const profileWords = inCategory.reduce(
        (sum, entry) => sum + words(entry.text),
        0,
      );
      areaWords += profileWords;
      out.push(
        `${inCategory.length} entries, ${profileWords} words, counted but not listed here.`,
        "",
      );
      continue;
    }
    let file = "";
    for (const entry of inCategory) {
      if (entry.file !== file) {
        file = entry.file;
        out.push(`### ${relative(`frontend/${area}`, file) || file}`, "");
      }
      areaWords += words(entry.text);
      out.push(
        `- ${entry.line} \`${entry.context.replace(/`/g, "'")}\` ${entry.text.replace(/([*_<>|])/g, (c) => (c === "*" ? c : `\\${c}`))}`,
      );
    }
    out.push("");
  }
  writeFileSync(
    join(listings, `${slug(area)}.md`),
    await prettier.format(out.join("\n"), { parser: "markdown" }),
  );
  allEntries += list.length;
  allWords += areaWords;
  summary.push(
    `| ${area} | ${CATEGORIES.map((category) => counts[category.id] ?? "").join(" | ")} | ${list.length} | ${areaWords} |`,
  );
}
summary.push(
  `| **All** | ${CATEGORIES.map((category) => totals[category.id] ?? "").join(" | ")} | ${allEntries} | ${allWords} |`,
  "",
);
writeFileSync(
  join(here, "counts.md"),
  await prettier.format(summary.join("\n"), { parser: "markdown" }),
);
console.log(
  `${shown.length} entries (${entries.length - shown.length} set aside as not shown), ${allWords} words`,
);
