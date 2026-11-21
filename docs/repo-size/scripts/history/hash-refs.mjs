// Counts every place that names a fuzzley-games commit by its hash: the
// files at main's tip, the memory notes, and the sibling fuzzley repository.
//
//   node hash-refs.mjs <mirror> <memory-dir> <fuzzley-repo> <data-dir>
//
// A token is any run of 7 to 40 lowercase hex characters standing alone. It
// counts as a commit reference when git resolves it, in the mirror, to a
// commit; one that resolves in the fuzzley repository too is reported as
// ambiguous across the two, and one git calls ambiguous within the mirror as
// such. Reads only: nothing is written but the data files.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [mirror, memoryDir, fuzzley, data] = process.argv.slice(2);
const TOKEN = /\b[0-9a-f]{7,40}\b/g;

/**
 * Runs git in a repository and returns what it printed.
 * @param {string} dir
 * @param {string[]} args
 * @param {string | Buffer} [input]
 * @returns {Buffer}
 */
function git(dir, args, input) {
  return execFileSync("git", ["-C", dir, ...args], {
    maxBuffer: 1 << 30,
    ...(input === undefined ? {} : { input }),
  });
}

/**
 * Returns each token's resolution in a repository: the commit it names,
 * 'ambiguous', or nothing.
 * @param {string} dir
 * @param {string[]} tokens
 * @returns {Map<string, string>}
 */
function resolve(dir, tokens) {
  /** @type {Map<string, string>} */
  const out = new Map();
  if (!tokens.length || !existsSync(dir)) return out;
  const lines = git(
    dir,
    ["cat-file", "--batch-check=%(objectname) %(objecttype)"],
    tokens.join("\n") + "\n",
  )
    .toString()
    .split("\n");
  tokens.forEach((t, i) => {
    const [first, second] = (lines[i] ?? "").split(" ");
    if (second === "commit" && first) out.set(t, first);
    else if (second === "ambiguous") out.set(t, "ambiguous");
  });
  return out;
}

/**
 * Returns the place a file at the repository's tip belongs to.
 * @param {string} path
 * @returns {string}
 */
function place(path) {
  const base = path.split("/").pop() ?? "";
  if (path.startsWith("docs/archive/")) return "repo: docs/archive";
  if (path.startsWith("docs/")) return "repo: docs (not archive)";
  if (base === "AGENTS.md" || base === "CLAUDE.md")
    return "repo: AGENTS.md and CLAUDE.md";
  if (/(^|\/)\.agents\//.test(path)) return "repo: skills (.agents)";
  if (/\.(md)$/.test(path)) return "repo: other markdown";
  return "repo: code and config";
}

/** @type {{ place: string, file: string, line: number, token: string, text: string }[]} */
const hits = [];

/**
 * Records every token in a text.
 * @param {string} where
 * @param {string} file
 * @param {string} text
 * @returns {void}
 */
function scan(where, file, text) {
  text.split("\n").forEach((line, i) => {
    for (const [token] of line.matchAll(TOKEN)) {
      hits.push({
        place: where,
        file,
        line: i + 1,
        token,
        text: line.trim().slice(0, 160),
      });
    }
  });
}

// The files at main's tip, read from the mirror. Binary files and the
// lockfile, whose hashes are checksums, are skipped.
const tree = git(mirror, [
  "ls-tree",
  "-r",
  "-z",
  "--full-tree",
  "refs/heads/main",
])
  .toString()
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const [meta, path] = entry.split("\t");
    const [, type, blob] = (meta ?? "").split(" ");
    return { type, blob: blob ?? "", path: path ?? "" };
  })
  .filter(
    (e) =>
      e.type === "blob" &&
      !/\.(png|webp|jpe?g|gif|ico|m4a|ogg|wav|mp3|ttf|woff2?|eot|gz|zip|pdf)$/i.test(
        e.path,
      ),
  )
  .filter((e) => !/(^|\/)yarn\.lock$/.test(e.path));
const contents = git(
  mirror,
  ["cat-file", "--batch"],
  tree.map((e) => e.blob).join("\n") + "\n",
);
let offset = 0;
for (const entry of tree) {
  const headerEnd = contents.indexOf(10, offset);
  const size = Number(
    contents.subarray(offset, headerEnd).toString().split(" ")[2],
  );
  const body = contents.subarray(headerEnd + 1, headerEnd + 1 + size);
  offset = headerEnd + 1 + size + 1;
  if (body.includes(0)) continue;
  scan(place(entry.path), entry.path, body.toString("utf8"));
}

// The memory notes.
for (const name of readdirSync(memoryDir)
  .filter((n) => n.endsWith(".md"))
  .sort()) {
  scan("memory notes", name, readFileSync(join(memoryDir, name), "utf8"));
}

