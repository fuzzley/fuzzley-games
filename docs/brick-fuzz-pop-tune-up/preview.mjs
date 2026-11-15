#!/usr/bin/env node
/**
 * Serves the plan as a page, its mocks in it, for reading where the files
 * themselves can't be opened, such as a session followed from a phone.
 *
 *   node docs/brick-fuzz-pop-tune-up/preview.mjs [--port <n>]
 *
 * `/` is `plan.md`, `/gallery` every mock at the page's full width, one
 * under another, and any other Markdown file of this folder a page at its
 * own path (`/sim/results/results.md`), each read again at every request;
 * the pictures are served as they are. It listens on this machine
 * alone, on 9106 unless told otherwise, and needs nothing installed: the
 * Markdown it reads is what Prettier writes, so a small reader of its own
 * turns it into HTML.
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const FOLDER = dirname(fileURLToPath(import.meta.url));

/** The kinds of file the folder serves as they are, by extension. */
const TYPES = /** @type {Record<string, string>} */ ({
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/plain; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
  ".patch": "text/plain; charset=utf-8",
});

/** The mocks the gallery shows, in its order, each with what it shows. */
const MOCKS = [
  [
    "charge-1-today",
    "Today: a thumb, to scale, over the fuzzball and its meter.",
  ],
  ["charge-2-gauge", "Recommended: the gauge over the fingertip, pointing."],
  ["charge-3-gauge-pull-back", "The gauge while pulling back."],
  ["charge-4-gauge-ceiling", "The gauge turned aside under the ceiling."],
  ["charge-6-gauge-light", "The gauge in the light palette."],
  ["charge-5-lintel", "The alternative: a fixed gauge in the lintel."],
  [
    "controls-sheet",
    "The bar today and after: Fast-forward as a switch, and Drop.",
  ],
  ["wool", "A plain fuzzball meeting wool, today and after."],
  ["charge-sheet", "The six pictures of the charge, side by side."],
];

/** The page's styles: the game's dark palette, a column a phone holds, tables that scroll sideways. */
const STYLES = `
  :root { color-scheme: dark; }
  body { margin: 0; background: #0b1220; color: #dbe3ee; font: 16px/1.55 Inter, system-ui, sans-serif; }
  main { max-width: 60rem; margin: 0 auto; padding: 1rem 1rem 4rem; }
  nav { position: sticky; top: 0; background: #0b1220ee; border-bottom: 1px solid #24395c; padding: 0.6rem 1rem; font-size: 0.9rem; }
  nav a { margin-right: 1rem; }
  a { color: #4cc2ff; }
  h1, h2, h3 { color: #f8fafc; line-height: 1.25; }
  h2 { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #24395c; }
  code { background: #172741; border-radius: 4px; padding: 0.1em 0.3em; font-size: 0.88em; overflow-wrap: anywhere; }
  pre { background: #172741; border-radius: 8px; padding: 0.8rem; overflow-x: auto; }
  pre code { padding: 0; background: none; overflow-wrap: normal; }
  .table { overflow-x: auto; margin: 1rem 0; }
  table { border-collapse: collapse; font-size: 0.9rem; min-width: 100%; }
  th, td { border: 1px solid #24395c; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; min-width: 7rem; }
  th { background: #172741; color: #f8fafc; }
  figure { margin: 1.5rem 0; }
  figure img { display: block; max-width: 100%; height: auto; border: 1px solid #24395c; border-radius: 8px; }
  figcaption { font-size: 0.85rem; color: #8d9db6; margin-top: 0.4rem; }
`;

/**
 * Returns text with the characters HTML reads as its own written out.
 *
 * @param {string} text
 * @returns {string}
 */
