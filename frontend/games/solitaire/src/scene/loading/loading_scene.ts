import {GameObjects, Scene} from "phaser";

export class LoadingScene extends Scene {
    constructor() {
        super('loading-scene');
    }

    preload() {
        this.load.baseURL = 'assets/';
        this.load.atlas({
            key: 'card_assets',
            textureURL: 'sprites/atlas/card_assets.png',
            atlasURL: 'sprites/atlas/card_assets_atlas.json'
        });
    }

    create() {
        this.scene.start('board-scene');
    }
}
