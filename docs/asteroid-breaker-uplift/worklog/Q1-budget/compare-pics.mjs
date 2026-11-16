// Compares the screenshots pics.mjs took of two builds, pixel by pixel: for each, how many pixels differ, by how much at most, and where the differing ones lie (their bounding box), or that one of the pair is missing.
// Usage: node compare-pics.mjs <folder> <build A> <build B>; it pairs <name>-<A>-<frame>.png with <name>-<B>-<frame>.png. SHARP names sharp's entry (frontend's by default).
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  new URL("../../../../frontend/package.json", import.meta.url),
);
const sharp = require(process.env.SHARP ?? "sharp");
const [folder, a, b] = process.argv.slice(2);
const files = readdirSync(folder).filter(
  (f) => f.includes(`-${a}-`) && f.endsWith(".png"),
);
let all = 0;
for (const other of readdirSync(folder).filter(
  (f) => f.includes(`-${b}-`) && f.endsWith(".png"),
)) {
  const file = other.replace(`-${b}-`, `-${a}-`);
  if (!existsSync(join(folder, file))) {
    console.log(`${other}: ${file} is missing`);
    all += 1;
  }
}
for (const file of files.sort()) {
  const other = file.replace(`-${a}-`, `-${b}-`);
  if (!existsSync(join(folder, other))) {
    console.log(`${file}: ${other} is missing`);
    all += 1;
    continue;
  }
  const [one, two] = await Promise.all(
    [file, other].map((f) =>
      sharp(join(folder, f))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ),
  );
  const { width, height } = one.info;
  if (width !== two.info.width || height !== two.info.height) {
    console.log(`${file}: sizes differ`);
    all += 1;
    continue;
  }
  let differ = 0;
  let most = 0;
  let box = [width, height, -1, -1];
  for (let i = 0; i < one.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++)
      d = Math.max(d, Math.abs(one.data[i + c] - two.data[i + c]));
    if (d === 0) continue;
    differ += 1;
    most = Math.max(most, d);
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    box = [
      Math.min(box[0], x),
      Math.min(box[1], y),
      Math.max(box[2], x),
      Math.max(box[3], y),
    ];
  }
  if (differ) all += 1;
  console.log(
    `${file.replace(`-${a}-`, "-")}: ${width}x${height} ${differ} differ${differ ? `, by ${most} at most, within ${box.join(",")}` : ""}`,
  );
}
console.log(`${files.length} pairs, ${all} differing or missing one`);
