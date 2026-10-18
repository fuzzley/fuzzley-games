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

/**
 * Keeps the Yarn and Node settings at the root, and keeps each workspace
 * private and named after its folder, so `yarn workspace <name>` names the
 * folder it runs in.
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
    if (workspace.ident !== folder) {
      workspace.error(`a workspace is named after its folder, ${folder}.`);
    }
  }
}

module.exports = defineConfig({
  async constraints(context) {
    sameRangeEverywhere(context);
    rootHoldsTheSetup(context);
  },
});
