import {Scene} from "phaser";
import cardAssetsTexture from "../../assets/sprites/atlas/card_assets.png";
import cardAssetsAtlas from "../../assets/sprites/atlas/card_assets_atlas.json";

export class LoadingScene extends Scene {
    constructor() {
        super('loading-scene');
    }

    preload() {
        this.load.atlas('card_assets', cardAssetsTexture, cardAssetsAtlas);
    }

    create() {
        this.scene.start('board-scene');
    }
}
