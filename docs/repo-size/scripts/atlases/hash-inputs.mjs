/**
 * Prototypes the staleness key a build-time atlas step would keep: a hash of
 * everything the generator's output depends on, and how long it takes.
 *
 *   node docs/repo-size/scripts/atlases/hash-inputs.mjs
 *
 * The key covers the generator's own files (tools/build-card-atlas.mjs and
 * tools/card-atlas/, but for its gitignored .preview/), the card sheets in
 * src/engine/render/assets/sprites/card/, the installed versions of sharp,
 * libvips and resvg with the platform packages they load, and the platform
 * and C library, since the generator's bytes differ between glibc, musl and
 * the machine that built the committed atlases. Prints the key, what went
 * into it, and the median time of several runs.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");
const WORKSPACE = join(REPO, "frontend/games/solitaire");
const NODE_MODULES = join(REPO, "frontend/node_modules");

/**
 * Lists the files under a folder, sorted, skipping any path with `.preview`.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function filesUnder(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => !path.includes(".preview"))
    .sort();
}

/**
 * Returns an installed package's version, or "absent".
 *
 * @param {string} name
 * @returns {Promise<string>}
 */
async function installed(name) {
  try {
    const text = await readFile(
      join(NODE_MODULES, name, "package.json"),
      "utf8",
    );
    return JSON.parse(text).version;
  } catch {
    return "absent";
  }
}

/**
 * Computes the key once and returns it with its parts.
 *
 * @returns {Promise<{key: string, files: number, bytes: number, toolchain: string[]}>}
 */
async function computeKey() {
  const files = [
    join(WORKSPACE, "tools/build-card-atlas.mjs"),
    ...(await filesUnder(join(WORKSPACE, "tools/card-atlas"))),
    ...(await filesUnder(
      join(WORKSPACE, "src/engine/render/assets/sprites/card"),
    )),
  ];
  const hash = createHash("sha256");
  let bytes = 0;
  for (const file of files) {
    const content = await readFile(file);
    bytes += content.length;
    hash
      .update(relative(WORKSPACE, file))
      .update("\0")
      .update(content)
      .update("\0");
  }
  const require = createRequire(join(NODE_MODULES, "x.js"));
  const sharp = require("sharp");
  const libc = process.report.getReport().header.glibcVersionRuntime
    ? "glibc"
    : "musl or other";
  const platformPackages = (await readdir(join(NODE_MODULES, "@img")))
    .filter((name) => name.startsWith("sharp-"))
    .concat(
      (await readdir(join(NODE_MODULES, "@resvg"))).filter((name) =>
        name.startsWith("resvg-js-"),
      ),
    );
  const toolchain = [
    `sharp ${await installed("sharp")}`,
    `libvips ${sharp.versions.vips}`,
    `@resvg/resvg-js ${await installed("@resvg/resvg-js")}`,
    ...(await Promise.all(
      platformPackages.map(async (name) => {
        const scope = name.startsWith("sharp-") ? "@img" : "@resvg";
        return `${scope}/${name} ${await installed(`${scope}/${name}`)}`;
      }),
    )),
    `${process.platform}-${process.arch}-${libc}`,
  ];
  hash.update(toolchain.join("\n"));
  return {
    key: hash.digest("hex").slice(0, 16),
    files: files.length,
    bytes,
    toolchain,
  };
}

async function main() {
  const times = [];
  /** @type {Awaited<ReturnType<typeof computeKey>> | undefined} */
  let result;
  for (let run = 0; run < 7; run++) {
    const started = process.hrtime.bigint();
    result = await computeKey();
    times.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  if (!result) return;
  times.sort((a, b) => a - b);
  console.log(`key: ${result.key}`);
  console.log(
    `files hashed: ${result.files}, ${(result.bytes / 1024 / 1024).toFixed(2)} MiB`,
  );
  console.log(`toolchain:\n  ${result.toolchain.join("\n  ")}`);
  console.log(
    `median of 7 runs: ${times[3]?.toFixed(1)} ms (fastest ${times[0]?.toFixed(1)} ms, slowest ${times[6]?.toFixed(1)} ms)`,
  );
}

await main();
