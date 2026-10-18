import type { Loader } from "phaser";

import { CARD_DECKS, CardDeckId } from "../../deck/card_deck";
import { CARD_ART_SCALES, CardArtScale } from "../../deck/card_art_scale";
import classicAtlas0_5x from "../../assets/sprites/atlas/classic/0.5x/card_assets_atlas.json";
import classicAtlas0_75x from "../../assets/sprites/atlas/classic/0.75x/card_assets_atlas.json";
import classicAtlas1x from "../../assets/sprites/atlas/classic/1x/card_assets_atlas.json";
import classicAtlas1_5x from "../../assets/sprites/atlas/classic/1.5x/card_assets_atlas.json";
import classicAtlas2x from "../../assets/sprites/atlas/classic/2x/card_assets_atlas.json";
import indexedAtlas0_5x from "../../assets/sprites/atlas/indexed/0.5x/card_assets_atlas.json";
import indexedAtlas0_75x from "../../assets/sprites/atlas/indexed/0.75x/card_assets_atlas.json";
import indexedAtlas1x from "../../assets/sprites/atlas/indexed/1x/card_assets_atlas.json";
import indexedAtlas1_5x from "../../assets/sprites/atlas/indexed/1.5x/card_assets_atlas.json";
import indexedAtlas2x from "../../assets/sprites/atlas/indexed/2x/card_assets_atlas.json";
import allCornerPipsAtlas0_5x from "../../assets/sprites/atlas/all-corner-pips/0.5x/card_assets_atlas.json";
import allCornerPipsAtlas0_75x from "../../assets/sprites/atlas/all-corner-pips/0.75x/card_assets_atlas.json";
import allCornerPipsAtlas1x from "../../assets/sprites/atlas/all-corner-pips/1x/card_assets_atlas.json";
import allCornerPipsAtlas1_5x from "../../assets/sprites/atlas/all-corner-pips/1.5x/card_assets_atlas.json";
import allCornerPipsAtlas2x from "../../assets/sprites/atlas/all-corner-pips/2x/card_assets_atlas.json";
import mobileAtlas0_5x from "../../assets/sprites/atlas/mobile/0.5x/card_assets_atlas.json";
import mobileAtlas0_75x from "../../assets/sprites/atlas/mobile/0.75x/card_assets_atlas.json";
import mobileAtlas1x from "../../assets/sprites/atlas/mobile/1x/card_assets_atlas.json";
import mobileAtlas1_5x from "../../assets/sprites/atlas/mobile/1.5x/card_assets_atlas.json";
import mobileAtlas2x from "../../assets/sprites/atlas/mobile/2x/card_assets_atlas.json";

/** Names one built atlas: a deck's artwork at one density. */
export interface CardAtlas {
  readonly deckId: CardDeckId;
  /** Texels per design unit. */
  readonly artScale: CardArtScale;
}

/** Gives a Phaser loader what it needs to put an atlas on the table. */
export interface CardAtlasSource {
  /** The texture the atlas's frames are registered under. */
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
  "@/engine/render/assets/sprites/atlas/*/*/card_assets-*.png",
  { eager: true, query: "?url", import: "default" },
);

/**
 * The manifests, which are small enough to bundle for every deck and density
 * at once.
 *
 * A new deck also belongs in `CARD_DECKS` and in `DECKS` in
 * `tools/build-card-atlas.mjs`, which the compiler does not check.
 */
const manifests: Record<CardDeckId, Record<CardArtScale, AtlasManifest>> = {
  classic: {
    0.5: classicAtlas0_5x,
    0.75: classicAtlas0_75x,
    1: classicAtlas1x,
    1.5: classicAtlas1_5x,
    2: classicAtlas2x,
  },
  indexed: {
    0.5: indexedAtlas0_5x,
    0.75: indexedAtlas0_75x,
    1: indexedAtlas1x,
    1.5: indexedAtlas1_5x,
    2: indexedAtlas2x,
  },
  "all-corner-pips": {
    0.5: allCornerPipsAtlas0_5x,
    0.75: allCornerPipsAtlas0_75x,
    1: allCornerPipsAtlas1x,
    1.5: allCornerPipsAtlas1_5x,
    2: allCornerPipsAtlas2x,
  },
  mobile: {
    0.5: mobileAtlas0_5x,
    0.75: mobileAtlas0_75x,
    1: mobileAtlas1x,
    1.5: mobileAtlas1_5x,
    2: mobileAtlas2x,
  },
};

