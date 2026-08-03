import { CardDeckId } from "../card_deck";
import classicAtlas from "../assets/sprites/atlas/classic/card_assets_atlas.json";
import indexedAtlas from "../assets/sprites/atlas/indexed/card_assets_atlas.json";

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
 * Globbed across every deck's directory, so adding a deck is a matter of
 * building it and naming it — the glob finds its pages without being told.
 */
const atlasPageUrls = import.meta.glob<string>(
  "@/engine/render/assets/sprites/atlas/*/card_assets-*.png",
  { eager: true, query: "?url", import: "default" },
);

/** The manifests, which are small enough to bundle for every deck at once. */
const manifests: Record<CardDeckId, AtlasManifest> = {
  classic: classicAtlas,
  indexed: indexedAtlas,
};

/**
 * Resolves an atlas manifest page filename to its bundled URL.
 *
 * Matched on the deck's directory as well as the filename, because every deck
 * names its pages `card_assets-0.png` and matching on the filename alone would
 * hand out whichever deck the glob happened to list first.
 *
 * @param deckId The deck the page belongs to.
 * @param image The page filename recorded in the manifest.
 * @returns The URL the page is served from.
 */
function atlasPageUrl(deckId: CardDeckId, image: string): string {
  const match = Object.entries(atlasPageUrls).find(([path]) =>
    path.endsWith(`/${deckId}/${image}`),
  );
  if (!match) {
    throw new Error(`Atlas page not found: ${deckId}/${image}`);
  }
  return match[1];
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
