import { basename, dirname } from "node:path";
import { type Speed, isSpeed } from "../rules/speed";

/**
 * Returns the speed a spec file is named for, in the folder that keeps a
 * spec for each speed, so a file can only play the speed its name says.
 *
 * @throws {Error} When the file is named for no speed, or lies outside the
 *   folder.
 */
export function speedOfSpec(file: string, folder: string): Speed {
  const name = basename(file, ".spec.ts");
  if (basename(dirname(file)) !== folder || !isSpeed(name)) {
    throw new Error(`${file} is no speed's spec in ${folder}/.`);
  }
  return name;
}
