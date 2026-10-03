import type { Loader } from "phaser";

import { CARD_DECKS, CardDeckId } from "../card_deck";
import classicAtlas from "../assets/sprites/atlas/classic/card_assets_atlas.json";
import indexedAtlas from "../assets/sprites/atlas/indexed/card_assets_atlas.json";
import allCornerPipsAtlas from "../assets/sprites/atlas/all-corner-pips/card_assets_atlas.json";

/** Gives a Phaser loader what it needs to put a deck on the table. */
export interface CardDeckAtlas {
  /** The texture the deck's frames are registered under. */
  readonly textureKey: string;
  /** The multi-atlas manifest, with page filenames resolved to bundled URLs. */
  readonly manifest: ResolvedAtlasManifest;
}

/**
 * Describes the part of a multi-atlas manifest this module reads; Phaser
 * interprets the rest.
 */
interface AtlasManifest {
  readonly textures: readonly { readonly image: string }[];
}

/** Marks a manifest whose page filenames have been resolved to bundled URLs. */
type ResolvedAtlasManifest = AtlasManifest;

/** The bundled URL of every atlas page image, keyed by source path. */
const atlasPageUrls = import.meta.glob<string>(
  "@/engine/render/assets/sprites/atlas/*/card_assets-*.png",
  { eager: true, query: "?url", import: "default" },
);

/**
 * The manifests, which are small enough to bundle for every deck at once.
 *
 * A new deck also belongs in `CARD_DECKS` and in `DECKS` in
 * `tools/build-card-atlas.mjs`, which the compiler does not check.
 */
const manifests: Record<CardDeckId, AtlasManifest> = {
  classic: classicAtlas,
  indexed: indexedAtlas,
  "all-corner-pips": allCornerPipsAtlas,
};

/**
 * Every atlas page's URL, keyed by `<deck>/<file>` because every deck gives its
 * pages the same filenames.
 */
const atlasPagesByDeckFile: Record<string, string> = Object.fromEntries(
  Object.entries(atlasPageUrls).map(([path, url]) => [
    path.split("/").slice(-2).join("/"),
    url,
  ]),
);

/** Resolves an atlas manifest page filename to its bundled URL. */
function atlasPageUrl(deckId: CardDeckId, image: string): string {
  const url = atlasPagesByDeckFile[`${deckId}/${image}`];
  if (!url) {
    throw new Error(`Atlas page not found: ${deckId}/${image}`);
  }
  return url;
}

/**
 * Returns the texture a deck's frames are registered under, which differs per
 * deck so a new deck can load while the old one is still drawn.
 */
export function cardDeckTextureKey(deckId: CardDeckId): string {
  return `cards:${deckId}`;
}

/** Returns every deck whose texture is loaded, in the order decks are offered. */
export function residentCardDecks(textures: {
  exists(key: string): boolean;
}): CardDeckId[] {
  return CARD_DECKS.map((deck) => deck.id).filter((deckId) =>
    textures.exists(cardDeckTextureKey(deckId)),
  );
}

/** Returns everything the loader needs for one deck. */
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
 * Queues a deck's atlas on a loader and returns the texture key its frames will
 * be registered under.
 */
export function loadCardDeck(
  loader: Loader.LoaderPlugin,
  deckId: CardDeckId,
): string {
  const { textureKey, manifest } = cardDeckAtlas(deckId);
  // `multiatlas` also accepts a parsed manifest, which its type does not say.
  loader.multiatlas(textureKey, manifest as unknown as string, undefined);
  return textureKey;
}
