// Works out, from the lists 02-inventory.sh writes, which paths and blobs
// each scenario removes and roughly what they weigh, and writes the lists the
// scenarios read.
//
//   node inventory.mjs <inventory-dir>
//
// What it prints goes to $DATA, as env.sh sets it, or data/history/.
//
// Sizes are each blob's size on disk in the repacked baseline's pack, so a
// blob stored as a delta counts as its delta; removing a delta's base makes
// what is left bigger, so the scenarios' measured sizes are the real figures
// and these are estimates.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const data =
  process.env["DATA"] ?? join(import.meta.dirname, "../../data/history");
const MIB = 1024 * 1024;

/** The folders S1 empties of every path main's tip no longer has. */
const S1_FOLDERS = [
  "frontend/games/solitaire/docs/screenshots/",
  "frontend/games/solitaire/src/assets/sprites/atlas/",
  "frontend/games/solitaire/src/game/assets/sprites/atlas/",
  "frontend/games/solitaire/public/assets/sprites/atlas/",
];

/** The refs whose tips S2 keeps whole, as deployed. */
const KEPT_TIPS = ["refs/heads/main", "refs/heads/live"];

/**
 * Returns a path's kind and the folder that makes it so, or nothing for any
 * other path.
 * @param {string} path
 * @returns {{ kind: 'screenshot' | 'atlas', folder: string } | undefined}
 */
function classify(path) {
  let m = /^(.*?(?:^|\/)docs\/screenshots)\//.exec(path);
  if (m) return { kind: "screenshot", folder: m[1] };
  m = /^(.*?\/sprites\/atlas)\//.exec(path);
  if (m) return { kind: "atlas", folder: m[1] };
  return undefined;
}

/**
 * Returns the rows of a tab-separated file.
 * @param {string} file
 * @returns {string[][]}
 */
