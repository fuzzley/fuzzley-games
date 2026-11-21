/**
 * Re-encodes every PNG committed at HEAD in a group, losslessly and lossily,
 * and prints each encoding's size and how far its decoded pixels stray.
 *
 *   node docs/repo-size/scripts/atlases/measure-encodings.mjs <group> [--oxipng <binary>]
 *
 * Groups: `atlas` (the card atlas pages, the only PNGs a build ships),
 * `screenshots` (the Solitaire Collection's lossless screenshots under
 * docs/screenshots/, which build:thumbs reads), `docs` (every other PNG, all
 * under a docs/ folder). Each distinct blob is measured once; a blob at
 * several paths is listed with how many.
 *
 * Pixel differences are measured on RGBA as decoded, two ways: straight,
 * every channel, and premultiplied (each colour channel times alpha), which
 * is what WebGL draws once Phaser uploads a texture with
 * UNPACK_PREMULTIPLY_ALPHA_WEBGL, so colour under a transparent pixel does
 * not count. "max" is the largest difference in any channel of any pixel,
 * out of 255.
 */
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs, promisify } from "node:util";
import sharp from "../../../../frontend/node_modules/sharp/dist/index.mjs";

const REPO = resolve(import.meta.dirname, "../../../..");

/** The groups, by which paths belong to them. */
const GROUPS = {
  atlas: (/** @type {string} */ path) =>
    /\/sprites\/atlas\/.*\.png$/.test(path),
  screenshots: (/** @type {string} */ path) =>
    /^frontend\/games\/solitaire\/docs\/screenshots\/.*\.png$/.test(path),
  docs: (/** @type {string} */ path) =>
    path.endsWith(".png") && !GROUPS.atlas(path) && !GROUPS.screenshots(path),
};

/**
 * The encodings tried, each turning a decoded image into bytes.
 *
 * @type {{name: string, lossless: "yes" | "check" | "no", encode: (raw: {data: Buffer, info: import("sharp").OutputInfo}) => Promise<Buffer>}[]}
 */
