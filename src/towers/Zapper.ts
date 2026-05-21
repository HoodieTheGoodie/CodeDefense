import Phaser from 'phaser';
import { BaseTower } from './BaseTower';
import { TOWER } from '../config/GameBalance';
import { Virus } from '../entities/Virus';

export class Zapper extends BaseTower {
    private fireTimer: number = 0;
    private fireRate: number = TOWER.zapperFireRateMs;
    private barrel: Phaser.GameObjects.Rectangle;
    private chargeBack: Phaser.GameObjects.Rectangle;
    private chargeFill: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0x0000ff, 150, currentArea, gridX, gridY);
        
        this.barrel = scene.add.rectangle(x + 10, y, 20, 10, 0x00ffff);
        this.chargeBack = scene.add.rectangle(x, y + 28, 34, 4, 0x001122).setOrigin(0.5);
        this.chargeFill = scene.add.rectangle(x - 17, y + 28, 34, 4, 0x00ffff).setOrigin(0, 0.5);
        this.on('destroy', () => {
            this.barrel.destroy();
            this.chargeBack.destroy();
            this.chargeFill.destroy();
        });
    }

    public tick(time: number, delta: number, viruses: Virus[]) {
        if (!this.isAlive) return;

        this.fireTimer += delta;
        this.chargeFill.width = 34 * Phaser.Math.Clamp(this.fireTimer / this.fireRate, 0, 1);

        if (this.fireTimer >= this.fireRate) {
            
            const target = viruses
                .filter(v => {
                    const sameArea = v.currentArea === this.currentArea;
                    const sameLane = this.currentArea !== 1 || v.lane === this.gridY;
                    const notPastTower = v.x > this.x - 60;
                    return sameArea && sameLane && notPastTower;
                })
                .sort((a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) - Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y))[0];

            this.barrel.setFillStyle(target ? 0x99ffff : 0x00ffff);
            if (!target) return;

            this.fireTimer = 0;
            this.chargeFill.width = 0;
            
            // Visual recoil animation
            this.scene.tweens.add({
                targets: [this, this.barrel],
                scaleX: 0.8,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            });

            this.scene.events.emit('spawnProjectile', this.x + 20, this.y, this.currentArea, this.gridY, target);
        }
    }
}
