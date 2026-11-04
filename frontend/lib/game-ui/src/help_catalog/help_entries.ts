/** Describes one thing a game's field can hold, as How to play lists it. */
export interface HelpEntry {
  readonly id: string;
  readonly name: string;
  /** What it does, in a sentence. */
  readonly about: string;
  /** Its picture, as a URL, or null before the game has drawn it. */
  readonly picture: string | null;
}

/**
 * Returns a catalog's entries for How to play, each with its name and what
 * it does, and its picture once the game has drawn it.
 */
export function helpEntries<Id extends string>(
  ids: readonly Id[],
  describe: (id: Id) => { readonly name: string; readonly about: string },
  pictures: Readonly<Record<Id, string>> | undefined,
): readonly HelpEntry[] {
  return ids.map((id) => {
    const { name, about } = describe(id);
    return { id, name, about, picture: pictures?.[id] ?? null };
  });
}
