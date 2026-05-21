import Phaser from 'phaser';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LoadingScene } from './scenes/LoadingScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1024,
    height: 768,
    backgroundColor: '#0a0a0a',
    scene: [
        MainMenuScene,
        LoadingScene,
        GameScene
    ],
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
