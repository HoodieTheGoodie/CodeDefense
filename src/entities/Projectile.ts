import Phaser from 'phaser';
import { PROJECTILE } from '../config/GameBalance';
import { Virus } from './Virus';

export class Projectile extends Phaser.GameObjects.Rectangle {
    public currentArea: number;
    public lane: number;
    private speed: number = PROJECTILE.speed; // pixels per second
    public damage: number = PROJECTILE.damage;
    public stunMs: number = PROJECTILE.stunMs;
    private trail: Phaser.GameObjects.Rectangle;
    private maxX: number;
    private target?: Virus;

    constructor(scene: Phaser.Scene, x: number, y: number, currentArea: number, lane: number, target?: Virus) {
        super(scene, x, y, 24, 8, 0x00ffff);
        this.currentArea = currentArea;
        this.lane = lane;
        this.target = target;
        this.maxX = currentArea === 1 ? 1024 + 960 : 512 + 324;
        scene.add.existing(this);

        this.trail = scene.add.rectangle(x - 20, y, 38, 3, 0x0099ff).setAlpha(0.45);
        this.on('destroy', () => this.trail.destroy());
    }

    public tick(delta: number) {
        const distance = (this.speed * delta) / 1000;
        if (this.target?.active) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            this.x += Math.cos(angle) * distance;
            this.y += Math.sin(angle) * distance;
            this.setRotation(angle);
            this.trail.setRotation(angle);
        } else {
            this.x += distance;
            this.setRotation(0);
            this.trail.setRotation(0);
        }

        this.trail.setPosition(this.x - 24, this.y);
        
        if (this.x > this.maxX + 60) {
            this.destroy();
        }
    }
}
