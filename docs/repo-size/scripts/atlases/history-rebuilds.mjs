/**
 * Lists every commit that wrote card atlas pages, with how many PNG blobs it
 * added and what they weigh, as git stores them and packed.
 *
 *   node docs/repo-size/scripts/atlases/history-rebuilds.mjs [screenshots]
 *
 * With `screenshots`, it lists the Solitaire Collection's lossless
 * screenshots under docs/screenshots/ instead of the atlas pages.
 *
 * A blob's packed size is `%(objectsize:disk)`, which depends on how the
 * local repository was last packed; a PNG barely deltas, so it is close to
 * the blob's own size either way. Paths before the Solitaire Collection
 * became a workspace of the frontend are followed by their atlas folder's
 * name, wherever it sat.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");

/**
 * Runs git and returns what it printed.
 *
 * @param {string[]} args
 * @param {string} [input]
 * @returns {string}
 */
function git(args, input) {
  return execFileSync("git", args, {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    ...(input !== undefined && { input }),
  });
}

/**
 * Matches an atlas page's path, wherever the atlas folder sat, or with
 * `screenshots`, a lossless screenshot's.
 */
const PAGE =
  process.argv[2] === "screenshots"
    ? /docs\/screenshots\/[^/]+\/[^/]+\.png$/
    : /sprites\/atlas\/.*\.png$/;

/** What the matched files are called in what this prints. */
const WHAT = process.argv[2] === "screenshots" ? "screenshots" : "atlas pages";

function main() {
  // Every commit reachable from HEAD, with the blobs it added or modified.
  const log = git([
    "log",
    "--format=commit %h %ad %s",
    "--date=short",
    "--raw",
    "--no-abbrev",
    "--no-renames",
    "HEAD",
  ]);

  /** @type {{commit: string, blobs: {id: string, path: string}[]}[]} */
  const commits = [];
  for (const line of log.split("\n")) {
    if (line.startsWith("commit ")) {
      commits.push({ commit: line.slice(7), blobs: [] });
    } else if (line.startsWith(":")) {
      const [meta, path] = line.split("\t");
      const fields = (meta ?? "").split(" ");
      const status = fields[4];
      const id = fields[3];
      if (path && PAGE.test(path) && status !== "D" && id) {
        commits.at(-1)?.blobs.push({ id, path });
      }
    }
  }

  const touched = commits.filter((c) => c.blobs.length > 0);
  const ids = [...new Set(touched.flatMap((c) => c.blobs.map((b) => b.id)))];
  const sizes = new Map(
    git(
      [
        "cat-file",
        "--batch-check=%(objectname) %(objectsize) %(objectsize:disk)",
      ],
      `${ids.join("\n")}\n`,
    )
      .trim()
      .split("\n")
      .map((row) => {
        const [id, size, disk] = row.split(" ");
        return [id, { size: Number(size), disk: Number(disk) }];
      }),
  );

  const mib = (/** @type {number} */ bytes) => (bytes / 1024 / 1024).toFixed(2);
  let totalSize = 0;
  let totalDisk = 0;
  let totalBlobs = 0;
  console.log(
    "commit | date | subject | new PNG blobs | MiB as blobs | MiB packed",
  );
  for (const { commit, blobs } of touched.reverse()) {
    const unique = [...new Set(blobs.map((b) => b.id))];
    const size = unique.reduce(
      (sum, id) => sum + (sizes.get(id)?.size ?? 0),
      0,
    );
    const disk = unique.reduce(
      (sum, id) => sum + (sizes.get(id)?.disk ?? 0),
      0,
    );
    totalSize += size;
    totalDisk += disk;
    totalBlobs += unique.length;
    const [hash, date, ...subject] = commit.split(" ");
    console.log(
      `${hash} | ${date} | ${subject.join(" ").slice(0, 70)} | ${unique.length} | ${mib(size)} | ${mib(disk)}`,
    );
  }
  console.log(
    `\n${touched.length} commits wrote ${WHAT}: ${totalBlobs} blobs counted ` +
      `per commit, ${mib(totalSize)} MiB as blobs, ${mib(totalDisk)} MiB packed`,
  );
  const distinctSize = ids.reduce(
    (sum, id) => sum + (sizes.get(id)?.size ?? 0),
    0,
  );
  const distinctDisk = ids.reduce(
    (sum, id) => sum + (sizes.get(id)?.disk ?? 0),
    0,
  );
  console.log(
    `${ids.length} distinct PNG blobs: ${mib(distinctSize)} MiB as blobs, ` +
      `${mib(distinctDisk)} MiB packed (what the history holds)`,
  );

  // What one whole rebuild writes today: every page at HEAD, each distinct
  // blob once, as git would store a rebuild that changed every page.
  const head = git(["ls-tree", "-r", "-l", "HEAD"])
    .trim()
    .split("\n")
    .map((row) => row.split(/\s+/))
    .filter((f) => PAGE.test(f.slice(4).join(" ")));
  const headIds = new Set(head.map((f) => f[2]));
  const headSize = [...headIds].reduce(
    (sum, id) => sum + Number(head.find((f) => f[2] === id)?.[3] ?? 0),
    0,
  );
  console.log(
    `HEAD: ${head.length} ${WHAT}, ${headIds.size} distinct blobs, ` +
      `${mib(headSize)} MiB of distinct blobs (the most one full rebuild adds)`,
  );
  const packedHead = [...headIds].reduce(
    (sum, id) => sum + (sizes.get(id)?.disk ?? 0),
    0,
  );
  console.log(`HEAD's distinct blobs packed: ${mib(packedHead)} MiB`);
}

main();
