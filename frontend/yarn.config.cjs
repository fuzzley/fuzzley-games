// What every workspace's package.json keeps to, which `yarn constraints`
// checks as part of `yarn lint`. `yarn constraints --fix` makes the changes
// it can make on its own.

const path = require("node:path");
const { defineConfig } = require("@yarnpkg/types");

/** @typedef {import("@yarnpkg/types").Yarn.Constraints.Context} Context */

/**
 * Requires a package to have the same range in every workspace that depends
 * on it, so they share one copy of it.
 *
 * @param {Context} context
 */
function sameRangeEverywhere({ Yarn }) {
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === "peerDependencies") continue;
    for (const other of Yarn.dependencies({ ident: dependency.ident })) {
      if (other.type === "peerDependencies") continue;
      if (other.range === dependency.range) continue;
      dependency.error(
        `${dependency.ident} is ${dependency.range} here but ${other.range} ` +
          `in ${other.workspace.ident}: give both the higher one.`,
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

module.exports = defineConfig({
  async constraints(context) {
    sameRangeEverywhere(context);
    rootHoldsTheSetup(context);
    librariesDependOnLibrariesOnly(context);
  },
});
