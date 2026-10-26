// What every workspace's package.json keeps to, which `yarn constraints`
// checks as part of `yarn lint`. `yarn constraints --fix` makes the changes
// it can make on its own.

const path = require("node:path");
const { defineConfig } = require("@yarnpkg/types");
const semver = require("semver");

/** @typedef {import("@yarnpkg/types").Yarn.Constraints.Context} Context */
/** @typedef {import("@yarnpkg/types").Yarn.Constraints.Dependency} Dependency */

/**
 * Returns the higher of two ranges, the one whose lowest version is higher,
 * or undefined when that doesn't tell them apart, as for `^1.2.0` and
 * `~1.2.0`, or for a range that isn't semver.
 *
 * @param {string} a
 * @param {string} b
 * @returns {string | undefined}
 */
function higherRange(a, b) {
  const lowestA = semver.validRange(a) ? semver.minVersion(a) : null;
  const lowestB = semver.validRange(b) ? semver.minVersion(b) : null;
  if (!lowestA || !lowestB) return undefined;
  const order = semver.compare(lowestA, lowestB);
  if (order === 0) return undefined;
  return order > 0 ? a : b;
}

/**
 * Requires a package to have the same range in every workspace that depends
 * on it, so they share one copy of it. `--fix` gives every workspace the
 * highest.
 *
 * @param {Context} context
 */
function sameRangeEverywhere({ Yarn }) {
  /** @type {Map<string, Dependency[]>} */
  const byIdent = new Map();
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === "peerDependencies") continue;
    byIdent.set(dependency.ident, [
      ...(byIdent.get(dependency.ident) ?? []),
      dependency,
    ]);
  }
  for (const dependencies of byIdent.values()) {
    const ranges = [...new Set(dependencies.map(({ range }) => range))];
    if (ranges.length === 1) continue;
    /** @type {string | undefined} */
    let highest = ranges[0];
    for (const range of ranges.slice(1)) {
      highest = highest === undefined ? undefined : higherRange(highest, range);
    }
    for (const dependency of dependencies) {
      if (highest !== undefined) {
        dependency.update(highest);
        continue;
      }
      dependency.error(
        `${dependency.ident} is ${dependency.range} here, but ` +
          `${ranges.filter((range) => range !== dependency.range).join(", ")} ` +
          "elsewhere: give every workspace the same one.",
      );
    }
  }
}

/**
 * Requires a peer range to be the range the workspace tests with, its own
 * devDependency, so a library claims to work with only what it is checked
 * against.
 *
 * @param {Context} context
 */
function peersAreWhatIsTested({ Yarn }) {
  for (const peer of Yarn.dependencies({ type: "peerDependencies" })) {
    const tested = Yarn.dependency({
      workspace: peer.workspace,
      ident: peer.ident,
      type: "devDependencies",
    });
    if (tested) {
      peer.update(tested.range);
    } else {
      peer.error(
        `${peer.ident} is a peer but not a devDependency, so nothing tests ` +
          "the library with it.",
      );
    }
  }
}

/** The folder of the libraries the site and the games share. */
const LIBRARIES = "lib/";

/** The scope a library's name carries, so an import of one says so. */
const LIBRARY_SCOPE = "@fz/";

/**
 * Keeps the Yarn and Node settings at the root, and keeps each workspace
 * private and named after its folder, so `yarn workspace <name>` names the
 * folder it runs in. A library's name carries the `@fz` scope too.
 *
 * @param {Context} context
 */
function rootHoldsTheSetup({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    workspace.set("private", true);
    if (workspace.cwd === ".") {
      if (Object.keys(workspace.manifest.dependencies ?? {}).length > 0) {
        workspace.error(
          "the root depends only on the tools it runs, as devDependencies.",
        );
      }
      continue;
    }
    for (const field of ["packageManager", "workspaces", "engines"]) {
      workspace.unset(field);
    }
    const folder = path.posix.basename(workspace.cwd);
    const name = workspace.cwd.startsWith(LIBRARIES)
      ? LIBRARY_SCOPE + folder
      : folder;
    if (workspace.ident !== name) {
      workspace.error(`a workspace is named after its folder, ${name}.`);
    }
  }
}

/**
 * Keeps imports going one way: a library may depend on another library, but
 * never on the site or a game.
 *
 * @param {Context} context
 */
function librariesDependOnLibrariesOnly({ Yarn }) {
  for (const library of Yarn.workspaces()) {
    if (!library.cwd.startsWith(LIBRARIES)) continue;
    for (const dependency of Yarn.dependencies({ workspace: library })) {
      const target = Yarn.workspace({ ident: dependency.ident });
      if (target && !target.cwd.startsWith(LIBRARIES)) {
        dependency.error(
          `a library depends only on other libraries, not on ${target.cwd}.`,
        );
      }
    }
  }
}

/** The folder of the games built here. */
const GAMES = "games/";

/** The scripts the root runs in every workspace. */
const CHECKS = ["lint", "typecheck", "test"];

/**
 * Requires every workspace to have the scripts the root runs in each, and
 * every game a `build`, since `yarn workspaces foreach run` skips a workspace
 * without the script and says nothing.
 *
 * @param {Context} context
 */
function everyWorkspaceIsChecked({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    if (workspace.cwd === ".") continue;
    /** @type {Record<string, string>} */
    const scripts = workspace.manifest.scripts ?? {};
    const required = workspace.cwd.startsWith(GAMES)
      ? [...CHECKS, "build"]
      : CHECKS;
    for (const script of required) {
      if (!(script in scripts)) {
        workspace.error(
          `it has no "${script}" script, which the root runs in every ` +
            "workspace and skips where it is missing.",
        );
      }
    }
  }
}

module.exports = defineConfig({
  async constraints(context) {
    sameRangeEverywhere(context);
    peersAreWhatIsTested(context);
    rootHoldsTheSetup(context);
    librariesDependOnLibrariesOnly(context);
    everyWorkspaceIsChecked(context);
  },
});
