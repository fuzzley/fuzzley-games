/**
 * Checks that the card atlas pages written as lossless WebP hold the same
 * pixels as PNG pages: those this machine's generator wrote, and those a
 * commit held.
 *
 *   node docs/repo-size/scripts/atlases/check-webp-pages.mjs <png atlas dir> <commit>
 *
 * The first argument is an `atlas/` folder `run-generator.mjs` wrote with the
 * PNG writer, under its mirror's `src/engine/render/assets/sprites/`. The
 * commit is one whose atlas pages are PNG, read with `git show`. Each WebP
 * page in the worktree is decoded, as is its PNG from each source, to RGBA,
 * and compared pixel by pixel.
 */
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import sharp from "../../../../frontend/node_modules/sharp/dist/index.mjs";

const REPO = resolve(import.meta.dirname, "../../../..");
const ATLAS = "frontend/games/solitaire/src/engine/render/assets/sprites/atlas";

/**
 * Lists the WebP pages under the worktree's atlas folder, relative to it.
 *
 * @returns {Promise<string[]>}
 */
async function webpPages() {
  const dir = join(REPO, ATLAS);
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".webp"))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .sort();
}

/**
 * Returns an image's pixels as RGBA, and its size.
 *
 * @param {Buffer} image
 * @returns {Promise<{data: Buffer, width: number, height: number}>}
 */
async function rgba(image) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Says how two images' pixels differ: not at all, in size, or in how many
 * pixels and by how much at most in any channel.
 *
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Promise<{same: boolean, says: string}>}
 */
async function compare(a, b) {
  const [left, right] = await Promise.all([rgba(a), rgba(b)]);
  if (left.width !== right.width || left.height !== right.height) {
    return {
      same: false,
      says: `size differs (${left.width} × ${left.height} vs ${right.width} × ${right.height})`,
    };
  }
  let pixels = 0;
  let most = 0;
  for (let i = 0; i < left.data.length; i += 4) {
    let moved = 0;
    for (let c = 0; c < 4; c++) {
      moved = Math.max(moved, Math.abs(left.data[i + c] - right.data[i + c]));
    }
    if (moved > 0) pixels++;
    most = Math.max(most, moved);
  }
  return pixels === 0
    ? { same: true, says: "identical pixels" }
    : {
        same: false,
        says: `${pixels} pixels differ, max channel diff ${most}`,
      };
}

const [pngDir, commit] = process.argv.slice(2);
if (!pngDir || !commit) {
  console.error("Usage: node check-webp-pages.mjs <png atlas dir> <commit>");
  process.exit(2);
}

const pages = await webpPages();
const lines = [];
const counts = { scratch: 0, commit: 0 };
lines.push(`${pages.length} WebP pages in ${ATLAS}`);
lines.push(`against PNG pages in ${pngDir} and at ${commit}`);
lines.push("");
let bytes = 0;
const distinct = new Set();
for (const page of pages) {
  const webp = await readFile(join(REPO, ATLAS, page));
  const key = webp.toString("base64");
  if (!distinct.has(key)) {
    distinct.add(key);
    bytes += webp.length;
  }
  const png = page.replace(/\.webp$/, ".png");
  const scratch = await compare(webp, await readFile(join(pngDir, png)));
  const committed = await compare(
    webp,
    execFileSync("git", ["show", `${commit}:${ATLAS}/${png}`], {
      cwd: REPO,
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
  if (scratch.same) counts.scratch++;
  if (committed.same) counts.commit++;
  lines.push(
    `${page} (${webp.length} bytes, ${webp.subarray(12, 16).toString("latin1")}): ` +
      `this machine's PNG: ${scratch.says}; ${commit}'s PNG: ${committed.says}`,
  );
}
lines.push("");
lines.push(
  `${counts.scratch} of ${pages.length} identical to this machine's PNG pages`,
);
lines.push(`${counts.commit} of ${pages.length} identical to ${commit}'s`);
lines.push(
  `${distinct.size} distinct WebP pages, ${bytes} bytes (${(bytes / 1048576).toFixed(2)} MiB)`,
);
console.log(lines.join("\n"));
