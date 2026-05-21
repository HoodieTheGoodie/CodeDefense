import Phaser from 'phaser';

export class Projectile extends Phaser.GameObjects.Rectangle {
    public currentArea: number;
    public lane: number;
    private speed: number = 300; // pixels per second
    public damage: number = 10;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, lane: number) {
        super(scene, x, y, 15, 6, 0x00ffff);
        this.currentArea = currentArea;
        this.lane = lane;
        scene.add.existing(this);
    }

    public tick(delta: number) {
        // Projectiles only move right
        this.x += (this.speed * delta) / 1000;
        
        // Destroy if offscreen (roughly out of bounds of current node)
        // A single node is 1024 width
        const relativeX = this.x % 1024;
        if (relativeX > 1000) {
            this.destroy();
        }
    }
}
