import Phaser from 'phaser';

export class Virus extends Phaser.GameObjects.Rectangle {
    public hp: number = 100;
    public maxHp: number = 100;
    public speed: number = 15; // pixels per second
    public currentArea: number = 1; // 1 = Node 1, 0 = Core
    public lane: number = 0; // 0 to 5 for Node 1

    private isGlitching: boolean = false;
    private glitchTimer: number = 0;
    public baseX: number = 0;
    public baseY: number = 0;
    
    // Attack system
    private attackTimer: number = 0;
    private attackDamage: number = 15;

    constructor(scene: Phaser.Scene, x: number, y: number, lane: number) {
        super(scene, x, y, 60, 60, 0xff0000);
        scene.add.existing(this);
        
        this.lane = lane;
        this.baseX = x;
        this.baseY = y;
    }

    public takeDamage(amount: number) {
        if (this.hp <= 0) return;
        this.hp -= amount;

        // Visual flash feedback
        this.setFillStyle(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.setFillStyle(0xff0000);
        });

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

    private die() {
        this.scene.events.emit('virusKilled', this);
        this.destroy(); // Remove object
    }

    // Pass in the tower it's currently touching, or null if none
    public tick(delta: number, currentTargetTower: any | null) {
        if (!this.active) return;

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
            if (this.currentArea === 1) {
                // Moving left in Node 1
                this.baseX -= (this.speed * delta) / 1000;
            } else if (this.currentArea === 0) {
                // Moving towards Core in Area 0
                const coreX = 512;
                const coreY = (this.scene.scale.height / 2) + 40;
                const angle = Phaser.Math.Angle.Between(this.baseX, this.baseY, coreX, coreY);
                this.baseX += Math.cos(angle) * (this.speed * delta) / 1000;
                this.baseY += Math.sin(angle) * (this.speed * delta) / 1000;
            }

            if (this.isGlitching) {
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
    }
}
