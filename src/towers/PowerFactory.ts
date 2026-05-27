import Phaser from 'phaser';
import { BaseTower } from './BaseTower';
import { EVENT_IDS, TOWER_IDS } from '../config/GameIds';

export class PowerFactory extends BaseTower {
    private genTimer: number = 0;
    private waitTimer: number = Phaser.Math.Between(5000, 9000);
    private genRate: number = 16000; // Faster than the prior pass, but still leaves room for power line strategy later

    private bolt: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 0x444400, 100, currentArea, gridX, gridY, TOWER_IDS.powerFactory);
        
        // Add animated lightning bolt inside
        this.bolt = scene.add.text(x, y, '⚡', { fontSize: '24px', color: '#ffff00' }).setOrigin(0.5);
        this.on('destroy', () => this.bolt.destroy());
        
        scene.tweens.add({
            targets: this.bolt,
            scale: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    public tick(time: number, delta: number, viruses: any[]) {
        if (!this.isAlive || !this.isPowered) return;

        const scene = this.scene;
        if (!scene || !scene.events || !scene.add || !scene.tweens || !scene.time) {
            this.isAlive = false;
            return;
        }

        // Only generate energy during active combat
        if (!(scene as any).waveActive) return;

        if (this.waitTimer > 0) {
            this.waitTimer -= delta;
            return;
        }

        this.genTimer += delta;
        if (this.genTimer >= this.genRate) {
            this.genTimer -= this.genRate;
            
            // Give 50 energy directly via event
            scene.events.emit(EVENT_IDS.addEnergy, 50);

            // Show +50 floating up
            const floatText = scene.add.text(this.x, this.y - 20, '+50', { fontSize: '18px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
            scene.tweens.add({
                targets: floatText,
                y: this.y - 60,
                alpha: 0,
                duration: 1000,
                onComplete: () => floatText.destroy()
            });

            // Shine animation
            this.setFillStyle(0xffa500);
            scene.time.delayedCall(200, () => {
                if (this.isAlive) this.setFillStyle(0xffff00);
            });
            scene.tweens.add({
                targets: this,
                scale: 1.2,
                duration: 150,
                yoyo: true
            });
        }
    }
}
