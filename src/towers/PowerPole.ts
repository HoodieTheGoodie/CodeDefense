import Phaser from 'phaser';
import { BaseTower } from './BaseTower';
import { TOWER_IDS } from '../config/GameIds';

export class PowerPole extends BaseTower {
    public connectedTo: PowerPole[] = [];

    // The line graphics drawn to other towers
    private connectionLines: Phaser.GameObjects.Graphics;
    public rangeGraphic: Phaser.GameObjects.Arc;
    public visualCore: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0x888888, 30, currentArea, gridX, gridY, TOWER_IDS.powerPole);

        // Visual for the pole
        this.visualCore = scene.add.circle(x, y, 10, 0xaaaadd).setDepth(6);
        this.connectionLines = scene.add.graphics().setDepth(5);
        
        // Range indicator (250px radius)
        this.rangeGraphic = scene.add.circle(x, y, 250, 0x8888ff, 0.1).setOrigin(0.5).setVisible(false).setDepth(2);
        
        scene.add.existing(this);
        
        this.on('destroy', () => {
            this.visualCore.destroy();
            this.connectionLines.destroy();
            this.rangeGraphic.destroy();
        });
    }

    public drawConnections() {
        this.connectionLines.clear();
        
        // Yellow if powered, gray if not
        this.connectionLines.lineStyle(3, this.isPowered ? 0xffff00 : 0x444444, 0.7);

        for (const tower of this.connectedTo) {
            if (tower.isAlive) {
                this.connectionLines.beginPath();
                this.connectionLines.moveTo(this.x, this.y);
                this.connectionLines.lineTo(tower.x, tower.y);
                this.connectionLines.strokePath();
            }
        }
    }

    public tick(time: number, delta: number, viruses: any[]) {
        if (!this.isAlive) return;

        // Optionally occasionally re-draw or pulse energy lines here
        // The actual connection logic/power distribution will be handled by GameScene to avoid circular deps
    }
}
