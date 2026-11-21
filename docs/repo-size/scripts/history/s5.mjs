// Sizes S5's extra candidates, the blobs no path at main's tip ever held,
// at several size thresholds, and writes the strip list for one: S2's list
// plus those blobs at that threshold.
//
//   node s5.mjs <inventory-dir> <threshold-KiB>
//
// A blob counts when it is at neither main's nor live's tip, S2 doesn't
// already strip it, every path it was ever stored at is absent from main's
// tip, and it is bigger than the threshold.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir = "", chosen = "100"] = process.argv.slice(2);
const MIB = 1024 * 1024;

/**
 * Returns the rows of a tab-separated file.
 * @param {string} file
 * @returns {string[][]}
 */
const rows = (file) =>
  readFileSync(join(dir, file), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

/** @type {Map<string, { size: number, disk: number }>} */
const sizes = new Map(
  rows("blob-sizes.tsv").map(([b, , s, d]) => [
    b ?? "",
    { size: Number(s), disk: Number(d) },
  ]),
);
/** @type {Map<string, Set<string>>} */
const pathsOf = new Map();
for (const [b = "", p = ""] of rows("history-blob-paths.tsv")) {
  if (!pathsOf.has(b)) pathsOf.set(b, new Set());
  pathsOf.get(b)?.add(p);
}
const tipPaths = new Set();
const kept = new Set();
for (const [ref, b, p] of rows("tip-blob-paths.tsv")) {
  if (ref === "refs/heads/main") tipPaths.add(p);
  if (ref === "refs/heads/main" || ref === "refs/heads/live") kept.add(b);
}
const s2 = new Set(
  readFileSync(join(dir, "s2-strip-ids.txt"), "utf8")
    .split("\n")
    .filter(Boolean),
);
const candidates = [...sizes.keys()].filter(
  (b) =>
    !kept.has(b) &&
    !s2.has(b) &&
    [...(pathsOf.get(b) ?? [])].every((p) => !tipPaths.has(p)),
);

const table = [["threshold KiB", "blobs", "MiB raw", "MiB on disk"]];
for (const kib of [0, 10, 50, 100, 250, 500]) {
  const pick = candidates.filter((b) => (sizes.get(b)?.size ?? 0) > kib * 1024);
  const raw = pick.reduce((a, b) => a + (sizes.get(b)?.size ?? 0), 0);
  const disk = pick.reduce((a, b) => a + (sizes.get(b)?.disk ?? 0), 0);
  table.push([
    String(kib),
    String(pick.length),
    (raw / MIB).toFixed(1),
    (disk / MIB).toFixed(1),
  ]);
}
console.log(table.map((r) => r.join("\t")).join("\n"));

const pick = candidates.filter(
  (b) => (sizes.get(b)?.size ?? 0) > Number(chosen) * 1024,
);
writeFileSync(
  join(dir, "s5-strip-ids.txt"),
  [...s2, ...pick].sort().join("\n") + "\n",
);
console.log(
  `\ns5-strip-ids.txt: S2's ${s2.size} and ${pick.length} more over ${chosen} KiB`,
);
/** @type {Map<string, { n: number, disk: number }>} */
const byFolder = new Map();
for (const b of pick) {
  for (const p of pathsOf.get(b) ?? []) {
    const f = p.split("/").slice(0, -1).slice(0, 4).join("/");
    const v = byFolder.get(f) ?? { n: 0, disk: 0 };
    byFolder.set(f, { n: v.n + 1, disk: v.disk + (sizes.get(b)?.disk ?? 0) });
  }
}
console.log(
  "\nfolder (four levels)\tblobs\tMiB on disk (a blob at two paths counts in both)",
);
for (const [f, v] of [...byFolder]
  .sort((a, b) => b[1].disk - a[1].disk)
  .slice(0, 15)) {
  console.log(`${f}\t${v.n}\t${(v.disk / MIB).toFixed(1)}`);
}
