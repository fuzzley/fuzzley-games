// The workspace's eslint.config.js, whose blocks set one rule's options in
// turn, so a later block's take the place of an earlier's for a file both
// match: the specs' helpers' fence must pass over the files held as the
// rules are, or theirs would take the place of the rules'.

import { join } from "node:path";
import { isListOf, isRecord } from "@fz/core/json";
import { ESLint } from "eslint";
import { HELD_AS_RULES } from "../eslint.config.js";

const ROOT = join(import.meta.dirname, "..");

/** The rule both fences set. */
const FENCE = "@typescript-eslint/no-restricted-imports";

/**
 * Returns the patterns of imports the workspace's config refuses a file,
 * and throws where it refuses none, or only warns, so no spec holds an
 * empty fence.
 */
async function fenceOf(
  eslint: ESLint,
  file: string,
): Promise<Record<string, unknown>[]> {
  const config: unknown = await eslint.calculateConfigForFile(join(ROOT, file));
  const rules = isRecord(config) ? config["rules"] : undefined;
  const rule: unknown = isRecord(rules) ? rules[FENCE] : undefined;
  // ESLint gives a rule's severity as a number, 2 for an error; a block
  // that sets a severity alone keeps the options before it.
  if (!Array.isArray(rule) || rule[0] !== 2) {
    throw new Error(`The config doesn't refuse ${file}'s imports as errors.`);
  }
  const options: unknown = rule[1];
  const patterns: unknown = isRecord(options) ? options["patterns"] : [];
  if (!isListOf(patterns, isRecord) || patterns.length === 0) {
    throw new Error(`The config refuses ${file} no imports.`);
  }
  return patterns;
}

describe("eslint.config.js", () => {
  const eslint = new ESLint({ cwd: ROOT });

  it.each(HELD_AS_RULES)(
    "holds %s to every pattern of the rules' fence",
    async (file) => {
      const rules = await fenceOf(eslint, "src/rules/run/run.ts");

      const held = await fenceOf(eslint, file);

      expect(held).toEqual(expect.arrayContaining(rules));
    },
  );
});