// The sibling repository, at its HEAD.
if (existsSync(fuzzley)) {
  const files = git(fuzzley, ["ls-files", "-z"])
    .toString()
    .split("\0")
    .filter(Boolean);
  for (const file of files) {
    if (
      /\.(png|webp|jpe?g|gif|ico|svg|ttf|woff2?|gz|pdf)$/i.test(file) ||
      /yarn\.lock$/.test(file)
    )
      continue;
    const text = git(fuzzley, ["show", `HEAD:${file}`]);
    if (text.includes(0)) continue;
    scan("fuzzley repository", file, text.toString("utf8"));
  }
}

const tokens = [...new Set(hits.map((h) => h.token))];
const here = resolve(mirror, tokens);
const there = resolve(fuzzley, tokens);

/** @type {Map<string, { files: Set<string>, refs: number, tokens: Set<string>, commits: Set<string>, ambiguous: Set<string>, both: Set<string>, digits: number, lengths: Map<number, number> }>} */
const byPlace = new Map();
/** @type {Map<string, number>} */
const byFile = new Map();
/** @type {string[][]} */
const codeRows = [["file", "line", "token", "commit", "text"]];
/** @type {string[][]} */
const oddRows = [["place", "file", "line", "token", "why"]];
for (const h of hits) {
  const ours = here.get(h.token);
  if (!ours) continue;
  const theirs = there.get(h.token);
  if (!byPlace.has(h.place)) {
    byPlace.set(h.place, {
      files: new Set(),
      refs: 0,
      tokens: new Set(),
      commits: new Set(),
      ambiguous: new Set(),
      both: new Set(),
      digits: 0,
      lengths: new Map(),
    });
  }
  const p = byPlace.get(h.place);
  if (!p) continue;
  if (ours === "ambiguous") {
    p.ambiguous.add(h.token);
    oddRows.push([
      h.place,
      h.file,
      String(h.line),
      h.token,
      "ambiguous in fuzzley-games",
    ]);
    continue;
  }
  if (theirs) {
    p.both.add(h.token);
    oddRows.push([
      h.place,
      h.file,
      String(h.line),
      h.token,
      "resolves in fuzzley too",
    ]);
    continue;
  }
  p.files.add(h.file);
  p.refs++;
  p.tokens.add(h.token);
  p.commits.add(ours);
  if (/^[0-9]+$/.test(h.token)) p.digits++;
  p.lengths.set(h.token.length, (p.lengths.get(h.token.length) ?? 0) + 1);
  byFile.set(
    `${h.place}\t${h.file}`,
    (byFile.get(`${h.place}\t${h.file}`) ?? 0) + 1,
  );
  if (h.place === "repo: code and config")
    codeRows.push([h.file, String(h.line), h.token, ours.slice(0, 10), h.text]);
}

/** @type {string[][]} */
const summary = [
  [
    "place",
    "files",
    "references",
    "distinct tokens",
    "distinct commits",
    "all-digit tokens",
    "token lengths",
    "ambiguous in fuzzley-games",
    "resolve in fuzzley too",
  ],
];
let all = { files: 0, refs: 0, commits: new Set() };
const PLACES = [
  "repo: docs (not archive)",
  "repo: docs/archive",
  "repo: AGENTS.md and CLAUDE.md",
  "repo: skills (.agents)",
  "repo: other markdown",
  "repo: code and config",
  "memory notes",
  "fuzzley repository",
];
for (const name of PLACES) {
  if (!byPlace.has(name)) {
    byPlace.set(name, {
      files: new Set(),
      refs: 0,
      tokens: new Set(),
      commits: new Set(),
      ambiguous: new Set(),
      both: new Set(),
      digits: 0,
      lengths: new Map(),
    });
  }
}
for (const [name, p] of [...byPlace].sort(
  (a, b) => PLACES.indexOf(a[0]) - PLACES.indexOf(b[0]),
)) {
  summary.push([
    name,
    String(p.files.size),
    String(p.refs),
    String(p.tokens.size),
    String(p.commits.size),
    String(p.digits),
    [...p.lengths]
      .sort((a, b) => a[0] - b[0])
      .map(([l, n]) => `${l}:${n}`)
      .join(" "),
    String(p.ambiguous.size),
    String(p.both.size),
  ]);
  all = {
    files: all.files + p.files.size,
    refs: all.refs + p.refs,
    commits: new Set([...all.commits, ...p.commits]),
  };
}
summary.push([
  "all",
  String(all.files),
  String(all.refs),
  "",
  String(all.commits.size),
  "",
  "",
  "",
  "",
]);

/**
 * Writes rows as a tab-separated file and prints it.
 * @param {string} name
 * @param {string[][]} table
 * @returns {void}
 */
function emit(name, table) {
  const text = table.map((r) => r.join("\t")).join("\n") + "\n";
  writeFileSync(join(data, name), text);
  console.log(`\n== ${name}\n${text}`);
}
emit("hash-refs-summary.tsv", summary);
emit("hash-refs-files.tsv", [
  ["place", "file", "references"],
  ...[...byFile]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => [...k.split("\t"), String(n)]),
]);
emit("hash-refs-code.tsv", codeRows);
emit("hash-refs-odd.tsv", oddRows);
