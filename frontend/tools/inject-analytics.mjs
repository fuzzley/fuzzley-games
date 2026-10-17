// Adds the site's analytics tags to the games in the build output.
//
// The pages under public/play/<slug>/ are production builds of the games'
// own repositories, fetched from their releases by fetch-games.mjs. Those
// repositories carry no analytics code, so the tags are added here instead,
// after `vite build`, to the copies in dist/, never to the fetched files in
// public/.
//
// Run as part of `yarn build`. Safe to re-run: a page that already has the
// tags is left alone.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readManifest } from "./games.mjs";

const frontendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(frontendDir, "dist");

// The same tags, in the same order, as the site's own index.html.
const TAGS =
  '<script src="/env.js"></script><script src="/analytics.js"></script>';

const closingHead = /<\/head>/i;

/**
 * Prints why the build failed and stops it.
 *
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`inject-analytics: ${message}`);
  process.exit(1);
}

// The tags are useless if what they point at is missing, so that fails the
// build rather than shipping pages that quietly 404.
for (const asset of ["env.js", "analytics.js"]) {
  if (!fs.existsSync(path.join(distDir, asset))) {
    fail(`dist/${asset} is missing, so the games' tags would lead nowhere.`);
  }
}

for (const slug of Object.keys(readManifest())) {
  const name = `play/${slug}/index.html`;
  const page = path.join(distDir, "play", slug, "index.html");
  if (!fs.existsSync(page)) {
    fail(`dist/${name} is missing. Did fetch-games.mjs run?`);
  }

  const html = fs.readFileSync(page, "utf8");
  if (html.includes("analytics.js")) {
    console.log(`inject-analytics: ${name} already instrumented`);
    continue;
  }
  if (!closingHead.test(html)) {
    fail(`${name} has no </head>, so its analytics tags can't be placed.`);
  }

  fs.writeFileSync(
    page,
    html.replace(closingHead, (head) => TAGS + head),
  );
  console.log(`inject-analytics: instrumented ${name}`);
}
