import { describe, it, expect } from "vitest";
import { CARD_DECKS } from "@/engine/render/card_deck";
import {
  CARD_ART_SCALES,
  CARD_RENDER_HEIGHT_PX,
  CARD_RENDER_WIDTH_PX,
  CardArtScale,
} from "@/engine/render/layout/card_metrics";
import {
  CardAtlas,
  cardAtlasSource,
  cardAtlasTextureKey,
  chooseCardAtlas,
  residentCardAtlases,
} from "@/engine/render/phaser/card_deck_atlas";
import classicAtlas1x from "@/engine/render/assets/sprites/atlas/classic/1x/card_assets_atlas.json";
import classicAtlas2x from "@/engine/render/assets/sprites/atlas/classic/2x/card_assets_atlas.json";
import indexedAtlas1x from "@/engine/render/assets/sprites/atlas/indexed/1x/card_assets_atlas.json";
import indexedAtlas2x from "@/engine/render/assets/sprites/atlas/indexed/2x/card_assets_atlas.json";
import allCornerPipsAtlas1x from "@/engine/render/assets/sprites/atlas/all-corner-pips/1x/card_assets_atlas.json";
import allCornerPipsAtlas2x from "@/engine/render/assets/sprites/atlas/all-corner-pips/2x/card_assets_atlas.json";
import mobileAtlas1x from "@/engine/render/assets/sprites/atlas/mobile/1x/card_assets_atlas.json";
import mobileAtlas2x from "@/engine/render/assets/sprites/atlas/mobile/2x/card_assets_atlas.json";

/** Describes a manifest `yarn build:atlas` writes, for its frames. */
interface BuiltAtlas {
  textures: {
    image: string;
    frames: { filename: string; frame: { w: number; h: number } }[];
  }[];
}

/** The built manifests, by deck and density. */
const BUILT_ATLASES: Record<
  string,
  Partial<Record<CardArtScale, BuiltAtlas>>
> = {
  classic: { 1: classicAtlas1x, 2: classicAtlas2x },
  indexed: { 1: indexedAtlas1x, 2: indexedAtlas2x },
  "all-corner-pips": { 1: allCornerPipsAtlas1x, 2: allCornerPipsAtlas2x },
  mobile: { 1: mobileAtlas1x, 2: mobileAtlas2x },
};

/** Every deck at every density, in catalog order and least dense first. */
const EVERY_ATLAS: CardAtlas[] = CARD_DECKS.flatMap((deck) =>
  CARD_ART_SCALES.map((artScale) => ({ deckId: deck.id, artScale })),
);

/** Returns the built manifest of an atlas. */
function built(atlas: CardAtlas): BuiltAtlas | undefined {
  return BUILT_ATLASES[atlas.deckId]?.[atlas.artScale];
}

/** Returns every frame name a built manifest declares, sorted. */
function frameNames(atlas: BuiltAtlas): string[] {
  return atlas.textures
    .flatMap((texture) => texture.frames.map((frame) => frame.filename))
    .sort();
}

/** Returns a texture cache stand-in holding the given atlases. */
function texturesHolding(...atlases: CardAtlas[]): {
  exists(key: string): boolean;
} {
  const keys = new Set(atlases.map(cardAtlasTextureKey));
  return { exists: (key) => keys.has(key) };
}

describe("card deck atlases", () => {
  it("builds an atlas at every density for every deck the drawer offers", () => {
    const missing = EVERY_ATLAS.filter((atlas) => !built(atlas));

    expect(missing).toEqual([]);
  });

  it("names the same frames in every deck and density", () => {
    // What an atlas swap rests on: it repoints each sprite at the new texture
    // and leaves it on the frame it was showing. An atlas that named its frames
    // differently would draw the whole board as blank rectangles.
    const names = EVERY_ATLAS.map((atlas) => frameNames(built(atlas)!));

    expect(names).toEqual(names.map(() => names[0]));
  });

  it("builds every frame at its density's size", () => {
    // The tool and the renderer share the density: the renderer divides the
    // layout scale by it, so a frame built at any other size would draw the
    // cards at the wrong size.
    const wrongSize = EVERY_ATLAS.flatMap((atlas) =>
      built(atlas)!
        .textures.flatMap((texture) => texture.frames)
        .filter(
          ({ frame }) =>
            frame.w !== CARD_RENDER_WIDTH_PX * atlas.artScale ||
            frame.h !== CARD_RENDER_HEIGHT_PX * atlas.artScale,
        )
        .map(
          ({ filename }) => `${atlas.deckId}@${atlas.artScale}x/${filename}`,
        ),
    );

    expect(wrongSize).toEqual([]);
  });

  it("gives each deck and density a texture of its own", () => {
    const keys = EVERY_ATLAS.map(cardAtlasTextureKey);

    expect(new Set(keys).size).toBe(EVERY_ATLAS.length);
  });

  it("resolves each page filename to the URL it is served from", () => {
    // The manifests name pages by bare filename; the bundler hashes them. A
    // page left unresolved would 404 at the point the deck is needed.
    const images = EVERY_ATLAS.flatMap((atlas) =>
      cardAtlasSource(atlas).manifest.textures.map((page) => page.image),
    );

    expect(images.filter((image) => !image.includes("/"))).toEqual([]);
  });

  it("resolves a page to its own deck's and density's copy", () => {
    // Every atlas names its first page `card_assets-0.png`, so a lookup that
    // matched on the filename alone would hand out another atlas's artwork.
    const firstPages = EVERY_ATLAS.map(
      (atlas) => cardAtlasSource(atlas).manifest.textures[0].image,
    );

    expect(new Set(firstPages).size).toBe(EVERY_ATLAS.length);
  });

  it("lists the atlases that are loaded, by deck and then density", () => {
    const textures = texturesHolding(
      { deckId: "all-corner-pips", artScale: 2 },
      { deckId: "classic", artScale: 2 },
      { deckId: "classic", artScale: 1 },
    );

    const resident = residentCardAtlases(textures);

    expect(resident).toEqual([
      { deckId: "classic", artScale: 1 },
      { deckId: "classic", artScale: 2 },
      { deckId: "all-corner-pips", artScale: 2 },
    ]);
  });

  describe("choosing an atlas", () => {
    it("keeps a loaded copy of the deck denser than it needs", () => {
      // Dropping to the cheaper copy would mean loading it, for no gain.
      const resident: CardAtlas[] = [{ deckId: "classic", artScale: 2 }];

      const chosen = chooseCardAtlas("classic", 1, resident);

      expect(chosen).toEqual({ deckId: "classic", artScale: 2 });
    });

    it("prefers the cheaper of two copies that are both dense enough", () => {
      const resident: CardAtlas[] = [
        { deckId: "classic", artScale: 1 },
        { deckId: "classic", artScale: 2 },
      ];

      const chosen = chooseCardAtlas("classic", 1, resident);

      expect(chosen).toEqual({ deckId: "classic", artScale: 1 });
    });

    it("asks for a denser copy than the one loaded when it needs one", () => {
      const resident: CardAtlas[] = [{ deckId: "classic", artScale: 1 }];

      const chosen = chooseCardAtlas("classic", 2, resident);

      expect(chosen).toEqual({ deckId: "classic", artScale: 2 });
    });

    it("ignores another deck however dense", () => {
      const resident: CardAtlas[] = [{ deckId: "indexed", artScale: 2 }];

      const chosen = chooseCardAtlas("classic", 1, resident);

      expect(chosen).toEqual({ deckId: "classic", artScale: 1 });
    });
  });
});
