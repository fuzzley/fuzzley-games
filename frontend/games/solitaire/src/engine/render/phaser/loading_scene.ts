import { Scene } from "phaser";
import cardAssetsAtlas from "@/engine/render/assets/sprites/atlas/card_assets_atlas.json";

/**
 * The atlas page images, keyed by source path. Imported through Vite so the
 * pages keep their content hashes; the manifest checked in beside them refers
 * to pages by bare filename, which is resolved against these at load time.
 */
const atlasPageUrls = import.meta.glob<string>(
  "@/engine/render/assets/sprites/atlas/card_assets-*.png",
  { eager: true, query: "?url", import: "default" },
);

/**
 * Resolves an atlas manifest page filename to its bundled URL.
 *
 * @param image The page filename recorded in the manifest.
 * @returns The URL the page is served from.
 */
function atlasPageUrl(image: string): string {
  const match = Object.entries(atlasPageUrls).find(([path]) =>
    path.endsWith(`/${image}`),
  );
  if (!match) {
    throw new Error(`Atlas page not found: ${image}`);
  }
  return match[1];
}

/**
 * Scene responsible for preloading all necessary game assets and transitioning to the board scene.
 */
export class LoadingScene extends Scene {
  /** Constructs the loading scene. */
  constructor() {
    super("loading-scene");
  }

  /** Preloads the game asset textures and atlas configuration JSON. */
  preload() {
    const manifest = {
      textures: cardAssetsAtlas.textures.map((texture) => ({
        ...texture,
        image: atlasPageUrl(texture.image),
      })),
    };

    // Phaser accepts an already-parsed manifest object here and only fetches
    // the page images from it, but types the parameter as a URL string.
    this.load.multiatlas(
      "card_assets",
      manifest as unknown as string,
      undefined,
    );
  }

  /** Automatically transitions to the main board scene once loading completes. */
  create() {
    this.scene.start("board-scene");
  }
}
