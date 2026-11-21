/**
 * Works out what each way of storing the card atlases would add to git's
 * history per rebuild, from what measure-encodings.mjs and
 * history-rebuilds.mjs printed into docs/repo-size/data/atlases/.
 *
 *   node docs/repo-size/scripts/atlases/estimate-savings.mjs
 *
 * A PNG or WebP barely deltas against its previous version, so a rebuilt
 * page adds about its own size to the pack. A full rebuild rewrites every
 * distinct page blob at HEAD; the history's own rebuilds since every density
 * was drawn from the SVG show what a typical one rewrote. Generating the
 * atlases at build time (strategy 3) adds no page blobs at all.
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DATA = resolve(import.meta.dirname, "../../data/atlases");

/**
 * Returns each encoding's total over the atlas pages' distinct blobs, in MiB.
 *
 * @returns {Promise<Map<string, {mib: number, lossless: boolean}>>}
 */
async function encodingTotals() {
  const text = await readFile(join(DATA, "encodings-atlas.txt"), "utf8");
  const totals = new Map();
  const section = text.slice(text.indexOf("Totals over distinct blobs"));
  for (const match of section.matchAll(
    /^\s{2}(\S+)\s+([\d.]+) MiB\s+[\d.]+%\s+saves\s+-?[\d.]+ MiB\s+(lossless on every file|lossy on some file)$/gm,
  )) {
    totals.set(match[1], {
      mib: Number(match[2]),
      lossless: match[3] === "lossless on every file",
    });
  }
  return totals;
}

/**
 * Returns the history's rebuilds, oldest first.
 *
 * @returns {Promise<{hash: string, date: string, subject: string, blobs: number, packedMib: number}[]>}
 */
async function rebuilds() {
  const text = await readFile(join(DATA, "history-rebuilds.txt"), "utf8");
  return text
    .split("\n")
    .filter((line) => /^[0-9a-f]{40} \|/.test(line))
    .map((line) => {
      const [hash = "", date = "", subject = "", blobs, , packed] =
        line.split(" | ");
      return {
        hash,
        date,
        subject,
        blobs: Number(blobs),
        packedMib: Number(packed),
      };
    });
}

async function main() {
  const totals = await encodingTotals();
  const png = totals.get("png-at-HEAD")?.mib;
  if (!png) throw new Error("No PNG total in encodings-atlas.txt");

  console.log(
    `A full rebuild rewrites every distinct page blob at HEAD: ${png.toFixed(2)} MiB as PNG today.`,
  );
  console.log(
    "\nencoding | MiB a full rebuild adds | saved per full rebuild | lossless?",
  );
  for (const [name, { mib, lossless }] of totals) {
    console.log(
      `${name} | ${mib.toFixed(2)} | ${(png - mib).toFixed(2)} MiB (${(((png - mib) / png) * 100).toFixed(0)}%) | ${lossless ? "yes" : "no"}`,
    );
  }
  console.log(
    `generated at build time (strategy 3) | 0.00 | ${png.toFixed(2)} MiB (100%) | yes`,
  );

  // The rebuilds since every density was drawn from the SVG, the way the
  // generator works today.
  const history = await rebuilds();
  const since = history.filter((r) => r.date >= "2026-10-03");
  const packed = since.reduce((sum, r) => sum + r.packedMib, 0);
  console.log(
    `\nThe ${since.length} commits since 2026-10-03 that rewrote atlas pages added ${packed.toFixed(2)} MiB packed ` +
      `(mean ${(packed / since.length).toFixed(2)} MiB a commit, ${Math.min(...since.map((r) => r.packedMib)).toFixed(2)}–${Math.max(...since.map((r) => r.packedMib)).toFixed(2)}).`,
  );
  const all = history.reduce((sum, r) => sum + r.packedMib, 0);
  console.log(
    `All ${history.length} commits that wrote atlas pages: ${all.toFixed(2)} MiB packed, counted per commit.`,
  );
  for (const name of ["webp-lossless-exact", "webp-near-80", "oxipng-max"]) {
    const entry = totals.get(name);
    if (!entry) continue;
    const ratio = entry.mib / png;
    console.log(
      `Had those ${since.length} commits written ${name} (${(ratio * 100).toFixed(1)}% of PNG over HEAD's pages), ` +
        `they would have added about ${(packed * ratio).toFixed(2)} MiB, saving ${(packed * (1 - ratio)).toFixed(2)} MiB.`,
    );
  }
}

await main();
