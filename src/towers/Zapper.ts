import Phaser from 'phaser';
import { BaseTower } from './BaseTower';
import { TOWER } from '../config/GameBalance';
import { EVENT_IDS, TOWER_IDS } from '../config/GameIds';

export class Zapper extends BaseTower {
    private fireTimer: number = 0;
    private fireRate: number = TOWER.zapperFireRateMs;

    private getVisionBounds() {
        const laneHeight = this.currentArea === 1 ? 96 : 120; // Expanded vision vertically for core
        const areaRight = this.currentArea === 1 ? 2048 : 1024;
        const towerBounds = this.getBounds();
        const visionX = towerBounds.x - 6;
        const visionY = this.y - (laneHeight / 2);
        const visionWidth = Math.max(0, areaRight - visionX);
        return new Phaser.Geom.Rectangle(visionX, visionY, visionWidth, laneHeight);
    }

    private isVirusInVision(virus: Phaser.GameObjects.Rectangle) {
        if ((virus as any).currentArea !== this.currentArea) {
            return false;
        }

        return Phaser.Geom.Rectangle.Overlaps(this.getVisionBounds(), virus.getBounds());
    }

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0x0000ff, 150, currentArea, gridX, gridY, TOWER_IDS.zapper);
        
        // Let's add a decorative sprite element on top of it representing the "gun"
        const barrel = scene.add.rectangle(x + 10, y, 20, 10, 0x00ffff);
        this.on('destroy', () => barrel.destroy());
    }

    public tick(time: number, delta: number, viruses: any[]) {
        if (!this.isAlive || !this.isPowered) return;

        const scene = this.scene;
        if (!scene || !scene.events || !scene.tweens) {
            this.isAlive = false;
            return;
        }

        this.fireTimer += delta;
        if (this.fireTimer >= this.fireRate) {
            
            // Check if there is any virus overlapping the lane vision rectangle
            const hasTarget = viruses.some(v => this.isVirusInVision(v));
            if (!hasTarget) return;

            this.fireTimer = 0;
            
            // Visual recoil animation
            scene.tweens.add({
                targets: this,
                scaleX: 0.8,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            });

            scene.events.emit(EVENT_IDS.spawnProjectile, this.x + 20, this.y, this.currentArea, this.gridY);
        }
    }
}