function escaped(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Returns a heading's anchor as GitHub names it: its words in lower case,
 * joined by hyphens, its punctuation dropped.
 *
 * @param {string} heading
 * @returns {string}
 */
function anchorOf(heading) {
  return heading
    .toLowerCase()
    .replaceAll(/[`*_]/g, "")
    .replaceAll(/[^a-z0-9 -]/g, "")
    .trim()
    .replaceAll(" ", "-");
}

/**
 * Returns a line of Markdown's text as HTML: its code, pictures, links,
 * strong words and emphasis.
 *
 * @param {string} text
 * @returns {string}
 */
function inline(text) {
  /** @type {string[]} */
  const codes = [];
  // Code first, kept aside, so nothing inside it is read as Markdown.
  let html = escaped(text).replaceAll(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${String(code)}</code>`);
    return `\u0000${String(codes.length - 1)}\u0000`;
  });
  html = html
    .replaceAll(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<a href="$2"><img src="$2" alt="$1" loading="lazy"></a>',
    )
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replaceAll(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return html.replaceAll(
    /\u0000(\d+)\u0000/g,
    (_, at) => codes[Number(at)] ?? "",
  );
}

/**
 * Returns a table row's cells, the pipes at its ends dropped.
 *
 * @param {string} line
 * @returns {string[]}
 */
function cellsOf(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Returns Markdown as HTML: headings, paragraphs, lists, tables, fenced
 * code and a picture alone in a paragraph as a figure, which is all the
 * folder's files use.
 *
 * @param {string} markdown
 * @returns {string}
 */
function render(markdown) {
  const lines = markdown.split("\n");
  /** @type {string[]} */
  const out = [];
  let at = 0;
  const isItem = (/** @type {string} */ line) => /^(- |\d+\. )/.test(line);
  while (at < lines.length) {
    const line = lines[at] ?? "";
    if (line.trim() === "") {
      at++;
    } else if (line.startsWith("```")) {
      /** @type {string[]} */
      const code = [];
      for (at++; at < lines.length && !lines[at]?.startsWith("```"); at++) {
        code.push(lines[at] ?? "");
      }
      at++;
      out.push(`<pre><code>${escaped(code.join("\n"))}</code></pre>`);
    } else if (/^#{1,6} /.test(line)) {
      const level = line.indexOf(" ");
      const words = line.slice(level + 1);
      out.push(
        `<h${String(level)} id="${anchorOf(words)}">${inline(words)}</h${String(level)}>`,
      );
      at++;
    } else if (line.startsWith("|")) {
      /** @type {string[]} */
      const rows = [];
      for (; at < lines.length && lines[at]?.startsWith("|"); at++) {
        rows.push(lines[at] ?? "");
      }
      const [head = "", , ...body] = rows;
      const row = (/** @type {string} */ cells, /** @type {string} */ tag) =>
        `<tr>${cellsOf(cells)
          .map((cell) => `<${tag}>${inline(cell)}</${tag}>`)
          .join("")}</tr>`;
      out.push(
        `<div class="table"><table><thead>${row(head, "th")}</thead><tbody>${body.map((cells) => row(cells, "td")).join("")}</tbody></table></div>`,
      );
    } else if (isItem(line)) {
      const tag = line.startsWith("- ") ? "ul" : "ol";
      /** @type {string[]} */
      const items = [];
      // An item runs on through its indented lines; a blank line ends the
      // list unless another item follows it.
      while (at < lines.length) {
        const here = lines[at] ?? "";
        if (isItem(here)) items.push(here.replace(/^(- |\d+\. )/, ""));
        else if (/^\s+\S/.test(here))
          items[items.length - 1] += ` ${here.trim()}`;
        else if (here.trim() === "" && isItem(lines[at + 1] ?? "")) at++;
        else break;
        at++;
      }
      out.push(
        `<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`,
      );
    } else {
      /** @type {string[]} */
      const words = [];
      for (
        ;
        at < lines.length &&
        (lines[at] ?? "").trim() !== "" &&
        !/^(#{1,6} |\||```)/.test(lines[at] ?? "") &&
        !isItem(lines[at] ?? "");
        at++
      ) {
        words.push((lines[at] ?? "").trim());
      }
      const text = words.join(" ");
      const picture = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(text);
      out.push(
        picture
          ? `<figure>${inline(text)}<figcaption>${escaped(picture[1] ?? "")}. Tap it for the full size.</figcaption></figure>`
          : `<p>${inline(text)}</p>`,
      );
    }
  }
  return out.join("\n");
}

/**
 * Returns the gallery as Markdown: every mock, one under another.
 *
 * @returns {string}
 */
function gallery() {
  return [
    "# Brick Fuzz Pop tune-up: the mocks",
    "",
    ...MOCKS.flatMap(([name, shows]) => [
      `![${String(shows).replace(/\.$/, "")}](/mocks/${String(name)}.png)`,
      "",
    ]),
  ].join("\n");
}

/**
 * Returns a page of the folder's Markdown, or the gallery, as a whole HTML
 * document.
 *
 * @param {string} path The file, from the folder, or `gallery`.
 * @returns {Promise<string>}
 */
async function pageOf(path) {
  const markdown =
    path === "gallery" ? gallery() : await readFile(join(FOLDER, path), "utf8");
  const title = /^# (.*)$/m.exec(markdown)?.[1] ?? path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<nav><a href="/">The plan</a><a href="/gallery">The mocks</a><a href="/sim/results/results.md">The sim's tables</a><a href="/sim/results/par.md">Par</a></nav>
<main>
${render(markdown)}
</main>
</body>
</html>
`;
}

const { values } = parseArgs({ options: { port: { type: "string" } } });
const port = Number(values.port ?? 9106);

/** @type {import("node:http").RequestListener} */
const answer = (request, response) => {
  /** @type {string} */
  let asked;
  try {
    asked = decodeURIComponent(
      new URL(request.url ?? "/", "http://localhost").pathname,
    );
  } catch {
    // An address no path can be read from, such as `/%`.
    response.writeHead(400).end();
    return;
  }
  const path = normalize(asked === "/" ? "plan.md" : asked.slice(1));
  // Nothing outside the folder is served.
  if (path.startsWith("..") || path.startsWith(sep)) {
    response.writeHead(403).end();
    return;
  }
  const isPage = extname(path) === ".md" || path === "gallery";
  const type = isPage ? "text/html; charset=utf-8" : TYPES[extname(path)];
  if (type === undefined) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not here.");
    return;
  }
  const body = isPage ? pageOf(path) : readFile(join(FOLDER, path));
  body.then(
    (content) => {
      response.writeHead(200, {
        "content-type": type,
        "cache-control": "no-store",
      });
      response.end(content);
    },
    () => {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not here.");
    },
  );
};

// Both of this machine's own addresses, as a client may dial either.
for (const host of ["127.0.0.1", "::1"]) {
  createServer(answer)
    .on("error", (error) => {
      console.error(`${host}: ${error.message}`);
    })
    .listen(port, host, () => {
      console.log(
        `The plan at http://${host.includes(":") ? `[${host}]` : host}:${String(port)}/`,
      );
    });
}
