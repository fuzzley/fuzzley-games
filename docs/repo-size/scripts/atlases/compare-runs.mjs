/**
 * Compares the atlases two or more generator runs wrote with each other and
 * with the ones committed at HEAD: bytes first, then, for a PNG whose bytes
 * differ, its decoded pixels, and for JSON, its parsed value.
 *
 *   node docs/repo-size/scripts/atlases/compare-runs.mjs <atlas dir> [<atlas dir> ...]
 *
 * Each argument is an `atlas/` folder a run wrote, as `run-generator.mjs`
 * leaves under its mirror's `src/engine/render/assets/sprites/`. HEAD's files
 * are read with `git show`, so the worktree's copy plays no part.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import sharp from "../../../../frontend/node_modules/sharp/dist/index.mjs";

const REPO = resolve(import.meta.dirname, "../../../..");
const ATLAS = "frontend/games/solitaire/src/engine/render/assets/sprites/atlas";

/**
 * Lists every file under a folder, relative to it.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .sort();
}

/**
 * Returns HEAD's copy of an atlas file.
 *
 * @param {string} file Path relative to the atlas folder.
 * @returns {Buffer}
 */
function headFile(file) {
  return execFileSync("git", ["show", `HEAD:${ATLAS}/${file}`], {
    cwd: REPO,
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Returns a short hash of bytes.
 *
 * @param {Buffer} bytes
 * @returns {string}
 */
function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 12);
}

/**
 * Compares two PNGs' decoded RGBA pixels.
 *
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Promise<string>}
 */
async function comparePixels(a, b) {
  const [ra, rb] = await Promise.all(
    [a, b].map((png) =>
      sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) {
    return `size differs: ${ra.info.width}x${ra.info.height} vs ${rb.info.width}x${rb.info.height}`;
  }
  let differing = 0;
  let maxDiff = 0;
  for (let i = 0; i < ra.data.length; i += 4) {
    let pixelDiff = 0;
    for (let c = 0; c < 4; c++) {
      pixelDiff = Math.max(
        pixelDiff,
        Math.abs(ra.data[i + c] - rb.data[i + c]),
      );
    }
    if (pixelDiff > 0) differing++;
    maxDiff = Math.max(maxDiff, pixelDiff);
  }
  return `pixels ${differing === 0 ? "identical" : `differ: ${differing} pixels, max channel diff ${maxDiff}`}`;
}

/**
 * Compares one file's two copies, bytes first.
 *
 * @param {string} file
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Promise<{same: boolean, line: string}>}
 */
async function compareFile(file, a, b) {
  if (a.equals(b))
    return { same: true, line: `${file}: bytes identical (${hash(a)})` };
  if (file.endsWith(".png")) {
    return {
      same: false,
      line: `${file}: bytes differ (${a.length} vs ${b.length}); ${await comparePixels(a, b)}`,
    };
  }
  const parsedSame = isDeepStrictEqual(
    JSON.parse(a.toString("utf8")),
    JSON.parse(b.toString("utf8")),
  );
  return {
    same: false,
    line: `${file}: bytes differ; parsed JSON ${parsedSame ? "equal" : "differs"}`,
  };
}

async function main() {
  const dirs = process.argv.slice(2).map((dir) => resolve(dir));
  if (dirs.length === 0) throw new Error("Name at least one atlas folder");

  const headFiles = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", "HEAD", `${ATLAS}/`],
    { cwd: REPO, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .map((path) => path.slice(ATLAS.length + 1))
    .sort();

  /** @type {{name: string, files: string[], read: (file: string) => Promise<Buffer>}[]} */
  const sources = [
    { name: "HEAD", files: headFiles, read: async (file) => headFile(file) },
    ...(await Promise.all(
      dirs.map(async (dir) => ({
        name: relative(REPO, dir).startsWith("..") ? dir : relative(REPO, dir),
        files: await listFiles(dir),
        read: (file) => readFile(join(dir, file)),
      })),
    )),
  ];

  for (const source of sources) {
    console.log(`${source.name}: ${source.files.length} files`);
  }

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const [a, b] = [sources[i], sources[j]];
      console.log(`\n== ${a.name}  vs  ${b.name}`);
      const onlyA = a.files.filter((file) => !b.files.includes(file));
      const onlyB = b.files.filter((file) => !a.files.includes(file));
      if (onlyA.length || onlyB.length) {
        console.log(`only in first: ${onlyA.join(", ") || "none"}`);
        console.log(`only in second: ${onlyB.join(", ") || "none"}`);
      }
      let same = 0;
      const shared = a.files.filter((file) => b.files.includes(file));
      for (const file of shared) {
        const result = await compareFile(
          file,
          await a.read(file),
          await b.read(file),
        );
        if (result.same) same++;
        else console.log(result.line);
      }
      console.log(`${same} of ${shared.length} shared files byte-identical`);
    }
  }
}

await main();
