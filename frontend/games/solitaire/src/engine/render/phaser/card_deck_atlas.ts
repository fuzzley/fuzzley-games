import type { Loader } from "phaser";

import { CardDeckId } from "../card_deck";
import classicAtlas from "../assets/sprites/atlas/classic/card_assets_atlas.json";
import indexedAtlas from "../assets/sprites/atlas/indexed/card_assets_atlas.json";
import allCornerPipsAtlas from "../assets/sprites/atlas/all-corner-pips/card_assets_atlas.json";

/**
 * What a Phaser loader needs to put a deck on the table.
 *
 * Split from {@link CardDeckSpec}, which is what a player picks from: one is a
 * name and a sentence, this is a texture key and a manifest, and only this half
 * may name the bundler or the canvas.
 */
export interface CardDeckAtlas {
  /** The texture the deck's frames are registered under. */
  readonly textureKey: string;
  /** The multi-atlas manifest, with page filenames resolved to bundled URLs. */
  readonly manifest: ResolvedAtlasManifest;
}

/**
 * A multi-atlas manifest.
 *
 * Only the page filename is named here, because it is the only field this
 * module reads: everything else — frame names, sizes, anchors — is carried
 * through untouched for Phaser to interpret.
 */
interface AtlasManifest {
  readonly textures: readonly { readonly image: string }[];
}

/** A manifest whose page filenames have been resolved to bundled URLs. */
type ResolvedAtlasManifest = AtlasManifest;

/**
 * The atlas page images, keyed by source path. Imported through Vite so the
 * pages keep their content hashes; the manifests checked in beside them refer
 * to pages by bare filename, which is resolved against these at load time.
 *
 * Globbed rather than imported one by one, so a deck's *pages* are found
 * without being named here. The deck itself still has to be declared in three
 * places that cannot see each other: `CARD_DECKS`, the {@link manifests} record
 * below, and `DECKS` in `tools/build-card-atlas.mjs`. Only the middle one is
 * checked, by `Record<CardDeckId, …>`.
 */
const atlasPageUrls = import.meta.glob<string>(
  "@/engine/render/assets/sprites/atlas/*/card_assets-*.png",
  { eager: true, query: "?url", import: "default" },
);

/** The manifests, which are small enough to bundle for every deck at once. */
const manifests: Record<CardDeckId, AtlasManifest> = {
  classic: classicAtlas,
  indexed: indexedAtlas,
  "all-corner-pips": allCornerPipsAtlas,
};

/**
 * Every atlas page, by the `<deck>/<file>` its manifest names it as.
 *
 * Keyed on the deck's directory as well as the filename, because every deck
 * names its pages `card_assets-0.png` and matching on the filename alone would
 * hand out whichever deck the glob happened to list first. Built once at module
 * scope: the alternative is a scan of every page of every deck each time one is
 * loaded.
 */
const atlasPagesByDeckFile: Record<string, string> = Object.fromEntries(
  Object.entries(atlasPageUrls).map(([path, url]) => [
    path.split("/").slice(-2).join("/"),
    url,
  ]),
);

/**
 * Resolves an atlas manifest page filename to its bundled URL.
 *
 * @param deckId The deck the page belongs to.
 * @param image The page filename recorded in the manifest.
 * @returns The URL the page is served from.
 */
function atlasPageUrl(deckId: CardDeckId, image: string): string {
  const url = atlasPagesByDeckFile[`${deckId}/${image}`];
  if (!url) {
    throw new Error(`Atlas page not found: ${deckId}/${image}`);
  }
  return url;
}

/**
 * The texture a deck's frames are registered under.
 *
 * One key per deck rather than a single shared one, so a deck the player has
 * already seen stays in the texture cache and switching back to it costs
 * nothing.
 */
export function cardDeckTextureKey(deckId: CardDeckId): string {
  return `cards:${deckId}`;
}

/**
 * Everything the loader needs for one deck.
 *
 * @param deckId The deck to load.
 */
export function cardDeckAtlas(deckId: CardDeckId): CardDeckAtlas {
  const manifest = manifests[deckId];
  return {
    textureKey: cardDeckTextureKey(deckId),
    manifest: {
      textures: manifest.textures.map((texture) => ({
        ...texture,
        image: atlasPageUrl(deckId, texture.image),
      })),
    },
  };
}

/**
 * Queues a deck's atlas on a loader.
 *
 * The one place that hands Phaser a parsed manifest where its types ask for a
 * URL. `multiatlas` documents the parameter as "the absolute or relative URL to
 * load the multi atlas json file from. Or, a well formed JSON object" — the
 * second half of which the type does not say, hence the cast. Passing the object
 * is what lets the page filenames be rewritten to their bundled URLs first.
 *
 * @param loader The scene loader to queue on.
 * @param deckId The deck to load.
 * @returns The texture key the deck's frames will be registered under.
 */
export function loadCardDeck(
  loader: Loader.LoaderPlugin,
  deckId: CardDeckId,
): string {
  const { textureKey, manifest } = cardDeckAtlas(deckId);
  loader.multiatlas(textureKey, manifest as unknown as string, undefined);
  return textureKey;
}
