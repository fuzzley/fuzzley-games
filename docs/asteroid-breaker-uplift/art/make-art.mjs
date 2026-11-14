// Draws every sheet of the uplift's art again, the same bytes every run:
//
//   node docs/asteroid-breaker-uplift/art/make-art.mjs            every sheet
//   node docs/asteroid-breaker-uplift/art/make-art.mjs rocks      only those named
//
// Each sheet is a script in sheets/ that exports build(), which writes its
// SVG here and a PNG in preview/ to check by eye. This writes the WebP
// beside each PNG, which is the preview that is kept.

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sharp } from "./lib/raster.mjs";

const here = import.meta.dirname;
const asked = process.argv.slice(2);
const sheets = (await readdir(join(here, "sheets")))
  .filter((file) => file.endsWith(".mjs"))
  .map((file) => file.replace(/\.mjs$/, ""))
  .filter((name) => asked.length === 0 || asked.includes(name))
  .sort();

for (const name of sheets) {
  /** @type {{ build: () => Promise<void> }} */
  const sheet = await import(
    pathToFileURL(join(here, "sheets", `${name}.mjs`)).href
  );
  await sheet.build();
  await sharp(join(here, "preview", `${name}.png`))
    .webp({ quality: 86 })
    .toFile(join(here, "preview", `${name}.webp`));
  console.log(`${name}.svg`);
}
