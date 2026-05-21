import Phaser from 'phaser';
import { PROJECTILE } from '../config/GameBalance';

export class Projectile extends Phaser.GameObjects.Rectangle {
    public currentArea: number;
    public lane: number;
    private speed: number = PROJECTILE.speed; // pixels per second
    public damage: number = PROJECTILE.damage;
    public stunMs: number = PROJECTILE.stunMs;
    private trail: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, lane: number) {
        super(scene, x, y, 24, 8, 0x00ffff);
        this.currentArea = currentArea;
        this.lane = lane;
        scene.add.existing(this);

        this.trail = scene.add.rectangle(x - 20, y, 38, 3, 0x0099ff).setAlpha(0.45);
        this.on('destroy', () => this.trail.destroy());
    }

    public tick(delta: number) {
        // Projectiles only move right
        this.x += (this.speed * delta) / 1000;
        this.trail.setPosition(this.x - 24, this.y);
        
        // Destroy if offscreen (roughly out of bounds of current node)
        // A single node is 1024 width
        const relativeX = this.x % 1024;
        if (relativeX > 1000) {
            this.destroy();
        }
    }
}