/**
 * Every atlas page's URL, keyed by `<deck>/<density>/<file>` because every
 * deck and density gives its pages the same filenames.
 */
const atlasPagesByDeckFile: Record<string, string> = Object.fromEntries(
  Object.entries(atlasPageUrls).map(([path, url]) => [
    path.split("/").slice(-3).join("/"),
    url,
  ]),
);

/** Resolves an atlas manifest page filename to its bundled URL. */
function atlasPageUrl(atlas: CardAtlas, image: string): string {
  const page = `${atlas.deckId}/${atlas.artScale}x/${image}`;
  const url = atlasPagesByDeckFile[page];
  if (!url) {
    throw new Error(`Atlas page not found: ${page}`);
  }
  return url;
}

/** Returns whether two atlases are the same deck at the same density. */
export function sameCardAtlas(
  a: CardAtlas | null,
  b: CardAtlas | null,
): boolean {
  return a?.deckId === b?.deckId && a?.artScale === b?.artScale;
}

/**
 * Returns the texture an atlas's frames are registered under, which differs
 * per deck and density so a new atlas can load while the old one is still
 * drawn.
 */
export function cardAtlasTextureKey(atlas: CardAtlas): string {
  return `cards:${atlas.deckId}@${atlas.artScale}x`;
}

/**
 * Returns every atlas whose texture is loaded, in the order decks are offered
 * and from least to most dense.
 */
export function residentCardAtlases(textures: {
  exists(key: string): boolean;
}): CardAtlas[] {
  return CARD_DECKS.flatMap((deck) =>
    CARD_ART_SCALES.map((artScale) => ({ deckId: deck.id, artScale })),
  ).filter((atlas) => textures.exists(cardAtlasTextureKey(atlas)));
}

/**
 * Returns the atlas to draw a deck from: a loaded one at least as dense as
 * `wanted`, so a board that needs less detail keeps what it has, or else the
 * deck at `wanted`.
 */
export function chooseCardAtlas(
  deckId: CardDeckId,
  wanted: CardArtScale,
  resident: readonly CardAtlas[],
): CardAtlas {
  return (
    resident.find(
      (atlas) => atlas.deckId === deckId && atlas.artScale >= wanted,
    ) ?? { deckId, artScale: wanted }
  );
}

/**
 * Returns the atlas a board draws from at first: the wanted deck if it is
 * resident dense enough, or else any resident atlas, preferring the wanted
 * deck, or null when none is resident.
 */
export function bootCardAtlas(
  wanted: CardAtlas,
  resident: readonly CardAtlas[],
): CardAtlas | null {
  const chosen = chooseCardAtlas(wanted.deckId, wanted.artScale, resident);
  return (
    resident.find((atlas) => sameCardAtlas(atlas, chosen)) ??
    resident.find((atlas) => atlas.deckId === wanted.deckId) ??
    resident[0] ??
    null
  );
}

/** Returns everything the loader needs for one atlas. */
export function cardAtlasSource(atlas: CardAtlas): CardAtlasSource {
  const manifest = manifests[atlas.deckId][atlas.artScale];
  return {
    textureKey: cardAtlasTextureKey(atlas),
    manifest: {
      textures: manifest.textures.map((texture) => ({
        ...texture,
        image: atlasPageUrl(atlas, texture.image),
      })),
    },
  };
}

/**
 * Queues an atlas on a loader and returns the texture key its frames will be
 * registered under.
 */
export function loadCardAtlas(
  loader: Loader.LoaderPlugin,
  atlas: CardAtlas,
): string {
  const { textureKey, manifest } = cardAtlasSource(atlas);
  // `multiatlas` also accepts a parsed manifest, which its type does not say.
  loader.multiatlas(textureKey, manifest as unknown as string, undefined);
  return textureKey;
}
