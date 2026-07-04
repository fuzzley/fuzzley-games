import { Scene } from "phaser";
import cardAssetsTexture from "@/game/assets/sprites/atlas/card_assets.png";
import cardAssetsAtlas from "@/game/assets/sprites/atlas/card_assets_atlas.json";

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
    this.load.atlas("card_assets", cardAssetsTexture, cardAssetsAtlas);
  }

  /** Automatically transitions to the main board scene once loading completes. */
  create() {
    this.scene.start("board-scene");
  }
}
