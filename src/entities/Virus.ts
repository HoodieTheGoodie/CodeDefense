import Phaser from 'phaser';
import { VIRUS } from '../config/GameBalance';

export class Virus extends Phaser.GameObjects.Rectangle {
    public hp: number = VIRUS.maxHp;
    public maxHp: number = VIRUS.maxHp;
    public speed: number = VIRUS.speed; // pixels per second
    public currentArea: number = 1; // 1 = Node 1, 0 = Core
    public lane: number = 0; // 0 to 5 for Node 1

    private isGlitching: boolean = false;
    private glitchTimer: number = 0;
    private disorientTimer: number = 0;
    public baseX: number = 0;
    public baseY: number = 0;
    public uploadProgress: number = 0;
    
    // Attack system
    private attackTimer: number = 0;
    private attackDamage: number = 15;
    private healthBack: Phaser.GameObjects.Rectangle;
    private healthFill: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, lane: number) {
        super(scene, x, y, 60, 60, 0xff0000);
        scene.add.existing(this);
        
        this.lane = lane;
        this.baseX = x;
        this.baseY = y;

        this.healthBack = scene.add.rectangle(x, y - 40, 50, 5, 0x220000).setOrigin(0.5);
        this.healthFill = scene.add.rectangle(x - 25, y - 40, 50, 5, 0x00ff66).setOrigin(0, 0.5);
        this.on('destroy', () => {
            this.healthBack.destroy();
            this.healthFill.destroy();
        });
    }

    public takeDamage(amount: number) {
        if (this.hp <= 0) return;
        this.hp -= amount;
        this.disorientTimer = VIRUS.disorientMs;

        // Visual flash feedback
        this.setFillStyle(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.setFillStyle(0xff0000);
        });
        this.scene.tweens.add({
            targets: this,
            angle: { from: -8, to: 8 },
            duration: 60,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                if (this.active) this.setAngle(0);
            }
        });
        this.updateHealthBar();

        if (this.hp <= 0) {
            this.die();
        } else if (this.hp <= this.maxHp * 0.3) {
            // Low health -> very faded, stop violent glitching
            this.setAlpha(0.3);
            this.isGlitching = false;
            this.x = this.baseX;
            this.y = this.baseY;
        } else if (this.hp <= this.maxHp * 0.7) {
            // Med health -> starts glitching visually
            this.isGlitching = true;
            this.setAlpha(0.7);
        }
    }

    public isUploading() {
        return this.uploadProgress > 0;
    }

    private die() {
        this.scene.events.emit('virusKilled', this);
        this.destroy(); // Remove object
    }

    private updateHealthBar() {
        const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
        this.healthFill.width = 50 * pct;
        if (pct < 0.35) {
            this.healthFill.setFillStyle(0xff3333);
        } else if (pct < 0.7) {
            this.healthFill.setFillStyle(0xffcc00);
        } else {
            this.healthFill.setFillStyle(0x00ff66);
        }
    }

    private syncAttachedVisuals() {
        this.healthBack.setPosition(this.x, this.y - 40);
        this.healthFill.setPosition(this.x - 25, this.y - 40);
    }

    // Pass in the tower it's currently touching, or null if none
    public tick(delta: number, currentTargetTower: any | null, uploading: boolean = false) {
        if (!this.active) return;

        if (uploading) {
            this.uploadProgress += delta / VIRUS.uploadTimeMs;
            this.uploadProgress = Phaser.Math.Clamp(this.uploadProgress, 0, 1);
            this.x = this.baseX + Phaser.Math.Between(-2, 2);
            this.y = this.baseY + Phaser.Math.Between(-2, 2);
            this.syncAttachedVisuals();
            return;
        }

        this.uploadProgress = 0;

        if (currentTargetTower && currentTargetTower.isAlive) {
            // Stop and attack the tower
            this.attackTimer += delta;
            if (this.attackTimer >= 1000) { // 1 hit per second
                this.attackTimer -= 1000;
                currentTargetTower.takeDamage(this.attackDamage);
                
                // Attack animation
                this.scene.tweens.add({ targets: this, x: this.baseX - 10, yoyo: true, duration: 100 });
            }
        } else {
            // No tower, move forward
            const slowMultiplier = this.disorientTimer > 0 ? VIRUS.disorientSlowMultiplier : 1;
            if (this.currentArea === 1) {
                // Moving left in Node 1
                this.baseX -= (this.speed * slowMultiplier * delta) / 1000;
            } else if (this.currentArea === 0) {
                // Moving towards Core in Area 0
                const coreX = 512;
                const coreY = (this.scene.scale.height / 2) + 40;
                const angle = Phaser.Math.Angle.Between(this.baseX, this.baseY, coreX, coreY);
                this.baseX += Math.cos(angle) * (this.speed * slowMultiplier * delta) / 1000;
                this.baseY += Math.sin(angle) * (this.speed * slowMultiplier * delta) / 1000;
            }

            if (this.disorientTimer > 0) {
                this.disorientTimer -= delta;
                this.x = this.baseX + Phaser.Math.Between(-10, 10);
                this.y = this.baseY + Phaser.Math.Between(-10, 10);
            } else if (this.isGlitching) {
                this.glitchTimer += delta;
                if (this.glitchTimer > 50) {
                    this.x = this.baseX + Phaser.Math.Between(-5, 5);
                    this.y = this.baseY + Phaser.Math.Between(-5, 5);
                    this.glitchTimer = 0;
                }
            } else {
                this.x = this.baseX;
                this.y = this.baseY;
            }
        }

        this.syncAttachedVisuals();
    }
}
