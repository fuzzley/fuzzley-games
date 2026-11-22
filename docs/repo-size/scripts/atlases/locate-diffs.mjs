/**
 * Lists the pixels where a run's atlas pages differ from HEAD's, by the frame
 * each falls in, as the page's manifest names it.
 *
 *   node docs/repo-size/scripts/atlases/locate-diffs.mjs <atlas dir>
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "../../../../frontend/node_modules/sharp/dist/index.mjs";

const REPO = resolve(import.meta.dirname, "../../../..");
const ATLAS = "frontend/games/solitaire/src/engine/render/assets/sprites/atlas";

/**
 * Decodes a page, a PNG or a WebP, to RGBA.
 *
 * @param {Buffer} png
 * @returns {Promise<{data: Buffer, info: import("sharp").OutputInfo}>}
 */
function decode(png) {
  return sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  const dir = resolve(process.argv[2] ?? "");
  const pages = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", "HEAD", `${ATLAS}/`],
    { cwd: REPO, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((path) => /\.(png|webp)$/.test(path))
    .map((path) => path.slice(ATLAS.length + 1));

  for (const page of pages) {
    const head = execFileSync("git", ["show", `HEAD:${ATLAS}/${page}`], {
      cwd: REPO,
      maxBuffer: 64 * 1024 * 1024,
    });
    const run = await readFile(join(dir, page));
    if (head.equals(run)) continue;
    const [a, b] = await Promise.all([decode(head), decode(run)]);
    const manifest = JSON.parse(
      await readFile(
        join(dir, page.replace(/[^/]+$/, "card_assets_atlas.json")),
        "utf8",
      ),
    );
    const image = page.split("/").at(-1);
    const frames = manifest.textures.find((t) => t.image === image).frames;
    console.log(`${page}:`);
    const width = a.info.width;
    for (let i = 0; i < a.data.length; i += 4) {
      const diffs = [0, 1, 2, 3].map((c) => b.data[i + c] - a.data[i + c]);
      if (diffs.every((d) => d === 0)) continue;
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      const frame = frames.find(
        (f) =>
          x >= f.frame.x &&
          x < f.frame.x + f.frame.w &&
          y >= f.frame.y &&
          y < f.frame.y + f.frame.h,
      );
      const where = frame
        ? `${frame.filename} at (${x - frame.frame.x}, ${y - frame.frame.y}) of ${frame.frame.w}x${frame.frame.h}`
        : "outside every frame";
      console.log(
        `  (${x}, ${y}) ${where}: HEAD rgba ${[0, 1, 2, 3].map((c) => a.data[i + c]).join(",")} -> run ${[0, 1, 2, 3].map((c) => b.data[i + c]).join(",")}`,
      );
    }
  }
}

await main();
