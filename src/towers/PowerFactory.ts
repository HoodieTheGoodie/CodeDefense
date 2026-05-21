import Phaser from 'phaser';
import { BaseTower } from './BaseTower';

export class PowerFactory extends BaseTower {
    private genTimer: number = 0;
    private genRate: number = 14000; // Gives energy every 14 seconds

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0xffff00, 100, currentArea, gridX, gridY);
    }

    public tick(time: number, delta: number, viruses: any[]) {
        if (!this.isAlive) return;

        this.genTimer += delta;
        if (this.genTimer >= this.genRate) {
            this.genTimer -= Math.random() * 1000; // Slightly random next generate time
            
            // Give 25 energy directly via event
            this.scene.events.emit('virusKilled'); // Reusing this event for lazy energy grant initially

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
