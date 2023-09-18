import 'phaser';
import { Types } from 'phaser';
import { LoadingScene } from './scene/loading/loading_scene';
import { BoardScene } from './scene/board/board_scene';

/** Entry point to the game that loads assets and initializes the game. */
export class Solitaire {
    private game: Phaser.Game;

    constructor(private readonly window: Window) {}

    /** Starts the game. */
    public start() {
        const gameConfig: Types.Core.GameConfig = {
            title: 'fSolitaire',
            type: Phaser.WEBGL,
            parent: 'game',
            backgroundColor: '#0EB755',
            scale: {
              mode: Phaser.Scale.ScaleModes.RESIZE,
            },
            physics: {
              default: 'arcade',
              arcade: {
                debug: false,
              },
            },
            canvasStyle: `display: block; width: 100%; height: 100%;`,
            autoFocus: true,
            scene: [LoadingScene, BoardScene,],
        };
        this.game = new Phaser.Game(gameConfig);
    }
}