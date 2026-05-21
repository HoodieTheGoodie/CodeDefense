import Phaser from 'phaser';
import { BaseTower } from './BaseTower';
import { TOWER } from '../config/GameBalance';

export class Zapper extends BaseTower {
    private fireTimer: number = 0;
    private fireRate: number = TOWER.zapperFireRateMs;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0x0000ff, 150, currentArea, gridX, gridY);
        
        // Let's add a decorative sprite element on top of it representing the "gun"
        const barrel = scene.add.rectangle(x + 10, y, 20, 10, 0x00ffff);
        this.on('destroy', () => barrel.destroy());
    }

    public tick(time: number, delta: number, viruses: any[]) {
        if (!this.isAlive) return;

        this.fireTimer += delta;
        if (this.fireTimer >= this.fireRate) {
            
            // Check if there is any target in our lane & area that's in front of us
            const hasTarget = viruses.some(v => v.currentArea === this.currentArea && v.lane === this.gridY && v.x > this.x);
            if (!hasTarget) return;

            this.fireTimer = 0;
            
            // Visual recoil animation
            this.scene.tweens.add({
                targets: this,
                scaleX: 0.8,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            });

            this.scene.events.emit('spawnProjectile', this.x + 20, this.y, this.currentArea, this.gridY);
        }
    }
}
