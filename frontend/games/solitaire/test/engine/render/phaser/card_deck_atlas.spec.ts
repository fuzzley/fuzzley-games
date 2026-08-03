import { describe, it, expect } from "vitest";
import { CARD_DECKS } from "@/engine/render/card_deck";
import {
  cardDeckAtlas,
  cardDeckTextureKey,
} from "@/engine/render/phaser/card_deck_atlas";
import classicAtlas from "@/engine/render/assets/sprites/atlas/classic/card_assets_atlas.json";
import indexedAtlas from "@/engine/render/assets/sprites/atlas/indexed/card_assets_atlas.json";
import allCornerPipsAtlas from "@/engine/render/assets/sprites/atlas/all-corner-pips/card_assets_atlas.json";

/** A manifest as `yarn build:atlas` writes it, read for its frame names. */
interface BuiltAtlas {
  textures: { image: string; frames: { filename: string }[] }[];
}

/** The built manifests, in catalog order. */
const BUILT_ATLASES: Record<string, BuiltAtlas> = {
  classic: classicAtlas,
  indexed: indexedAtlas,
  "all-corner-pips": allCornerPipsAtlas,
};

/** Every frame name a built manifest declares, sorted. */
function frameNames(atlas: BuiltAtlas): string[] {
  return atlas.textures
    .flatMap((texture) => texture.frames.map((frame) => frame.filename))
    .sort();
}

describe("card deck atlases", () => {
  it("builds an atlas for every deck the drawer offers", () => {
    const built = CARD_DECKS.filter((deck) => BUILT_ATLASES[deck.id]);

    expect(built).toEqual(CARD_DECKS);
  });

  it("names the same frames in every deck", () => {
    // What a deck swap rests on: it repoints each sprite at the new texture and
    // leaves it on the frame it was showing. A deck that named its frames
    // differently would draw the whole board as blank rectangles.
    const names = CARD_DECKS.map((deck) => frameNames(BUILT_ATLASES[deck.id]));

    expect(names).toEqual(names.map(() => names[0]));
  });

  it("gives each deck a texture of its own", () => {
    const keys = CARD_DECKS.map((deck) => cardDeckTextureKey(deck.id));

    expect(new Set(keys).size).toBe(CARD_DECKS.length);
  });

  it("resolves each page filename to the URL it is served from", () => {
    // The manifests name pages by bare filename; the bundler hashes them. A
    // page left unresolved would 404 at the point the deck is needed.
    const images = cardDeckAtlas("classic").manifest.textures.map(
      (page) => page.image,
    );

    expect(images.filter((image) => !image.includes("/"))).toEqual([]);
  });

  it("resolves a page to its own deck's copy", () => {
    // Every deck names its first page `card_assets-0.png`, so a lookup that
    // matched on the filename alone would hand out another deck's artwork.
    const [classicPage] = cardDeckAtlas("classic").manifest.textures;
    const [indexedPage] = cardDeckAtlas("indexed").manifest.textures;

    expect(classicPage.image).not.toBe(indexedPage.image);
  });
});
