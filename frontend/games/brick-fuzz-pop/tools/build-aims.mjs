#!/usr/bin/env node
/**
 * Writes `src/rules/aims.ts`: the heading of each of the 657 aims a
 * fuzzball can leave along, a unit long, as two numbers written out.
 *
 *   yarn build:aims
 *
 * The rules turn a fuzzball with no function of `Math` whose last digit
 * engines may round apart, so they take its headings from the file rather
 * than from `Math.cos()` and `Math.sin()`, and a flight comes out the same
 * in every browser. Each number is written with `String()`, which reads
 * back as the same number, so the file holds Node's cosines and sines to
 * the bit, and the same bytes every run. `src/rules/aims.spec.ts` holds the
 * file to what this writes now.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AIM_COUNT,
  AIMS_PER_DEGREE,
  FIRST_AIM_DEGREES,
} from "../src/rules/tuning.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the aims are written. */
export const AIMS_FILE = join(ROOT, "src", "rules", "aims.ts");

/**
 * Returns the angle an aim points at, in degrees counter-clockwise from the
 * floor on the right.
 *
 * @param {number} aim The aim's index, 0 to 656.
 * @returns {number}
 */
export function degreesOf(aim) {
  return FIRST_AIM_DEGREES + aim / AIMS_PER_DEGREE;
}

/**
 * Returns the angle an aim points at, in radians counter-clockwise from the
 * floor on the right.
 *
 * @param {number} aim The aim's index, 0 to 656.
 * @returns {number}
 */
export function angleOf(aim) {
  return (degreesOf(aim) * Math.PI) / 180;
}

/**
 * Returns the source of `src/rules/aims.ts`, as Prettier would format it.
 *
 * @returns {string}
 */
export function aimsSource() {
  const last = degreesOf(AIM_COUNT - 1);
  const pairs = Array.from({ length: AIM_COUNT }, (_, aim) => {
    const angle = angleOf(aim);
    return `  [${String(Math.cos(angle))}, ${String(Math.sin(angle))}],`;
  });
  return [
    "// Written by tools/build-aims.mjs (`yarn build:aims`), which",
    "// src/rules/aims.spec.ts holds it to: run the script rather than edit it.",
    "",
    "/**",
    ` * Each aim's heading, \`[dx, dy]\`, a unit long: aim \`i\` points`,
    ` * ${FIRST_AIM_DEGREES}° + i/${AIMS_PER_DEGREE}° from the floor on the right, counter-clockwise, from`,
    ` * ${FIRST_AIM_DEGREES}° to ${last}°, as Node's \`Math.cos()\` and \`Math.sin()\` give them.`,
    " */",
    "export const AIMS: readonly (readonly [dx: number, dy: number])[] = [",
    ...pairs,
    "];",
    "",
  ].join("\n");
}

if (import.meta.main) writeFileSync(AIMS_FILE, aimsSource());
