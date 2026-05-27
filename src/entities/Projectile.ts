import Phaser from 'phaser';
import { PROJECTILE } from '../config/GameBalance';

export class Projectile extends Phaser.GameObjects.Rectangle {
    public currentArea: number;
    public lane: number;
    private speed: number = PROJECTILE.speed; // pixels per second
    public damage: number = PROJECTILE.damage;
    public stunMs: number = PROJECTILE.stunMs;
    private trail: Phaser.GameObjects.Rectangle;
    private collisionBox: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, lane: number) {
        const laneHeight = currentArea === 1 ? 96 : 140; // Expand core area collision to match zapper vision
        super(scene, x, y, 160, 16, 0x00ffff);
        this.currentArea = currentArea;
        this.lane = lane;
        scene.add.existing(this);
        this.setDepth(8);
        this.setAlpha(0.9);

        // Visual trailing laser effect + glow
        this.trail = scene.add.rectangle(x - 80, y, 220, 6, 0x0099ff).setAlpha(0.6);
        this.trail.setDepth(7);
        
        // Large collision box that spans the actual lane height 
        this.collisionBox = scene.add.rectangle(x, y, 150, laneHeight, 0x00ffff).setAlpha(0.0);
        this.collisionBox.setDepth(0);
        this.on('destroy', () => this.trail.destroy());
        this.on('destroy', () => this.collisionBox.destroy());
        
        // Add a slight throbbing effect to the laser core
        scene.tweens.add({
            targets: this,
            alpha: { from: 0.9, to: 0.4 },
            duration: 150,
            yoyo: true,
            repeat: -1
        });
    }

    public getCollisionBounds() {
        return this.collisionBox.getBounds();
    }

    public tick(delta: number) {
        // Projectiles move right
        this.x += (this.speed * delta) / 1000;
        this.trail.setPosition(this.x - 80, this.y);
        this.collisionBox.setPosition(this.x, this.y);
        
        // Destroy if offscreen (roughly out of bounds of current node)
        // A single node is 1024 width
        const relativeX = this.x % 1024;
        if (relativeX > 1000) {
            this.destroy();
        }
    }
}
