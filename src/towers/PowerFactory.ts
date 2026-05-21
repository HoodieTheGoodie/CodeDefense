import Phaser from 'phaser';
import { BaseTower } from './BaseTower';
import { TOWER } from '../config/GameBalance';

export class PowerFactory extends BaseTower {
    private genTimer: number = 0;
    private genRate: number = TOWER.powerGenRateMs;
    private chargeBack: Phaser.GameObjects.Rectangle;
    private chargeFill: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0xffff00, 100, currentArea, gridX, gridY);
        this.chargeBack = scene.add.rectangle(x, y + 28, 34, 4, 0x221f00).setOrigin(0.5);
        this.chargeFill = scene.add.rectangle(x - 17, y + 28, 0, 4, 0xffff66).setOrigin(0, 0.5);
        this.on('destroy', () => {
            this.chargeBack.destroy();
            this.chargeFill.destroy();
        });
    }

    public tick(time: number, delta: number, viruses: any[]) {
        if (!this.isAlive) return;

        this.genTimer += delta;
        this.chargeFill.width = 34 * Phaser.Math.Clamp(this.genTimer / this.genRate, 0, 1);

        if (this.genTimer >= this.genRate) {
            this.genTimer = 0;
            this.chargeFill.width = 0;
            
            this.scene.events.emit('energyGenerated', TOWER.powerGenAmount, this.x, this.y);

            // Shine animation
            this.setFillStyle(0xffffff);
            this.scene.time.delayedCall(200, () => {
                if (this.isAlive) this.setFillStyle(0xffff00);
            });
            this.scene.tweens.add({
                targets: this,
                scale: 1.2,
                duration: 150,
                yoyo: true
            });
        }
    }
}
