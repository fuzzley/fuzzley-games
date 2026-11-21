/**
 * Runs the Solitaire Collection's card atlas generator in a scratch mirror,
 * so the tracked atlases are never rewritten, and prints how long it took.
 *
 *   node docs/repo-size/scripts/atlases/run-generator.mjs <label> [--cpus 0-3]
 *     [--node-modules <dir>] [--rev <commit>]
 *
 * The mirror holds copies of `tools/` and the SVG card sheets, with
 * `node_modules` linked to the frontend's, laid out as the workspace is, so
 * the generator writes its atlases into the mirror's
 * `src/engine/render/assets/sprites/atlas/`. `--cpus` runs it under taskset
 * on those CPUs only, with libuv's pool sized to match, to stand in for a
 * smaller runner. `--node-modules` links another `node_modules` in place of
 * the frontend's, to run the generator on other versions of sharp or resvg,
 * and `--rev` takes the tools and card sheets from a commit instead of the
 * worktree.
 * Prints wall time, the child's user and system CPU time
 * from /proc/self/stat, and its peak resident memory.
 */
import { execSync, spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const REPO = resolve(import.meta.dirname, "../../../..");
const WORKSPACE = join(REPO, "frontend/games/solitaire");
const SCRATCH =
  process.env.ATLAS_SCRATCH ??
  "/tmp/claude-1000/-home-dev-Projects-personal/0429104f-131c-55d3-83d6-9e70ee0dbce1/scratchpad/atlases";

/** Clock ticks a second, as `getconf CLK_TCK` gives on Linux. */
const CLK_TCK = 100;

/**
 * Returns this process's waited-for children's user and system CPU seconds.
 *
 * @returns {Promise<{user: number, system: number}>}
 */
async function childCpu() {
  const stat = await readFile("/proc/self/stat", "utf8");
  // Fields after the parenthesised command name; cutime and cstime are the
  // 16th and 17th fields of the whole line.
  const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  return {
    user: Number(fields[13]) / CLK_TCK,
    system: Number(fields[14]) / CLK_TCK,
  };
}

/**
 * Builds the mirror for one run and returns its folder.
 *
 * @param {string} label
 * @param {string} nodeModules
 * @param {string | undefined} rev
 * @returns {Promise<string>}
 */
async function makeMirror(label, nodeModules, rev) {
  const mirror = join(SCRATCH, `mirror-${label}`);
  await rm(mirror, { recursive: true, force: true });
  await mkdir(join(mirror, "src/engine/render/assets/sprites"), {
    recursive: true,
  });
  if (rev) {
    execSync(
      `git archive --format=tar ${rev} frontend/games/solitaire/tools ` +
        `frontend/games/solitaire/src/engine/render/assets/sprites/card | ` +
        `tar x --strip-components=3 -C ${JSON.stringify(mirror)}`,
      { cwd: REPO },
    );
    await symlink(nodeModules, join(mirror, "node_modules"));
    return mirror;
  }
  await cp(join(WORKSPACE, "tools"), join(mirror, "tools"), {
    recursive: true,
    filter: (path) => !path.includes(".preview"),
  });
  await cp(
    join(WORKSPACE, "src/engine/render/assets/sprites/card"),
    join(mirror, "src/engine/render/assets/sprites/card"),
    { recursive: true },
  );
  await symlink(nodeModules, join(mirror, "node_modules"));
  return mirror;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      cpus: { type: "string" },
      "node-modules": { type: "string" },
      rev: { type: "string" },
    },
  });
  const label = positionals[0] ?? "run";
  const nodeModules = resolve(
    values["node-modules"] ?? join(REPO, "frontend/node_modules"),
  );
  const mirror = await makeMirror(label, nodeModules, values.rev);

  const command = values.cpus
    ? ["taskset", "-c", values.cpus, "node", "tools/build-card-atlas.mjs"]
    : ["node", "tools/build-card-atlas.mjs"];
  const cpuCount = values.cpus
    ? values.cpus
        .split(",")
        .map((range) => range.split("-").map(Number))
        .reduce((sum, [from, to = from]) => sum + to - from + 1, 0)
    : undefined;

  const before = await childCpu();
  const started = process.hrtime.bigint();
  const child = spawn(command[0], command.slice(1), {
    cwd: mirror,
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      ...(cpuCount && { UV_THREADPOOL_SIZE: String(cpuCount) }),
    },
  });
  let peakKb = 0;
  const poll = setInterval(async () => {
    try {
      const status = await readFile(`/proc/${child.pid}/status`, "utf8");
      const match = /VmHWM:\s+(\d+) kB/.exec(status);
      if (match) peakKb = Math.max(peakKb, Number(match[1]));
    } catch {
      // The child has gone.
    }
  }, 50);
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  const code = await new Promise((done) => child.on("close", done));
  clearInterval(poll);
  const wall = Number(process.hrtime.bigint() - started) / 1e9;
  const after = await childCpu();

  const lines = output.trimEnd().split("\n");
  console.log(`label: ${label}`);
  console.log(`mirror: ${mirror}`);
  console.log(`command: ${command.join(" ")}`);
  console.log(`node_modules: ${nodeModules}`);
  console.log(`tools from: ${values.rev ?? "the worktree"}`);
  console.log(`VIPS_NOVECTOR: ${process.env.VIPS_NOVECTOR ?? "unset"}`);
  const { createRequire } = await import("node:module");
  const required = createRequire(join(mirror, "tools/x.mjs"));
  const sharpPackage = JSON.parse(
    await readFile(join(nodeModules, "sharp/package.json"), "utf8"),
  );
  const resvgPackage = JSON.parse(
    await readFile(join(nodeModules, "@resvg/resvg-js/package.json"), "utf8"),
  );
  const sharpVersions = required("sharp").versions;
  console.log(
    `sharp ${sharpPackage.version}, libvips ${sharpVersions.vips}, ` +
      `@resvg/resvg-js ${resvgPackage.version}, node ${process.version}, ` +
      `${process.platform}-${process.arch}`,
  );
  console.log(
    `cpus: ${values.cpus ?? `all (${(await import("node:os")).availableParallelism()})`}`,
  );
  console.log(`exit code: ${code}`);
  console.log(`wall seconds: ${wall.toFixed(2)}`);
  console.log(`user cpu seconds: ${(after.user - before.user).toFixed(2)}`);
  console.log(
    `system cpu seconds: ${(after.system - before.system).toFixed(2)}`,
  );
  console.log(`peak rss MiB (sampled): ${(peakKb / 1024).toFixed(0)}`);
  console.log(`generator's last line: ${lines.at(-1)}`);
  console.log(`generator printed ${lines.length} lines`);
  if (code !== 0) process.exitCode = 1;
}

await main();
