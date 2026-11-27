import { keysOf } from "@fz/core/records";
import type { HelpEntry } from "@fz/game-ui/help_catalog";
import type { Pictures } from "../../scene/pictures";

/** Describes a thing as one of How to play's catalogs lists it. */
export interface CatalogHelp {
  readonly name: string;
  /** What it does, a verb first, with a second sentence only for a number or a catch. */
  readonly about: string;
  /** Returns its picture among the scene's, or null for a thing they show none of. */
  readonly pictureIn: (pictures: Pictures) => string | null;
}

/** Returns a catalog's entries, in its record's order, each with its picture once the scene has drawn them. */
export function catalogEntries<Id extends string>(
  catalog: Readonly<Record<Id, CatalogHelp>>,
  pictures: Pictures | null,
): readonly HelpEntry[] {
  return keysOf(catalog).map((id) => {
    const { name, about, pictureIn } = catalog[id];
    return { id, name, about, picture: pictures && pictureIn(pictures) };
  });
}