const ENCODINGS = [
  {
    name: "png-9",
    lossless: "yes",
    encode: (raw) => fromRaw(raw).png({ compressionLevel: 9 }).toBuffer(),
  },
  {
    name: "png-9-adaptive",
    lossless: "yes",
    encode: (raw) =>
      fromRaw(raw)
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
        .toBuffer(),
  },
  {
    name: "png-palette",
    lossless: "check",
    encode: (raw) =>
      fromRaw(raw)
        .png({
          palette: true,
          colours: 256,
          quality: 100,
          effort: 10,
          dither: 0,
          compressionLevel: 9,
        })
        .toBuffer(),
  },
  {
    name: "webp-lossless",
    lossless: "check",
    encode: (raw) =>
      fromRaw(raw).webp({ lossless: true, effort: 6 }).toBuffer(),
  },
  {
    name: "webp-lossless-exact",
    lossless: "yes",
    encode: (raw) =>
      fromRaw(raw).webp({ lossless: true, effort: 6, exact: true }).toBuffer(),
  },
  {
    name: "webp-near-80",
    lossless: "no",
    encode: (raw) =>
      fromRaw(raw)
        .webp({ nearLossless: true, quality: 80, effort: 6 })
        .toBuffer(),
  },
  {
    name: "webp-near-60",
    lossless: "no",
    encode: (raw) =>
      fromRaw(raw)
        .webp({ nearLossless: true, quality: 60, effort: 6 })
        .toBuffer(),
  },
  {
    name: "webp-q90",
    lossless: "no",
    encode: (raw) =>
      fromRaw(raw)
        .webp({
          quality: 90,
          alphaQuality: 100,
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer(),
  },
  {
    name: "webp-q80",
    lossless: "no",
    encode: (raw) =>
      fromRaw(raw)
        .webp({
          quality: 80,
          alphaQuality: 100,
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer(),
  },
];

/**
 * Returns a sharp pipeline over decoded RGBA.
 *
 * @param {{data: Buffer, info: import("sharp").OutputInfo}} raw
 * @returns {import("sharp").Sharp}
 */
function fromRaw(raw) {
  return sharp(raw.data, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  });
}

/**
 * Decodes an image to RGBA.
 *
 * @param {Buffer} bytes
 * @returns {Promise<{data: Buffer, info: import("sharp").OutputInfo}>}
 */
function decode(bytes) {
  return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/**
 * Measures how far one decoded image strays from another.
 *
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {{maxStraight: number, maxPremultiplied: number, meanPremultiplied: number, over8: number}}
 */
function difference(a, b) {
  let maxStraight = 0;
  let maxPremultiplied = 0;
  let sum = 0;
  let over8 = 0;
  for (let i = 0; i < a.length; i += 4) {
    const alphaA = a[i + 3] ?? 0;
    const alphaB = b[i + 3] ?? 0;
    let pixelMax = Math.abs(alphaA - alphaB);
    for (let c = 0; c < 3; c++) {
      maxStraight = Math.max(
        maxStraight,
        Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0)),
      );
      const pa = ((a[i + c] ?? 0) * alphaA) / 255;
      const pb = ((b[i + c] ?? 0) * alphaB) / 255;
      const d = Math.abs(pa - pb);
      pixelMax = Math.max(pixelMax, d);
      sum += d;
    }
    maxStraight = Math.max(maxStraight, Math.abs(alphaA - alphaB));
    sum += Math.abs(alphaA - alphaB);
    maxPremultiplied = Math.max(maxPremultiplied, pixelMax);
    if (pixelMax > 8) over8++;
  }
  return {
    maxStraight,
    maxPremultiplied: Math.round(maxPremultiplied),
    meanPremultiplied: sum / a.length,
    over8,
  };
}

/**
 * Counts an image's distinct RGBA colours, up to a limit.
 *
 * @param {Buffer} data
 * @param {number} limit
 * @returns {number}
 */
function countColours(data, limit) {
  const seen = new Set();
  for (let i = 0; i < data.length && seen.size <= limit; i += 4) {
    seen.add(data.readUInt32LE(i));
  }
  return seen.size;
}

/**
 * Runs oxipng losslessly over a PNG and returns the size it reaches.
 *
 * @param {string} binary
 * @param {Buffer} png
 * @param {string[]} flags
 * @returns {Promise<number>}
 */
async function oxipngSize(binary, png, flags) {
  const dir = await mkdtemp(join(tmpdir(), "oxipng-"));
  try {
    const file = join(dir, "in.png");
    await writeFile(file, png);
    await promisify(execFile)(binary, [
      ...flags,
      "--threads",
      "2",
      "--quiet",
      file,
    ]);
    return (await readFile(file)).length;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Runs tasks a few at a time and returns their results in order.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} run
 * @returns {Promise<R[]>}
 */
async function eachLimited(items, limit, run) {
  /** @type {R[]} */
  const results = new Array(items.length);
  const queue = items.entries();
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (const [index, item] of queue) results[index] = await run(item);
    }),
  );
  return results;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { oxipng: { type: "string" } },
  });
  const group = /** @type {keyof typeof GROUPS} */ (positionals[0] ?? "atlas");
  const inGroup = GROUPS[group];
  if (!inGroup) throw new Error(`No group ${group}`);

  const listed = execFileSync("git", ["ls-tree", "-r", "-l", "HEAD"], {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .trim()
    .split("\n")
    .map((row) => {
      const [meta, path] = row.split("\t");
      const fields = (meta ?? "").split(/\s+/);
      return { id: fields[2] ?? "", size: Number(fields[3]), path: path ?? "" };
    })
    .filter((entry) => inGroup(entry.path));

  /** @type {Map<string, {id: string, size: number, paths: string[]}>} */
  const blobs = new Map();
  for (const entry of listed) {
    const blob = blobs.get(entry.id) ?? {
      id: entry.id,
      size: entry.size,
      paths: [],
    };
    blob.paths.push(entry.path);
    blobs.set(entry.id, blob);
  }

  sharp.concurrency(Math.max(1, Math.floor(availableParallelism() / 4)));
  const columns = [
    "png-at-HEAD",
    ...(values.oxipng ? ["oxipng-max", "oxipng-max-alpha"] : []),
    ...ENCODINGS.map((e) => e.name),
  ];

  const rows = await eachLimited([...blobs.values()], 6, async (blob) => {
    const png = execFileSync("git", ["cat-file", "blob", blob.id], {
      cwd: REPO,
      maxBuffer: 64 * 1024 * 1024,
    });
    const raw = await decode(png);
    const meta = await sharp(png).metadata();
    /** @type {Record<string, {size: number, note: string}>} */
    const cells = { "png-at-HEAD": { size: png.length, note: "" } };
    const oxipng = values.oxipng
      ? Promise.all([
          oxipngSize(values.oxipng, png, ["-o", "max", "--strip", "safe"]),
          oxipngSize(values.oxipng, png, [
            "-o",
            "max",
            "--strip",
            "safe",
            "--alpha",
          ]),
        ])
      : undefined;
    for (const encoding of ENCODINGS) {
      const bytes = await encoding.encode(raw);
      const decoded = await decode(bytes);
      const diff = difference(raw.data, decoded.data);
      let note;
      if (diff.maxStraight === 0) note = "lossless";
      else if (diff.maxPremultiplied === 0)
        note = "lossless once premultiplied";
      else {
        note =
          `max ${diff.maxPremultiplied} premult (${diff.maxStraight} straight), ` +
          `mean ${diff.meanPremultiplied.toFixed(3)}, ${diff.over8} px >8`;
      }
      cells[encoding.name] = { size: bytes.length, note };
    }
    if (oxipng) {
      const [plain, alpha] = await oxipng;
      cells["oxipng-max"] = { size: plain, note: "lossless" };
      cells["oxipng-max-alpha"] = {
        size: alpha,
        note: "lossless but for colour under alpha 0, which --alpha may change",
      };
    }
    const colours = countColours(raw.data, 256);
    return {
      blob,
      cells,
      info:
        `${raw.info.width}x${raw.info.height}, ${meta.channels} channels, ` +
        `${colours > 256 ? ">256" : colours} colours, ICC ${meta.hasProfile ? "yes" : "no"}`,
    };
  });

  const kib = (/** @type {number} */ bytes) => (bytes / 1024).toFixed(0);
  const mib = (/** @type {number} */ bytes) => (bytes / 1024 / 1024).toFixed(2);
  console.log(
    `group: ${group}, ${listed.length} files, ${blobs.size} distinct blobs`,
  );
  console.log(
    `sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}, libwebp ${sharp.versions.webp}`,
  );
  for (const { blob, cells, info } of rows) {
    console.log(
      `\n${blob.paths[0]}${blob.paths.length > 1 ? ` (and ${blob.paths.length - 1} more paths, same blob)` : ""}`,
    );
    console.log(`  ${info}`);
    for (const column of columns) {
      const cell = cells[column];
      if (!cell) continue;
      const share = ((cell.size / blob.size) * 100).toFixed(1);
      console.log(
        `  ${column.padEnd(20)} ${kib(cell.size).padStart(6)} KiB  ${share.padStart(5)}%  ${cell.note}`,
      );
    }
  }

  console.log("\nTotals over distinct blobs (each counted once):");
  const headTotal = rows.reduce((sum, row) => sum + row.blob.size, 0);
  for (const column of columns) {
    const total = rows.reduce(
      (sum, row) => sum + (row.cells[column]?.size ?? 0),
      0,
    );
    const lossless = rows.every((row) => {
      const note = row.cells[column]?.note ?? "";
      return note === "" || note.startsWith("lossless");
    });
    console.log(
      `  ${column.padEnd(20)} ${mib(total).padStart(7)} MiB  ${((total / headTotal) * 100).toFixed(1).padStart(5)}%  ` +
        `saves ${mib(headTotal - total).padStart(6)} MiB  ${lossless ? "lossless on every file" : "lossy on some file"}`,
    );
  }
  const pathTotal = listed.reduce((sum, entry) => sum + entry.size, 0);
  console.log(
    `\nAt HEAD the group's ${listed.length} paths hold ${mib(pathTotal)} MiB (blobs shared by several paths counted at each).`,
  );
}

await main();