function rows(file) {
  return readFileSync(join(dir, file), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

/**
 * Writes rows as a tab-separated file in data/history/ and prints it.
 * @param {string} name
 * @param {(string | number)[][]} table
 * @returns {void}
 */
function emit(name, table) {
  const text = table.map((r) => r.join("\t")).join("\n") + "\n";
  writeFileSync(join(data, name), text);
  console.log(`\n== ${name}\n${text}`);
}

/**
 * Returns a size in MiB, to a tenth.
 * @param {number} bytes
 * @returns {string}
 */
const mib = (bytes) => (bytes / MIB).toFixed(1);

/** @type {Map<string, { size: number, disk: number }>} */
const sizes = new Map();
for (const [sha, , size, disk] of rows("blob-sizes.tsv")) {
  sizes.set(sha, { size: Number(size), disk: Number(disk) });
}
/**
 * Returns the summed on-disk size of a set of blobs.
 * @param {Iterable<string>} blobs
 * @returns {number}
 */
function disk(blobs) {
  let total = 0;
  for (const b of blobs) total += sizes.get(b)?.disk ?? 0;
  return total;
}

/** @type {Map<string, Set<string>>} each blob's every path in history */
const pathsOf = new Map();
/** @type {Map<string, Set<string>>} each path's every blob in history */
const blobsAt = new Map();
for (const [blob, path] of rows("history-blob-paths.tsv")) {
  if (!pathsOf.has(blob)) pathsOf.set(blob, new Set());
  pathsOf.get(blob)?.add(path);
  if (!blobsAt.has(path)) blobsAt.set(path, new Set());
  blobsAt.get(path)?.add(blob);
}

/** @type {Map<string, { blobs: Set<string>, paths: Set<string> }>} */
const tips = new Map();
for (const [ref, blob, path] of rows("tip-blob-paths.tsv")) {
  if (!tips.has(ref)) tips.set(ref, { blobs: new Set(), paths: new Set() });
  tips.get(ref)?.blobs.add(blob);
  tips.get(ref)?.paths.add(path);
}
const main = tips.get("refs/heads/main");
if (!main) throw new Error("no refs/heads/main");
const kept = new Set(
  KEPT_TIPS.flatMap((ref) => [...(tips.get(ref)?.blobs ?? [])]),
);

// The screenshot and atlas folders, each with what history and main's tip
// hold under it.
/** @type {Map<string, { kind: string, paths: Set<string>, blobs: Set<string> }>} */
const folders = new Map();
/** @type {Set<string>} */
const marked = new Set();
for (const [path, blobs] of blobsAt) {
  const c = classify(path);
  if (!c) continue;
  if (!folders.has(c.folder)) {
    folders.set(c.folder, { kind: c.kind, paths: new Set(), blobs: new Set() });
  }
  const f = folders.get(c.folder);
  f?.paths.add(path);
  for (const b of blobs) {
    f?.blobs.add(b);
    marked.add(b);
  }
}
const folderTable = [
  [
    "kind",
    "folder",
    "files at main tip",
    "paths in history",
    "paths absent at tip",
    "blobs in history",
    "blobs at main tip",
    "MiB on disk, all",
    "MiB on disk, not at main tip",
  ],
];
for (const [folder, f] of [...folders].sort(
  (a, b) => disk(b[1].blobs) - disk(a[1].blobs),
)) {
  const tipPaths = [...f.paths].filter((p) => main.paths.has(p));
  const tipBlobs = [...f.blobs].filter((b) => main.blobs.has(b));
  const gone = [...f.blobs].filter((b) => !main.blobs.has(b));
  folderTable.push([
    f.kind,
    folder,
    tipPaths.length,
    f.paths.size,
    f.paths.size - tipPaths.length,
    f.blobs.size,
    tipBlobs.length,
    mib(disk(f.blobs)),
    mib(disk(gone)),
  ]);
}
const markedGone = [...marked].filter((b) => !main.blobs.has(b));
folderTable.push([
  "all",
  "every screenshot and atlas folder (each blob once)",
  "",
  "",
  "",
  marked.size,
  marked.size - markedGone.length,
  mib(disk(marked)),
  mib(disk(markedGone)),
]);
emit("inventory-folders.tsv", folderTable);

// S1: the paths under the old folders that main's tip no longer has.
const s1Paths = [...blobsAt.keys()]
  .filter((p) => S1_FOLDERS.some((f) => p.startsWith(f)) && !main.paths.has(p))
  .sort();
writeFileSync(join(dir, "s1-paths.txt"), s1Paths.join("\n") + "\n");
const s1Set = new Set(s1Paths);
// A blob leaves history only if no path it was ever at is kept.
const s1Blobs = [...marked].filter((b) =>
  [...(pathsOf.get(b) ?? [])].every((p) => s1Set.has(p)),
);
const s1KeptElsewhere = new Set(
  s1Paths
    .flatMap((p) => [...(blobsAt.get(p) ?? [])])
    .filter((b) => !s1Blobs.includes(b)),
);

// S1b: every screenshot or atlas path, in any folder, that main's tip no
// longer has.
const s1bPaths = [...blobsAt.keys()]
  .filter((p) => classify(p) && !main.paths.has(p))
  .sort();
writeFileSync(join(dir, "s1b-paths.txt"), s1bPaths.join("\n") + "\n");
const s1bSet = new Set(s1bPaths);
const s1bBlobs = [...marked].filter((b) =>
  [...(pathsOf.get(b) ?? [])].every((p) => s1bSet.has(p)),
);

// S2: every blob a screenshot or atlas path ever held, but those at the
// kept tips.
const strip = [...marked].filter((b) => !kept.has(b)).sort();
writeFileSync(join(dir, "s2-strip-ids.txt"), strip.join("\n") + "\n");
const stripSet = new Set(strip);
const alsoElsewhere = strip.filter((b) =>
  [...(pathsOf.get(b) ?? [])].some((p) => classify(p) === undefined),
);
const notAtMain = [...sizes.keys()].filter((b) => !main.blobs.has(b));

emit("inventory-scenarios.tsv", [
  ["measure", "count", "MiB on disk"],
  ["blobs in the repacked baseline", sizes.size, mib(disk(sizes.keys()))],
  ["blobs at main tip", main.blobs.size, mib(disk(main.blobs))],
  ["blobs not at main tip", notAtMain.length, mib(disk(notAtMain))],
  ["S1: paths removed (--paths-from-file, --invert-paths)", s1Paths.length, ""],
  ["S1: blobs that leave history", s1Blobs.length, mib(disk(s1Blobs))],
  [
    "S1: blobs at those paths kept by another path",
    s1KeptElsewhere.size,
    mib(disk(s1KeptElsewhere)),
  ],
  ["S1b: paths removed, every folder", s1bPaths.length, ""],
  ["S1b: blobs that leave history", s1bBlobs.length, mib(disk(s1bBlobs))],
  [
    "S2: blobs stripped (--strip-blobs-with-ids)",
    strip.length,
    mib(disk(strip)),
  ],
  [
    "S2: blobs kept, at main or live tip",
    marked.size - strip.length,
    mib(disk([...marked].filter((b) => kept.has(b)))),
  ],
  [
    "S2: stripped blobs also stored at another path",
    alsoElsewhere.length,
    mib(disk(alsoElsewhere)),
  ],
  [
    "S3: blobs under screenshot and atlas paths",
    marked.size,
    mib(disk(marked)),
  ],
]);

emit("inventory-s2-also-elsewhere.tsv", [
  ["blob", "MiB raw", "other paths"],
  ...alsoElsewhere.map((b) => [
    b,
    mib(sizes.get(b)?.size ?? 0),
    [...(pathsOf.get(b) ?? [])]
      .filter((p) => classify(p) === undefined)
      .join(" "),
  ]),
]);

// Each ref's tip: the screenshot and atlas blobs it holds that main's tip
// does not, which S2 strips from it unless it is kept.
const refTable = [
  [
    "ref",
    "screenshot or atlas blobs not at main tip",
    "MiB on disk",
    "S2 strips them",
  ],
];
for (const [ref, t] of [...tips].sort()) {
  const extra = [...t.blobs].filter((b) => marked.has(b) && !main.blobs.has(b));
  refTable.push([
    ref,
    extra.length,
    mib(disk(extra)),
    extra.some((b) => stripSet.has(b)) ? "yes" : "no",
  ]);
}
emit("inventory-ref-tips.tsv", refTable);

// What history holds that main's tip does not, once S2 has stripped its
// blobs, by folder and by path: S5's candidates.
/** @type {Map<string, Set<string>>} */
const leftByFolder = new Map();
/** @type {Map<string, { disk: number, blobs: number }>} */
const leftByPath = new Map();
const left = notAtMain.filter((b) => !stripSet.has(b));
for (const b of left) {
  for (const p of pathsOf.get(b) ?? []) {
    const folder =
      p
        .split("/")
        .slice(0, Math.min(4, p.split("/").length - 1))
        .join("/") || ".";
    if (!leftByFolder.has(folder)) leftByFolder.set(folder, new Set());
    leftByFolder.get(folder)?.add(b);
  }
}
for (const [path, blobs] of blobsAt) {
  const gone = [...blobs].filter((b) => !main.blobs.has(b) && !stripSet.has(b));
  if (gone.length)
    leftByPath.set(path, { disk: disk(gone), blobs: gone.length });
}
emit("inventory-after-s2-folders.tsv", [
  [
    "folder (four levels)",
    "blobs not at main tip",
    "MiB on disk",
    "any path at main tip",
  ],
  ...[...leftByFolder]
    .sort((a, b) => disk(b[1]) - disk(a[1]))
    .slice(0, 25)
    .map(([folder, blobs]) => [
      folder,
      blobs.size,
      mib(disk(blobs)),
      [...main.paths].some((p) => p.startsWith(folder + "/")) ? "yes" : "no",
    ]),
]);
emit("inventory-after-s2-paths.tsv", [
  ["path", "blobs not at main tip", "MiB on disk", "path at main tip"],
  ...[...leftByPath]
    .sort((a, b) => b[1].disk - a[1].disk)
    .slice(0, 30)
    .map(([path, v]) => [
      path,
      v.blobs,
      mib(v.disk),
      main.paths.has(path) ? "yes" : "no",
    ]),
]);
emit("inventory-after-s2-total.tsv", [
  ["measure", "blobs", "MiB on disk"],
  ["not at main tip, left after S2", left.length, mib(disk(left))],
  [
    "of which at paths absent at main tip only",
    left.filter((b) =>
      [...(pathsOf.get(b) ?? [])].every((p) => !main.paths.has(p)),
    ).length,
    mib(
      disk(
        left.filter((b) =>
          [...(pathsOf.get(b) ?? [])].every((p) => !main.paths.has(p)),
        ),
      ),
    ),
  ],
]);

// S4: what stripping by size takes that S2 does not.
for (const [label, limit] of [
  ["1M", 1024 * 1024],
  ["500K", 500 * 1024],
]) {
  const big = [...sizes].filter(([, s]) => s.size > limit).map(([b]) => b);
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const b of big) {
    if (stripSet.has(b)) continue;
    const isMarked = marked.has(b);
    const atTip = main.blobs.has(b);
    const group = `${isMarked ? "screenshot or atlas" : "other"}, ${atTip ? "at main tip" : "not at main tip"}`;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)?.push(b);
  }
  emit(`inventory-s4-${label}-groups.tsv`, [
    ["group", "blobs", "MiB on disk"],
    ["all blobs over the limit", big.length, mib(disk(big))],
    [
      "of which S2 strips too",
      big.filter((b) => stripSet.has(b)).length,
      mib(disk(big.filter((b) => stripSet.has(b)))),
    ],
    ...[...groups].map(([g, bs]) => [
      `S4 only: ${g}`,
      bs.length,
      mib(disk(bs)),
    ]),
  ]);
  emit(`inventory-s4-${label}-other.tsv`, [
    ["blob", "MiB raw", "at main tip", "paths"],
    ...big
      .filter((b) => !marked.has(b))
      .sort((a, b) => (sizes.get(b)?.size ?? 0) - (sizes.get(a)?.size ?? 0))
      .map((b) => [
        b,
        mib(sizes.get(b)?.size ?? 0),
        main.blobs.has(b) ? "yes" : "no",
        [...(pathsOf.get(b) ?? [])].join(" "),
      ]),
  ]);
}
